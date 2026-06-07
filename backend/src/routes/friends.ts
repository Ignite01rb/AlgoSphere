import { Router } from 'express';
import { prisma } from '../utils/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { normalizeUsername } from '../utils/validation';

export const friendsRouter = Router();

function parseBigInt(value: string, name: string): bigint {
  try {
    const parsed = BigInt(value);
    if (parsed <= 0n) {
      throw new Error();
    }
    return parsed;
  } catch (error) {
    throw { status: 400, message: `${name} must be a positive integer.` };
  }
}

async function acceptedFriendIDSet(userId: bigint): Promise<Set<bigint>> {
  const friendships = await prisma.friendship.findMany({
    where: { userId, status: 'accepted' },
    select: { friendId: true },
  });
  return new Set(friendships.map(f => f.friendId));
}

async function pendingOutgoingSet(userId: bigint): Promise<Set<bigint>> {
  const friendships = await prisma.friendship.findMany({
    where: { userId, status: 'pending' },
    select: { friendId: true },
  });
  return new Set(friendships.map(f => f.friendId));
}

async function pendingIncomingSet(userId: bigint): Promise<Set<bigint>> {
  const friendships = await prisma.friendship.findMany({
    where: { friendId: userId, status: 'pending' },
    select: { userId: true },
  });
  return new Set(friendships.map(f => f.userId));
}

function serializeFriendUser(
  user: any,
  friendIds: Set<bigint>,
  pendingOutgoing: Set<bigint>,
  pendingIncoming: Set<bigint>
) {
  const isFriend = friendIds.has(user.id);
  let status = 'none';
  if (isFriend) {
    status = 'accepted';
  } else if (pendingOutgoing.has(user.id)) {
    status = 'pending_outgoing';
  } else if (pendingIncoming.has(user.id)) {
    status = 'pending_incoming';
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isFriend,
    friendshipStatus: status,
  };
}

// GET /api/friends/lookup
friendsRouter.get('/api/friends/lookup', requireAuth, async (req: AuthenticatedRequest, res) => {
  const usernameParam = req.query.username;
  if (typeof usernameParam !== 'string') {
    return res.status(422).json({
      detail: [{ loc: ['query', 'username'], msg: 'Username is required.' }],
    });
  }

  let username = '';
  try {
    username = normalizeUsername(usernameParam, 'Username', true);
  } catch (error: any) {
    return res.status(422).json({
      detail: [{ loc: ['query', 'username'], msg: error.message + '.' }],
    });
  }

  if (username === req.user.username) {
    return res.status(400).json({ detail: 'You cannot add yourself as a friend.' });
  }

  try {
    const friendIds = await acceptedFriendIDSet(req.user.id);
    const pendingOutgoing = await pendingOutgoingSet(req.user.id);
    const pendingIncoming = await pendingIncomingSet(req.user.id);

    const user = await prisma.user.findFirst({
      where: {
        id: { not: req.user.id },
        username: { equals: username },
      },
    });

    if (!user) {
      return res.json({ user: null });
    }

    const responseUser = serializeFriendUser(user, friendIds, pendingOutgoing, pendingIncoming);
    res.json({ user: responseUser });
  } catch (error) {
    res.status(500).json({ detail: 'Failed to look up the requested user.' });
  }
});

// GET /api/friends/search
friendsRouter.get('/api/friends/search', requireAuth, async (req: AuthenticatedRequest, res) => {
  const query = req.query.q;
  if (typeof query !== 'string') {
    return res.status(422).json({
      detail: [{ loc: ['query', 'q'], msg: 'Search query is required.' }],
    });
  }

  const cleanQ = query.trim().replace(/^@/, '');
  if (cleanQ.length < 2) {
    return res.status(422).json({
      detail: [{ loc: ['query', 'q'], msg: 'String should have at least 2 characters.' }],
    });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { username: { contains: cleanQ } },
          { displayName: { contains: cleanQ } },
        ],
      },
      orderBy: { displayName: 'asc' },
      take: 10,
    });

    const friendIds = await acceptedFriendIDSet(req.user.id);
    const pendingOutgoing = await pendingOutgoingSet(req.user.id);
    const pendingIncoming = await pendingIncomingSet(req.user.id);

    const response = users.map(u => serializeFriendUser(u, friendIds, pendingOutgoing, pendingIncoming));
    res.json(response);
  } catch (error) {
    res.status(500).json({ detail: 'Failed to search users.' });
  }
});

// GET /api/friends/list
friendsRouter.get('/api/friends/list', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const friendIds = await acceptedFriendIDSet(req.user.id);
    if (friendIds.size === 0) {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: Array.from(friendIds) },
      },
      orderBy: { displayName: 'asc' },
    });

    const response = users.map(u => serializeFriendUser(u, friendIds, new Set(), new Set()));
    res.json(response);
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load friends.' });
  }
});

