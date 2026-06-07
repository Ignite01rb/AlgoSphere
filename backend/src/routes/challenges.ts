import { Router } from 'express';
import { prisma } from '../utils/db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { normalizeRequiredText } from '../utils/validation';
import { fetchProblems, pickRandomProblems } from '../services/codeforces';

export const challengesRouter = Router();

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

async function loadChallenge(challengeId: bigint) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      createdBy: true,
      participants: {
        include: { user: true },
      },
      problems: true,
    },
  });

  if (!challenge) {
    throw { status: 404, message: 'Challenge not found.' };
  }
  return challenge;
}

function serializeChallenge(challenge: any) {
  const participants = challenge.participants.map((p: any) => ({
    userId: p.user.id,
    username: p.user.username,
    displayName: p.user.displayName,
    avatarUrl: p.user.avatarUrl,
    status: p.status,
  }));
  participants.sort((a: any, b: any) => a.username.localeCompare(b.username));

  const problems = challenge.problems.map((p: any) => ({
    id: p.id,
    problemUrl: p.problemUrl,
    title: p.title,
    contestId: p.contestId,
    problemIndex: p.problemIndex,
    rating: p.rating,
    tags: p.tags,
    orderIndex: p.orderIndex,
  }));
  problems.sort((a: any, b: any) => a.orderIndex - b.orderIndex);

  return {
    id: challenge.id,
    title: challenge.title,
    platform: challenge.platform,
    numProblems: challenge.numProblems,
    minRating: challenge.minRating,
    maxRating: challenge.maxRating,
    tags: challenge.tags,
    status: challenge.status,
    createdBy: challenge.createdBy ? challenge.createdBy.username : '',
    createdById: challenge.createdById,
    participants,
    problems,
    createdAt: challenge.createdAt,
    startedAt: challenge.startedAt,
  };
}

function hasParticipant(challenge: any, userId: bigint): boolean {
  return challenge.participants.some((p: any) => p.userId === userId);
}

// POST /api/challenges
challengesRouter.post('/api/challenges', requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    title: titleRaw,
    platform: platformRaw,
    numProblems: numProblemsRaw,
    num_problems: numProblemsSnake,
    minRating: minRatingRaw,
    min_rating: minRatingSnake,
    maxRating: maxRatingRaw,
    max_rating: maxRatingSnake,
    tags: tagsRaw,
    inviteUserIds: inviteUserIdsRaw,
    invite_user_ids: inviteUserIdsSnake,
  } = req.body;

  const inviteUserIdsInput = inviteUserIdsRaw || inviteUserIdsSnake;

  const issues: any[] = [];
  if (!titleRaw) {
    issues.push({ loc: ['body', 'title'], msg: 'Field required.' });
  }
  if (!inviteUserIdsInput) {
    issues.push({ loc: ['body', 'inviteUserIds'], msg: 'Field required.' });
  }

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  let title = '';
  try {
    title = normalizeRequiredText(titleRaw, 'Challenge title');
  } catch (e: any) {
    issues.push({ loc: ['body', 'title'], msg: e.message + '.' });
  }

  const numProblems = numProblemsRaw !== undefined ? numProblemsRaw : (numProblemsSnake !== undefined ? numProblemsSnake : 3);
  if (numProblems < 1 || numProblems > 10) {
    issues.push({ loc: ['body', 'numProblems'], msg: 'Value must be between 1 and 10.' });
  }

  const minRatingInput = minRatingRaw !== undefined ? minRatingRaw : (minRatingSnake !== undefined ? minRatingSnake : 800);
  if (minRatingInput < 0 || minRatingInput > 3500) {
    issues.push({ loc: ['body', 'minRating'], msg: 'Value must be between 0 and 3500.' });
  }

  const maxRatingInput = maxRatingRaw !== undefined ? maxRatingRaw : (maxRatingSnake !== undefined ? maxRatingSnake : 1600);
  if (maxRatingInput < 0 || maxRatingInput > 3500) {
    issues.push({ loc: ['body', 'maxRating'], msg: 'Value must be between 0 and 3500.' });
  }

  const inviteIds = Array.isArray(inviteUserIdsInput)
    ? inviteUserIdsInput.map(id => BigInt(id)).filter(id => id > 0n && id !== req.user.id)
    : [];

  if (inviteIds.length === 0) {
    issues.push({ loc: ['body', 'inviteUserIds'], msg: 'Invite user IDs must include at least 1 item(s).' });
  }

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  const platform = platformRaw || 'codeforces';
  const tagsList = Array.isArray(tagsRaw) ? tagsRaw : [];

  try {
    // Fetch random problems from Codeforces
    const cfProblems = await fetchProblems(tagsList, minRatingInput, maxRatingInput);
    const selected = pickRandomProblems(cfProblems, numProblems);

    if (selected.length === 0) {
      return res.status(400).json({ detail: 'No problems found matching criteria. Broaden your filters.' });
    }

    const now = new Date();

    const challenge = await prisma.$transaction(async (tx) => {
      const c = await tx.challenge.create({
        data: {
          createdById: req.user.id,
          title,
          platform,
          numProblems,
          minRating: minRatingInput,
          maxRating: maxRatingInput,
          tags: tagsList.length > 0 ? tagsList.join(',') : null,
          status: 'pending',
          createdAt: now,
        },
      });

      // Creator participant (accepted)
      await tx.challengeParticipant.create({
        data: {
          challengeId: c.id,
          userId: req.user.id,
          status: 'accepted',
          joinedAt: now,
        },
      });

      // Invited participants
      for (const invId of inviteIds) {
        const userCount = await tx.user.count({ where: { id: invId } });
        if (userCount > 0) {
          await tx.challengeParticipant.create({
            data: {
              challengeId: c.id,
              userId: invId,
              status: 'invited',
            },
          });
        }
      }

      // Challenge problems
      for (let i = 0; i < selected.length; i++) {
        const prob = selected[i];
        await tx.challengeProblem.create({
          data: {
            challengeId: c.id,
            problemUrl: `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`,
            title: prob.name,
            contestId: prob.contestId,
            problemIndex: prob.index,
            rating: prob.rating,
            tags: prob.tags.length > 0 ? prob.tags.join(',') : null,
            orderIndex: i,
          },
        });
      }

      return c;
    });

    const loaded = await loadChallenge(challenge.id);
    res.status(201).json(serializeChallenge(loaded));
  } catch (error: any) {
    console.error('Challenge Creation Error:', error.message);
    res.status(502).json({ detail: 'Failed to load challenge problems from Codeforces. Please try again.' });
  }
});

