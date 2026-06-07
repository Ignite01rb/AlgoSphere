import { Router, Response } from 'express';
import { prisma } from '../utils/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { normalizeRequiredText } from '../utils/validation';
import { resolveProblem, getProblemSignature, normalizeDifficultyForPlatform } from '../services/scraper';
import { addProblemTitle } from '../utils/search';
import { buildAnalytics, filterByWindow, ProblemRecord } from '../utils/analytics';

export const groupsRouter = Router();

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

async function getAccessibleGroup(groupId: bigint, userId: bigint) {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      memberships: {
        some: { userId: userId },
      },
    },
    include: {
      memberships: {
        include: { user: true },
      },
      problems: {
        include: { sharedBy: true },
      },
    },
  });

  if (!group) {
    throw { status: 404, message: 'Group not found.' };
  }
  return group;
}

export function serializeGroup(group: any, currentUserId: bigint) {
  let lastActiveAt = new Date(group.createdAt);
  if (group.problems && group.problems.length > 0) {
    for (const prob of group.problems) {
      const sharedAt = new Date(prob.sharedAt);
      if (sharedAt > lastActiveAt) {
        lastActiveAt = sharedAt;
      }
    }
  }

  const memberNames: string[] = [];
  const memberDetails: any[] = [];
  if (group.memberships) {
    for (const mem of group.memberships) {
      if (mem.user) {
        memberNames.push(mem.user.username);
        memberDetails.push({
          userId: mem.user.id,
          username: mem.user.username,
          displayName: mem.user.displayName,
          avatarUrl: mem.user.avatarUrl,
          role: mem.role,
        });
      }
    }
  }

  memberNames.sort();
  memberDetails.sort((a, b) => a.username.localeCompare(b.username));

  return {
    id: group.id,
    name: group.name,
    memberCount: group.memberships ? group.memberships.length : 0,
    problemCount: group.problems ? group.problems.length : 0,
    lastActiveAt,
    members: memberNames,
    memberDetail: memberDetails,
    isOwner: group.ownerId === currentUserId,
  };
}

export function serializeProblem(problem: any) {
  const platformLabels: Record<string, string> = {
    leetcode: 'LeetCode',
    codeforces: 'Codeforces',
    codechef: 'CodeChef',
    atcoder: 'AtCoder',
    hackerrank: 'HackerRank',
    topcoder: 'TopCoder',
    geeksforgeeks: 'GeeksforGeeks',
    coder: 'Coder',
  };

  const label = platformLabels[problem.platform] || problem.platform;

  return {
    id: problem.id,
    title: problem.title,
    contest: problem.contest,
    tags: problem.tags,
    difficulty: normalizeDifficultyForPlatform(problem.platform, problem.difficulty, problem.platformProblemId),
    url: problem.problemUrl,
    platform: label,
    sharedBy: problem.sharedBy ? problem.sharedBy.username : '',
    thumbnailUrl: problem.thumbnailUrl,
    solvedByCount: problem.solvedByCount,
    sharedAt: problem.sharedAt,
  };
}

function toAnalyticsRecords(problems: any[]): ProblemRecord[] {
  return problems.map(p => ({
    title: p.title,
    contest: p.contest,
    difficulty: p.difficulty,
    platform: p.platform,
    platformProblemId: p.platformProblemId,
    sharedAt: p.sharedAt,
    problemSignature: p.problemSignature,
    sharedByUsername: p.sharedBy ? p.sharedBy.username : '',
  }));
}

