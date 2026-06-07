import { Router, Response } from 'express';
import axios from 'axios';
import { prisma } from '../utils/db';
import {
  normalizeUsername,
  normalizeRequiredText,
  normalizeOptionalText,
  normalizeBioText,
  validateProfileImageURL,
  validatePassword,
  normalizeEmail,
} from '../utils/validation';
import { hashPassword, verifyPassword } from '../utils/password';
import { createAccessToken } from '../utils/jwt';
import { usernameTrie, problemTrie, addUsername, usernameMayExist } from '../utils/search';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';

export const authRouter = Router();

function validationIssue(scope: string, field: string, message: string) {
  return {
    loc: [scope, field],
    msg: message,
  };
}

export function serializeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio || '',
    favoriteTopic: user.favoriteTopic,
    favoritePlatform: user.favoritePlatform,
    avatarUrl: user.avatarUrl,
    leetcodeHandle: user.leetcodeHandle,
    codeforcesHandle: user.codeforcesHandle,
    codechefHandle: user.codechefHandle,
    atcoderHandle: user.atcoderHandle,
    createdAt: user.createdAt,
  };
}

export function tokenResponseForUser(user: any) {
  const token = createAccessToken(user.id.toString());
  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: config.accessTokenExpireMinutes * 60,
    user: serializeUser(user),
  };
}

// GET /api/stats
authRouter.get('/api/stats', async (req, res) => {
  try {
    const groupsCreated = await prisma.group.count();
    const problemsShared = await prisma.problemShare.count();
    const activeMembers = await prisma.user.count();

    res.json({
      groupsCreated,
      problemsShared,
      activeMembers,
    });
  } catch (error) {
    res.status(500).json({ detail: 'Failed to load global stats.' });
  }
});

// GET /api/auth/check-username
authRouter.get('/api/auth/check-username', async (req, res) => {
  const usernameParam = req.query.username;
  if (typeof usernameParam !== 'string') {
    return res.status(422).json({
      detail: [validationIssue('query', 'username', 'Username must be a string.')],
    });
  }

  let username: string;
  try {
    username = normalizeUsername(usernameParam, 'Username', false);
  } catch (error: any) {
    return res.status(422).json({
      detail: [validationIssue('query', 'username', error.message + '.')],
    });
  }

  if (!usernameMayExist(username)) {
    return res.json({ available: true });
  }

  try {
    const count = await prisma.user.count({
      where: { username: { equals: username } },
    });
    res.json({ available: count === 0 });
  } catch (error) {
    res.status(500).json({ detail: 'Failed to check username availability.' });
  }
});

// POST /api/auth/register
authRouter.post('/api/auth/register', async (req, res) => {
  const { email: emailRaw, username: usernameRaw, displayName: displayNameRaw, password: passwordRaw } = req.body;
  const favoriteTopicRaw = req.body.favoriteTopic || req.body.favorite_topic;
  const favoritePlatformRaw = req.body.favoritePlatform || req.body.favorite_platform;

  const issues: any[] = [];
  if (!emailRaw) issues.push(validationIssue('body', 'email', 'Field required.'));
  if (!usernameRaw) issues.push(validationIssue('body', 'username', 'Field required.'));
  if (!displayNameRaw) issues.push(validationIssue('body', 'displayName', 'Field required.'));
  if (!passwordRaw) issues.push(validationIssue('body', 'password', 'Field required.'));

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  let email = '', username = '', displayName = '', password = '';
  let favoriteTopic: string | null = null, favoritePlatform: string | null = null;

  try { email = normalizeEmail(emailRaw); } catch (e: any) { issues.push(validationIssue('body', 'email', e.message)); }
  try { username = normalizeUsername(usernameRaw, 'Username', false); } catch (e: any) { issues.push(validationIssue('body', 'username', e.message + '.')); }
  try { displayName = normalizeRequiredText(displayNameRaw, 'Display name'); } catch (e: any) { issues.push(validationIssue('body', 'displayName', e.message + '.')); }
  try { password = validatePassword(passwordRaw); } catch (e: any) { issues.push(validationIssue('body', 'password', e.message + '.')); }
  try { favoriteTopic = normalizeOptionalText(favoriteTopicRaw, 'Favorite topic'); } catch (e: any) { issues.push(validationIssue('body', 'favoriteTopic', e.message + '.')); }
  try { favoritePlatform = normalizeOptionalText(favoritePlatformRaw, 'Favorite platform'); } catch (e: any) { issues.push(validationIssue('body', 'favoritePlatform', e.message + '.')); }

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  try {
    const existingEmail = await prisma.user.count({ where: { email } });
    if (existingEmail > 0) {
      return res.status(409).json({ detail: 'An account already exists for that email.' });
    }

    const existingUsername = await prisma.user.count({ where: { username } });
    if (existingUsername > 0) {
      return res.status(409).json({ detail: 'That username is already taken.' });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          displayName,
          bio: '',
          favoriteTopic,
          favoritePlatform,
          avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
          passwordHash,
          authProvider: 'local',
        },
      });

      const group = await tx.group.create({
        data: {
          name: `${user.displayName}'s Squad`,
          ownerId: user.id,
        },
      });

      await tx.groupMembership.create({
        data: {
          groupId: group.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return user;
    });

    addUsername(result.username);
    res.status(201).json(tokenResponseForUser(result));
  } catch (error: any) {
    res.status(409).json({ detail: 'An account with those credentials already exists.' });
  }
});