// GET /api/challenges
challengesRouter.get('/api/challenges', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user.id;
    const challenges = await prisma.challenge.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        createdBy: true,
        participants: {
          include: { user: true },
        },
        problems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(challenges.map(c => serializeChallenge(c)));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load challenges.' });
  }
});

// GET /api/challenges/:challengeID
challengesRouter.get('/api/challenges/:challengeID', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const challengeId = parseBigInt(req.params.challengeID, 'challengeID');
    const challenge = await loadChallenge(challengeId);

    if (!hasParticipant(challenge, req.user.id)) {
      return res.status(404).json({ detail: 'Challenge not found.' });
    }

    res.json(serializeChallenge(challenge));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to get challenge.' });
  }
});

// POST /api/challenges/:challengeID/accept
challengesRouter.post('/api/challenges/:challengeID/accept', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const challengeId = parseBigInt(req.params.challengeID, 'challengeID');
    const challenge = await loadChallenge(challengeId);

    if (!hasParticipant(challenge, req.user.id)) {
      return res.status(404).json({ detail: 'Challenge not found.' });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const participant = await tx.challengeParticipant.findFirst({
        where: { challengeId, userId: req.user.id },
      });

      if (!participant) {
        throw { status: 404, message: 'Challenge invitation not found.' };
      }
      if (participant.status !== 'invited') {
        throw { status: 400, message: 'Already responded.' };
      }

      await tx.challengeParticipant.update({
        where: { id: participant.id },
        data: { status: 'accepted', joinedAt: now },
      });

      // Check if all are accepted
      const allParticipants = await tx.challengeParticipant.findMany({
        where: { challengeId },
      });

      const allAccepted = allParticipants.every(p => {
        if (p.userId === req.user.id) return true;
        return p.status === 'accepted';
      });

      if (allAccepted && challenge.status === 'pending') {
        await tx.challenge.update({
          where: { id: challengeId },
          data: { status: 'active', startedAt: now },
        });
      }
    });

    const loaded = await loadChallenge(challengeId);
    res.json(serializeChallenge(loaded));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to accept challenge.' });
  }
});

// POST /api/challenges/:challengeID/decline
challengesRouter.post('/api/challenges/:challengeID/decline', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const challengeId = parseBigInt(req.params.challengeID, 'challengeID');
    const participant = await prisma.challengeParticipant.findFirst({
      where: { challengeId, userId: req.user.id },
    });

    if (!participant) {
      return res.status(404).json({ detail: 'Challenge not found.' });
    }
    if (participant.status !== 'invited') {
      return res.status(400).json({ detail: 'Already responded.' });
    }

    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { status: 'declined' },
    });

    res.status(204).end();
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to decline challenge.' });
  }
});

// POST /api/challenges/:challengeID/start
challengesRouter.post('/api/challenges/:challengeID/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const challengeId = parseBigInt(req.params.challengeID, 'challengeID');
    const challenge = await loadChallenge(challengeId);

    if (challenge.createdById !== req.user.id) {
      return res.status(404).json({ detail: 'Challenge not found.' });
    }
    if (challenge.status !== 'pending') {
      return res.status(400).json({ detail: 'Challenge is not pending.' });
    }

    const hasDeclined = challenge.participants.some(p => p.status === 'declined');
    if (hasDeclined) {
      return res.status(400).json({ detail: 'Some participants have declined.' });
    }

    const now = new Date();
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'active',
        startedAt: now,
      },
    });

    const loaded = await loadChallenge(challengeId);
    res.json(serializeChallenge(loaded));
  } catch (error: any) {
    res.status(error.status || 500).json({ detail: error.message || 'Failed to start challenge.' });
  }
});