// GET /api/groups
groupsRouter.get('/api/groups', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      include: {
        memberships: {
          include: { user: true },
        },
        problems: {
          include: { sharedBy: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(groups.map(g => serializeGroup(g, userId)));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load groups.' });
  }
});

// POST /api/groups
groupsRouter.post('/api/groups', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name: nameRaw, memberIds: memberIdsRaw, member_ids: memberIdsSnake } = req.body;
  const memberIdsInput = memberIdsRaw || memberIdsSnake || [];

  if (!nameRaw) {
    return res.status(422).json({
      detail: [{ loc: ['body', 'name'], msg: 'Field required.' }],
    });
  }

  let name = '';
  try {
    name = normalizeRequiredText(nameRaw, 'Group name');
  } catch (e: any) {
    return res.status(422).json({
      detail: [{ loc: ['body', 'name'], msg: e.message + '.' }],
    });
  }

  const memberIds = Array.isArray(memberIdsInput)
    ? memberIdsInput.map(id => BigInt(id)).filter(id => id > 0n && id !== req.user.id)
    : [];

  try {
    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name,
          ownerId: req.user.id,
        },
      });

      await tx.groupMembership.create({
        data: {
          groupId: g.id,
          userId: req.user.id,
          role: 'owner',
        },
      });

      for (const mId of memberIds) {
        const uCount = await tx.user.count({ where: { id: mId } });
        if (uCount > 0) {
          await tx.groupMembership.create({
            data: {
              groupId: g.id,
              userId: mId,
              role: 'member',
            },
          });
        }
      }
      return g;
    });

    const loaded = await getAccessibleGroup(group.id, req.user.id);
    res.status(201).json(serializeGroup(loaded, req.user.id));
  } catch (error: any) {
    res.status(500).json({ detail: 'Failed to create the group.' });
  }
});

// GET /api/groups/top
groupsRouter.get('/api/groups/top', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const rows = await prisma.$queryRaw<any[]>`
      SELECT 
        g.id, 
        g.name, 
        g.owner_id AS ownerId, 
        COUNT(DISTINCT gm.id) AS memberCount, 
        COUNT(DISTINCT ps.id) AS problemCount, 
        MAX(ps.shared_at) AS lastActiveAt, 
        u.username AS ownerUsername
      FROM groups g
      JOIN group_memberships gm ON gm.group_id = g.id
      JOIN users u ON u.id = g.owner_id
      LEFT JOIN problem_shares ps ON ps.group_id = g.id
      GROUP BY g.id, g.name, g.owner_id, u.username
      HAVING COUNT(DISTINCT gm.id) > 1
      ORDER BY COUNT(DISTINCT ps.id) DESC, COUNT(DISTINCT gm.id) DESC
      LIMIT 20
    `;

    const groupIds = rows.map(r => BigInt(r.id));
    const memberSet = new Set<bigint>();
    const pendingSet = new Set<bigint>();

    if (groupIds.length > 0) {
      const memberships = await prisma.groupMembership.findMany({
        where: {
          groupId: { in: groupIds },
          userId,
        },
        select: { groupId: true },
      });
      for (const m of memberships) {
        memberSet.add(m.groupId);
      }

      const joinRequests = await prisma.joinRequest.findMany({
        where: {
          groupId: { in: groupIds },
          userId,
          status: 'pending',
        },
        select: { groupId: true },
      });
      for (const j of joinRequests) {
        pendingSet.add(j.groupId);
      }
    }

    const response = rows.map(r => {
      const gId = BigInt(r.id);
      let joinStatus: string | null = null;
      if (memberSet.has(gId)) {
        joinStatus = 'member';
      } else if (pendingSet.has(gId)) {
        joinStatus = 'pending';
      }

      return {
        id: gId,
        name: r.name,
        memberCount: Number(r.memberCount),
        problemCount: Number(r.problemCount),
        lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt) : null,
        ownerUsername: r.ownerUsername,
        joinStatus,
      };
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load the top groups.' });
  }
});