// POST /api/auth/login
authRouter.post('/api/auth/login', async (req, res) => {
  const { identifier: identifierRaw, password } = req.body;
  const issues: any[] = [];
  if (!identifierRaw) issues.push(validationIssue('body', 'identifier', 'Field required.'));
  if (!password) issues.push(validationIssue('body', 'password', 'Field required.'));

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  let identifier = '';
  try {
    identifier = normalizeRequiredText(identifierRaw, 'Email or username');
  } catch (e: any) {
    return res.status(422).json({ detail: [validationIssue('body', 'identifier', e.message + '.')] });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ detail: 'Invalid email, username, or password.' });
    }

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ detail: 'Invalid email, username, or password.' });
    }

    res.json(tokenResponseForUser(user));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to look up the account.' });
  }
});

// POST /api/auth/google
authRouter.post('/api/auth/google', async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(422).json({ detail: [validationIssue('body', 'code', 'Field required.')] });
  }

  if (!config.googleClientId || !config.googleClientSecret) {
    return res.status(500).json({ detail: 'Google OAuth is not configured.' });
  }

  const actualRedirectUri = redirectUri || config.googleRedirectUri;

  try {
    // Exchange auth code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: actualRedirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
      timeout: 15000,
    });

    const googleUser = userInfoResponse.data;
    if (!googleUser.verified_email && !googleUser.verifiedEmail) {
      return res.status(401).json({ detail: 'Google account email must be verified before sign-in.' });
    }

    const googleId = googleUser.id;
    const email = googleUser.email.toLowerCase();
    const name = googleUser.name || email;
    const picture = googleUser.picture || null;

    // Check if googleId already matches
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      if (user.avatarUrl && user.avatarUrl.includes('dicebear') && picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: picture },
        });
      }
      return res.json(tokenResponseForUser(user));
    }

    // Check if email already matches
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          authProvider: user.passwordHash ? 'both' : 'google',
          avatarUrl: (user.avatarUrl && user.avatarUrl.includes('dicebear') && picture) ? picture : user.avatarUrl,
        },
      });
      return res.json(tokenResponseForUser(updated));
    }

    // Generate unique username
    let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (baseUsername.length > 24) {
      baseUsername = baseUsername.substring(0, 24);
    }
    if (baseUsername.length < 3) {
      baseUsername = 'user';
    }

    let username = baseUsername;
    let counter = 1;
    while (true) {
      const count = await prisma.user.count({ where: { username } });
      if (count === 0) {
        break;
      }
      const suffix = counter.toString();
      let trimmed = baseUsername;
      if (trimmed.length + suffix.length > 24) {
        trimmed = trimmed.substring(0, 24 - suffix.length);
      }
      username = trimmed + suffix;
      counter++;
    }

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          displayName: name,
          bio: '',
          avatarUrl: picture || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
          googleId,
          authProvider: 'google',
        },
      });

      const group = await tx.group.create({
        data: {
          name: `${newUser.displayName}'s Squad`,
          ownerId: newUser.id,
        },
      });

      await tx.groupMembership.create({
        data: {
          groupId: group.id,
          userId: newUser.id,
          role: 'owner',
        },
      });

      return newUser;
    });

    addUsername(created.username);
    res.json(tokenResponseForUser(created));
  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    res.status(401).json({ detail: 'Google authentication failed. Please try again.' });
  }
});