// POST /api/friends/:friendID
friendsRouter.post('/api/friends/:friendID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const friendId = parseBigInt(req.params.friendID, 'friendID');
    if (friendId === req.user.id) {
      return res.status(400).json({ detail: 'You cannot add yourself as a friend.' });
    }

    const friend = await prisma.user.findUnique({ where: { id: friendId } });
    if (!friend) {
      return res.status(404).json({ detail: 'User not found.' });
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: { userId: req.user.id, friendId },
    });

    if (existing) {
      const status = existing.status === 'accepted' ? 'accepted' : 'pending_outgoing';
      return res.json({
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        isFriend: existing.status === 'accepted',
        friendshipStatus: status,
      });
    }

    // Check if reverse request exists (friend requested user)
    const reverse = await prisma.friendship.findFirst({
      where: { userId: friendId, friendId: req.user.id },
    });

    if (reverse && reverse.status === 'pending') {
      await prisma.$transaction([
        prisma.friendship.update({
          where: { id: reverse.id },
          data: { status: 'accepted' },
        }),
        prisma.friendship.create({
          data: {
            userId: req.user.id,
            friendId,
            status: 'accepted',
          },
        }),
      ]);

      return res.json({
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        isFriend: true,
        friendshipStatus: 'accepted',
      });
    }

    // Create new pending request
    await prisma.friendship.create({
      data: {
        userId: req.user.id,
        friendId,
        status: 'pending',
      },
    });

    res.json({
      id: friend.id,
      username: friend.username,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      isFriend: false,
      friendshipStatus: 'pending_outgoing',
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to add friend.' });
  }
});

// DELETE /api/friends/:friendID
friendsRouter.delete('/api/friends/:friendID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const friendId = parseBigInt(req.params.friendID, 'friendID');
    const userId = req.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId },
          ],
        },
      });

      // Remove from owned groups
      const ownedGroups = await tx.group.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const ownedGroupIds = ownedGroups.map(g => g.id);
      if (ownedGroupIds.length > 0) {
        await tx.groupMembership.deleteMany({
          where: {
            groupId: { in: ownedGroupIds },
            userId: friendId,
          },
        });
      }

      // Remove self from friend's groups
      const friendOwnedGroups = await tx.group.findMany({
        where: { ownerId: friendId },
        select: { id: true },
      });
      const friendGroupIds = friendOwnedGroups.map(g => g.id);
      if (friendGroupIds.length > 0) {
        await tx.groupMembership.deleteMany({
          where: {
            groupId: { in: friendGroupIds },
            userId,
          },
        });
      }
    });

    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to remove friend.' });
  }
});

// GET /api/friends/requests
friendsRouter.get('/api/friends/requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requests = await prisma.friendship.findMany({
      where: {
        friendId: req.user.id,
        status: 'pending',
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    const response = requests.map(r => ({
      id: r.id,
      fromUser: {
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl,
        isFriend: false,
        friendshipStatus: 'pending_incoming',
      },
      createdAt: r.createdAt,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load friend requests.' });
  }
});

// POST /api/friends/requests/:requestID/accept
friendsRouter.post('/api/friends/requests/:requestID/accept', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requestId = parseBigInt(req.params.requestID, 'requestID');
    const request = await prisma.friendship.findFirst({
      where: {
        id: requestId,
        friendId: req.user.id,
        status: 'pending',
      },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ detail: 'Friend request not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.friendship.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      });

      const reverse = await tx.friendship.findFirst({
        where: { userId: req.user.id, friendId: request.userId },
      });

      if (!reverse) {
        await tx.friendship.create({
          data: {
            userId: req.user.id,
            friendId: request.userId,
            status: 'accepted',
          },
        });
      } else {
        await tx.friendship.update({
          where: { id: reverse.id },
          data: { status: 'accepted' },
        });
      }
    });

    res.json({
      id: request.user.id,
      username: request.user.username,
      displayName: request.user.displayName,
      avatarUrl: request.user.avatarUrl,
      isFriend: true,
      friendshipStatus: 'accepted',
    });
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to accept friend request.' });
  }
});

// POST /api/friends/requests/:requestID/reject
friendsRouter.post('/api/friends/requests/:requestID/reject', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requestId = parseBigInt(req.params.requestID, 'requestID');
    const deleteResult = await prisma.friendship.deleteMany({
      where: {
        id: requestId,
        friendId: req.user.id,
        status: 'pending',
      },
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({ detail: 'Friend request not found.' });
    }

    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to reject friend request.' });
  }
});