// GET /api/groups/join-requests
groupsRouter.get('/api/groups/join-requests', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.joinRequest.findMany({
      where: {
        group: {
          ownerId: userId,
        },
        status: 'pending',
      },
      include: {
        user: true,
        group: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests.map(r => ({
      id: r.id,
      groupId: r.groupId,
      groupName: r.group.name,
      userId: r.user.id,
      username: r.user.username,
      displayName: r.user.displayName,
      avatarUrl: r.user.avatarUrl,
      status: r.status,
      createdAt: r.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load join requests.' });
  }
});

// POST /api/groups/join-requests/:requestID/accept
groupsRouter.post('/api/groups/join-requests/:requestID/accept', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requestId = parseBigInt(req.params.requestID, 'requestID');
    const request = await prisma.joinRequest.findFirst({
      where: { id: requestId, status: 'pending' },
      include: { group: true },
    });

    if (!request || request.group.ownerId !== req.user.id) {
      return res.status(404).json({ detail: 'Join request not found.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      });

      const existing = await tx.groupMembership.findFirst({
        where: { groupId: request.groupId, userId: request.userId },
      });

      if (!existing) {
        await tx.groupMembership.create({
          data: {
            groupId: request.groupId,
            userId: request.userId,
            role: 'member',
          },
        });
      }
    });

    res.json({ status: 'accepted' });
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to accept join request.' });
  }
});

// POST /api/groups/join-requests/:requestID/reject
groupsRouter.post('/api/groups/join-requests/:requestID/reject', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const requestId = parseBigInt(req.params.requestID, 'requestID');
    const request = await prisma.joinRequest.findFirst({
      where: { id: requestId, status: 'pending' },
      include: { group: true },
    });

    if (!request || request.group.ownerId !== req.user.id) {
      return res.status(404).json({ detail: 'Join request not found.' });
    }

    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    res.json({ status: 'rejected' });
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to reject join request.' });
  }
});

// POST /api/groups/:groupID/request-join
groupsRouter.post('/api/groups/:groupID/request-join', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ detail: 'Group not found.' });
    }

    const membership = await prisma.groupMembership.findFirst({
      where: { groupId, userId: req.user.id },
    });
    if (membership) {
      return res.status(409).json({ detail: 'You are already a member of this squad.' });
    }

    const pending = await prisma.joinRequest.findFirst({
      where: { groupId, userId: req.user.id, status: 'pending' },
    });
    if (pending) {
      return res.status(409).json({ detail: 'Join request already pending.' });
    }

    await prisma.joinRequest.create({
      data: {
        groupId,
        userId: req.user.id,
        status: 'pending',
      },
    });

    res.json({ status: 'pending' });
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to send join request.' });
  }
});

// DELETE /api/groups/:groupID
groupsRouter.delete('/api/groups/:groupID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await prisma.group.findFirst({
      where: { id: groupId, ownerId: req.user.id },
    });

    if (!group) {
      return res.status(404).json({ detail: 'Group not found.' });
    }

    await prisma.group.delete({ where: { id: groupId } });
    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to delete group.' });
  }
});

// POST /api/groups/:groupID/members
groupsRouter.post('/api/groups/:groupID/members', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await getAccessibleGroup(groupId, req.user.id);
    if (group.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Not authorized to add members.' });
    }

    const { memberIds: memberIdsRaw, member_ids: memberIdsSnake } = req.body;
    const memberIdsInput = memberIdsRaw || memberIdsSnake || [];
    if (!Array.isArray(memberIdsInput)) {
      return res.status(400).json({ detail: 'memberIds must be an array.' });
    }

    const memberIds = memberIdsInput.map(id => BigInt(id)).filter(id => id > 0n);

    for (const mId of memberIds) {
      const uCount = await prisma.user.count({ where: { id: mId } });
      if (uCount > 0) {
        const existing = await prisma.groupMembership.findFirst({
          where: { groupId, userId: mId },
        });
        if (!existing) {
          await prisma.groupMembership.create({
            data: {
              groupId,
              userId: mId,
              role: 'member',
            },
          });
        }
      }
    }

    const updated = await getAccessibleGroup(groupId, req.user.id);
    res.json(serializeGroup(updated, req.user.id));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to add members.' });
  }
});

// DELETE /api/groups/:groupID/members/:userID
groupsRouter.delete('/api/groups/:groupID/members/:userID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const userId = parseBigInt(req.params.userID, 'userID');
    const group = await getAccessibleGroup(groupId, req.user.id);

    if (userId !== req.user.id && group.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Not authorized to remove member.' });
    }

    const membership = await prisma.groupMembership.findFirst({
      where: { groupId, userId },
    });

    if (!membership) {
      return res.status(404).json({ detail: 'Member not found in group.' });
    }

    await prisma.$transaction(async (tx) => {
      if (userId === group.ownerId) {
        const nextMembership = await tx.groupMembership.findFirst({
          where: { groupId, userId: { not: userId } },
          orderBy: { createdAt: 'asc' },
        });

        if (!nextMembership) {
          // If no other members exist, delete the group
          await tx.group.delete({ where: { id: groupId } });
        } else {
          await tx.group.update({
            where: { id: groupId },
            data: { ownerId: nextMembership.userId },
          });

          await tx.groupMembership.update({
            where: { id: nextMembership.id },
            data: { role: 'owner' },
          });

          await tx.groupMembership.delete({ where: { id: membership.id } });
        }
      } else {
        await tx.groupMembership.delete({ where: { id: membership.id } });
      }
    });

    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to remove member.' });
  }
});