// GET /api/auth/me
authRouter.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(serializeUser(req.user));
});

// GET /api/profile
authRouter.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json(serializeUser(req.user));
});

// PATCH /api/profile
authRouter.patch('/api/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const {
    displayName: displayNameRaw,
    bio: bioRaw,
    favoriteTopic: favoriteTopicRaw,
    favoritePlatform: favoritePlatformRaw,
    avatarUrl: avatarUrlRaw,
    leetcodeHandle: leetcodeHandleRaw,
    codeforcesHandle: codeforcesHandleRaw,
    codechefHandle: codechefHandleRaw,
    atcoderHandle: atcoderHandleRaw,
  } = req.body;

  const issues: any[] = [];
  if (displayNameRaw === undefined) {
    issues.push(validationIssue('body', 'displayName', 'Field required.'));
  }

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  let displayName = '';
  let bio = '';
  let favoriteTopic: string | null = null;
  let favoritePlatform: string | null = null;
  let avatarUrl: string | null = null;
  let leetcodeHandle: string | null = null;
  let codeforcesHandle: string | null = null;
  let codechefHandle: string | null = null;
  let atcoderHandle: string | null = null;

  try { displayName = normalizeRequiredText(displayNameRaw, 'Display name'); } catch (e: any) { issues.push(validationIssue('body', 'displayName', e.message + '.')); }
  try { bio = normalizeBioText(bioRaw || ''); } catch (e: any) { issues.push(validationIssue('body', 'bio', e.message + '.')); }
  try { favoriteTopic = normalizeOptionalText(favoriteTopicRaw, 'Favorite topic'); } catch (e: any) { issues.push(validationIssue('body', 'favoriteTopic', e.message + '.')); }
  try { favoritePlatform = normalizeOptionalText(favoritePlatformRaw, 'Favorite platform'); } catch (e: any) { issues.push(validationIssue('body', 'favoritePlatform', e.message + '.')); }
  try { avatarUrl = validateProfileImageURL(avatarUrlRaw); } catch (e: any) { issues.push(validationIssue('body', 'avatarUrl', e.message + '.')); }
  try { leetcodeHandle = normalizeOptionalText(leetcodeHandleRaw, 'LeetCode handle'); } catch (e: any) { issues.push(validationIssue('body', 'leetcodeHandle', e.message + '.')); }
  try { codeforcesHandle = normalizeOptionalText(codeforcesHandleRaw, 'Codeforces handle'); } catch (e: any) { issues.push(validationIssue('body', 'codeforcesHandle', e.message + '.')); }
  try { codechefHandle = normalizeOptionalText(codechefHandleRaw, 'CodeChef handle'); } catch (e: any) { issues.push(validationIssue('body', 'codechefHandle', e.message + '.')); }
  try { atcoderHandle = normalizeOptionalText(atcoderHandleRaw, 'AtCoder handle'); } catch (e: any) { issues.push(validationIssue('body', 'atcoderHandle', e.message + '.')); }

  if (issues.length > 0) {
    return res.status(422).json({ detail: issues });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        displayName,
        bio,
        favoriteTopic,
        favoritePlatform,
        avatarUrl: avatarUrl || req.user.avatarUrl,
        leetcodeHandle,
        codeforcesHandle,
        codechefHandle,
        atcoderHandle,
      },
    });

    res.json(serializeUser(updated));
  } catch (error) {
    res.status(500).json({ detail: 'Failed to update the profile.' });
  }
});

// GET /api/autocomplete/users
authRouter.get('/api/autocomplete/users', requireAuth, (req, res) => {
  const query = req.query.q;
  if (typeof query !== 'string') {
    return res.status(422).json({ detail: [validationIssue('query', 'q', 'String should have at least 1 character.')] });
  }
  const cleanQ = query.trim().replace(/^@/, '');
  if (!cleanQ) {
    return res.status(422).json({ detail: [validationIssue('query', 'q', 'String should have at least 1 character.')] });
  }
  res.json(usernameTrie.search(cleanQ, 10));
});

// GET /api/autocomplete/problems
authRouter.get('/api/autocomplete/problems', requireAuth, (req, res) => {
  const query = req.query.q;
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(422).json({ detail: [validationIssue('query', 'q', 'String should have at least 1 character.')] });
  }
  res.json(problemTrie.search(query.trim(), 10));
});
