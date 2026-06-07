import { Trie } from './trie';
import { prisma } from './db';

export const usernameTrie = new Trie();
export const problemTrie = new Trie();
const usernameSet = new Set<string>();

export function loadUsernames(usernames: string[]) {
  for (const u of usernames) {
    usernameTrie.insert(u);
    usernameSet.add(u.toLowerCase());
  }
}

export function addUsername(username: string) {
  usernameTrie.insert(username);
  usernameSet.add(username.toLowerCase());
}

export function usernameMayExist(username: string): boolean {
  return usernameSet.has(username.toLowerCase());
}

export function loadProblemTitles(titles: string[]) {
  for (const t of titles) {
    problemTrie.insert(t);
  }
}

export function addProblemTitle(title: string) {
  problemTrie.insert(title);
}

export async function initSearchIndex() {
  const users = await prisma.user.findMany({
    select: { username: true },
    orderBy: { username: 'asc' },
  });
  loadUsernames(users.map(u => u.username));

  const problems = await prisma.problemShare.findMany({
    select: { title: true },
    distinct: ['title'],
    orderBy: { title: 'asc' },
  });
  loadProblemTitles(problems.map(p => p.title));
}
