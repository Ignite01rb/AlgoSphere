import { prisma } from './db';
import { hashPassword } from './password';
import { getProblemSignature } from '../services/scraper';

export async function seedDatabase() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return;
  }

  const passwordHash = await hashPassword('AlgoSphere!123');
  const now = new Date();

  const seedUsers = [
    { username: 'alex', displayName: 'Alex Rivera', bio: 'Obsessed with contest prep and clean implementations.', favoriteTopic: 'graphs', favoritePlatform: 'Codeforces' },
    { username: 'maya', displayName: 'Maya Chen', bio: 'Patterns, interview prep, and weekly mock rounds.', favoriteTopic: 'dynamic programming', favoritePlatform: 'LeetCode' },
    { username: 'joe', displayName: 'Joe Park', bio: 'Prefers tricky math problems and fast submissions.', favoriteTopic: 'math', favoritePlatform: 'AtCoder' },
    { username: 'kim', displayName: 'Kim Reyes', bio: 'Greedy proofs, editorial dives, and hard trees.', favoriteTopic: 'trees', favoritePlatform: 'Codeforces' },
    { username: 'sam', displayName: 'Sam Okonkwo', bio: 'Grinding arrays, hashes, and interview simulations.', favoriteTopic: 'arrays', favoritePlatform: 'LeetCode' },
    { username: 'lee', displayName: 'Lee Tanaka', bio: 'Low-noise builder. Loves implementation-heavy tasks.', favoriteTopic: 'implementation', favoritePlatform: 'CodeChef' },
    { username: 'nina', displayName: 'Nina Volkov', bio: 'Weekend contests and graph traversals.', favoriteTopic: 'graphs', favoritePlatform: 'AtCoder' },
    { username: 'chris', displayName: 'Chris Moreau', bio: 'Systematic about mediums, ruthless on easy bugs.', favoriteTopic: 'strings', favoritePlatform: 'HackerRank' },
    { username: 'pat', displayName: 'Pat Singh', bio: 'Time-boxed practice and accuracy tracking.', favoriteTopic: 'greedy', favoritePlatform: 'CodeChef' },
    { username: 'dan', displayName: 'Dan Kowalski', bio: 'Focuses on hard interviews and binary-search variants.', favoriteTopic: 'binary search', favoritePlatform: 'LeetCode' },
    { username: 'eli', displayName: 'Eli Torres', bio: 'Loves studying official editorials after contests.', favoriteTopic: 'dfs', favoritePlatform: 'GeeksForGeeks' },
    { username: 'rue', displayName: 'Rue Martin', bio: 'Alternates between ladders, mocks, and flash practice.', favoriteTopic: 'bitmasks', favoritePlatform: 'Coder' },
  ];

  const createdUsers: Record<string, any> = {};

  for (const user of seedUsers) {
    const created = await prisma.user.create({
      data: {
        email: `${user.username}@example.com`,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        favoriteTopic: user.favoriteTopic,
        favoritePlatform: user.favoritePlatform,
        avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.username)}`,
        passwordHash,
        authProvider: 'local',
        createdAt: now,
      },
    });
    createdUsers[user.username] = created;
  }

  const alex = createdUsers['alex'];
  const friendUsernames = ['maya', 'joe', 'sam', 'chris', 'eli'];
  for (const fUsername of friendUsernames) {
    const friend = createdUsers[fUsername];
    await prisma.friendship.createMany({
      data: [
        { userId: alex.id, friendId: friend.id, status: 'accepted', createdAt: now },
        { userId: friend.id, friendId: alex.id, status: 'accepted', createdAt: now },
      ],
    });
  }

  const squadsData = [
    { name: 'Interview Sprint', owner: 'alex', members: ['alex', 'maya', 'sam', 'chris', 'pat'] },
    { name: 'Graphs After Dark', owner: 'alex', members: ['alex', 'nina', 'eli', 'kim'] },
    { name: 'Weekend Contest Crew', owner: 'alex', members: ['alex', 'joe', 'lee', 'nina', 'rue'] },
    { name: 'DP Study Hall', owner: 'alex', members: ['alex', 'maya', 'joe', 'dan'] },
    { name: 'Implementation Ladder', owner: 'alex', members: ['alex', 'kim', 'lee', 'pat', 'rue'] },
  ];

  const createdGroups: Record<string, any> = {};

  for (const squad of squadsData) {
    const group = await prisma.group.create({
      data: {
        name: squad.name,
        ownerId: createdUsers[squad.owner].id,
        createdAt: now,
      },
    });
    createdGroups[squad.name] = group;

    for (const memUsername of squad.members) {
      await prisma.groupMembership.create({
        data: {
          groupId: group.id,
          userId: createdUsers[memUsername].id,
          role: memUsername === squad.owner ? 'owner' : 'member',
          createdAt: now,
        },
      });
    }
  }

  const seededProblems = [
    { groupName: 'Interview Sprint', username: 'alex', problem: { url: 'https://leetcode.com/problems/two-sum/', platform: 'leetcode', problemId: 'two-sum', title: 'Two Sum', contest: 'LeetCode Top Interview 150', tags: 'arrays,hashing', difficulty: 'Easy', solvedByCount: 5938247 } },
    { groupName: 'Interview Sprint', username: 'maya', problem: { url: 'https://www.hackerrank.com/challenges/ctci-array-left-rotation/problem', platform: 'hackerrank', problemId: 'ctci-array-left-rotation', title: 'Array Left Rotation', contest: 'Cracking the Coding Interview', tags: 'arrays,rotation', difficulty: 'Easy', solvedByCount: 925441 } },
    { groupName: 'Graphs After Dark', username: 'nina', problem: { url: 'https://leetcode.com/problems/number-of-islands/', platform: 'leetcode', problemId: 'number-of-islands', title: 'Number of Islands', contest: 'LeetCode Graph Theory', tags: 'graphs,dfs,bfs,matrix', difficulty: 'Medium', solvedByCount: 1902478 } },
    { groupName: 'Graphs After Dark', username: 'eli', problem: { url: 'https://www.geeksforgeeks.org/problems/count-pairs-with-given-sum', platform: 'geeksforgeeks', problemId: 'count-pairs-with-given-sum', title: 'Count Pairs With Given Sum', contest: 'GeeksForGeeks Practice', tags: 'arrays,hashing', difficulty: 'Medium', solvedByCount: 158230 } },
    { groupName: 'Weekend Contest Crew', username: 'joe', problem: { url: 'https://codeforces.com/problemset/problem/4/A', platform: 'codeforces', problemId: '4A', title: 'Watermelon', contest: 'Codeforces Beta Round 4', tags: 'math,bruteforce', difficulty: 'Easy', solvedByCount: 514287 } },
    { groupName: 'Weekend Contest Crew', username: 'lee', problem: { url: 'https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/FLOW001', platform: 'codechef', problemId: 'FLOW001', title: 'Add Two Numbers', contest: 'CodeChef Practice', tags: 'implementation,ad-hoc', difficulty: 'Easy', solvedByCount: 371104 } },
    { groupName: 'Weekend Contest Crew', username: 'rue', problem: { url: 'https://coderbyte.com/challenges/sum-of-primes', platform: 'coder', problemId: 'sum-of-primes', title: 'Sum of Primes', contest: 'Coder Sprint', tags: 'math,sieve,number-theory', difficulty: 'Medium', solvedByCount: 84210 } },
    { groupName: 'DP Study Hall', username: 'maya', problem: { url: 'https://atcoder.jp/contests/dp/tasks/dp_a', platform: 'atcoder', problemId: 'dp_a', title: 'Frog 1', contest: 'Educational DP Contest', tags: 'dynamic-programming', difficulty: 'Easy', solvedByCount: 241221 } },
    { groupName: 'DP Study Hall', username: 'dan', problem: { url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', platform: 'leetcode', problemId: 'binary-tree-maximum-path-sum', title: 'Binary Tree Maximum Path Sum', contest: 'LeetCode Trees', tags: 'trees,dfs,dynamic-programming', difficulty: 'Hard', solvedByCount: 681223 } },
    { groupName: 'Implementation Ladder', username: 'kim', problem: { url: 'https://codeforces.com/problemset/problem/71/A', platform: 'codeforces', problemId: '71A', title: 'Way Too Long Words', contest: 'Codeforces Beta Round 71', tags: 'strings,implementation', difficulty: 'Easy', solvedByCount: 662904 } },
    { groupName: 'Implementation Ladder', username: 'pat', problem: { url: 'https://www.codechef.com/practice/course/basic-programming-concepts/DIFF500/problems/START01', platform: 'codechef', problemId: 'START01', title: 'Number Mirror', contest: 'CodeChef Beginner', tags: 'basics,io', difficulty: 'Easy', solvedByCount: 294417 } },
    { groupName: 'Implementation Ladder', username: 'alex', problem: { url: 'https://leetcode.com/problems/lru-cache/', platform: 'leetcode', problemId: 'lru-cache', title: 'LRU Cache', contest: 'LeetCode System Design', tags: 'design,hashing,linked-list', difficulty: 'Medium', solvedByCount: 1398421 } },
  ];

  for (let i = 0; i < seededProblems.length; i++) {
    const seeded = seededProblems[i];
    const sharedAt = new Date(now.getTime() - i * 7 * 60 * 60 * 1000);
    const sig = getProblemSignature(seeded.problem.platform, seeded.problem.title, seeded.problem.problemId);

    await prisma.problemShare.create({
      data: {
        groupId: createdGroups[seeded.groupName].id,
        sharedById: createdUsers[seeded.username].id,
        platform: seeded.problem.platform,
        problemUrl: seeded.problem.url,
        platformProblemId: seeded.problem.problemId,
        title: seeded.problem.title,
        contest: seeded.problem.contest,
        tags: seeded.problem.tags,
        difficulty: seeded.problem.difficulty,
        solvedByCount: seeded.problem.solvedByCount,
        problemSignature: sig,
        sharedAt,
      },
    });
  }
}