// GET /api/groups/:groupID/problems
groupsRouter.get('/api/groups/:groupID/problems', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await getAccessibleGroup(groupId, req.user.id);

    const problems = await prisma.problemShare.findMany({
      where: { groupId: group.id },
      include: { sharedBy: true },
      orderBy: { sharedAt: 'desc' },
    });

    res.json(problems.map(p => serializeProblem(p)));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to load group problems.' });
  }
});

// POST /api/groups/:groupID/problems
groupsRouter.post('/api/groups/:groupID/problems', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await getAccessibleGroup(groupId, req.user.id);

    const { url } = req.body;
    if (!url) {
      return res.status(422).json({
        detail: [{ loc: ['body', 'url'], msg: 'Field required.' }],
      });
    }

    const resolved = await resolveProblem(url);
    const sig = getProblemSignature(resolved.platform, resolved.title, resolved.platformProblemId);

    const problem = await prisma.problemShare.create({
      data: {
        groupId: group.id,
        sharedById: req.user.id,
        platform: resolved.platform,
        problemUrl: resolved.problemUrl,
        platformProblemId: resolved.platformProblemId,
        title: resolved.title,
        contest: resolved.contest,
        tags: resolved.tags,
        difficulty: resolved.difficulty,
        thumbnailUrl: resolved.thumbnailUrl,
        solvedByCount: resolved.solvedByCount,
        problemSignature: sig,
      },
      include: { sharedBy: true },
    });

    addProblemTitle(problem.title);
    res.status(201).json(serializeProblem(problem));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to add problem.' });
  }
});

// DELETE /api/groups/:groupID/problems/:problemID
groupsRouter.delete('/api/groups/:groupID/problems/:problemID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const problemId = parseBigInt(req.params.problemID, 'problemID');
    const group = await getAccessibleGroup(groupId, req.user.id);

    const problem = await prisma.problemShare.findFirst({
      where: { id: problemId, groupId: group.id },
    });

    if (!problem) {
      return res.status(404).json({ detail: 'Problem not found in group.' });
    }

    if (problem.sharedById !== req.user.id && group.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Not authorized to remove this problem.' });
    }

    await prisma.problemShare.delete({ where: { id: problemId } });
    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to remove problem.' });
  }
});

// GET /api/problems/feed
groupsRouter.get('/api/problems/feed', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const problems = await prisma.problemShare.findMany({
      where: {
        group: {
          memberships: {
            some: { userId },
          },
        },
      },
      include: { sharedBy: true },
      orderBy: { sharedAt: 'desc' },
      take: 50,
    });

    res.json(problems.map(p => serializeProblem(p)));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load the problems feed.' });
  }
});

// GET /api/groups/:groupID/analytics
groupsRouter.get('/api/groups/:groupID/analytics', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseBigInt(req.params.groupID, 'groupID');
    const group = await getAccessibleGroup(groupId, req.user.id);

    const problems = await prisma.problemShare.findMany({
      where: { groupId: group.id },
      include: { sharedBy: true },
      orderBy: { sharedAt: 'desc' },
    });

    const window = (req.query.window as string) || '30d';
    const records = toAnalyticsRecords(problems);
    const filtered = filterByWindow(records, window, new Date());
    const response = buildAnalytics(filtered);

    res.json(response);
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to load group analytics.' });
  }
});

// GET /api/analytics/me
groupsRouter.get('/api/analytics/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const problems = await prisma.problemShare.findMany({
      where: { sharedById: userId },
      include: { sharedBy: true },
      orderBy: { sharedAt: 'desc' },
    });

    const window = (req.query.window as string) || '30d';
    const records = toAnalyticsRecords(problems);
    const filtered = filterByWindow(records, window, new Date());
    const response = buildAnalytics(filtered);

    res.json(response);
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load analytics data.' });
  }
});
