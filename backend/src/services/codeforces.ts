import axios from 'axios';

export interface CodeforcesProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

export async function fetchProblems(
  tags: string[],
  minRating: number | null,
  maxRating: number | null
): Promise<CodeforcesProblem[]> {
  const url = 'https://codeforces.com/api/problemset.problems';
  const params: Record<string, string> = {};
  if (tags.length > 0) {
    params.tags = tags.join(';');
  }

  try {
    const response = await axios.get(url, { params, timeout: 15000 });
    const payload = response.data;
    if (payload.status !== 'OK') {
      throw new Error(payload.comment || 'Codeforces API returned error status.');
    }

    const rawProblems = payload.result.problems || [];
    const problems: CodeforcesProblem[] = [];

    for (const raw of rawProblems) {
      if (raw.rating === undefined || raw.rating === null) {
        continue;
      }
      if (minRating !== null && raw.rating < minRating) {
        continue;
      }
      if (maxRating !== null && raw.rating > maxRating) {
        continue;
      }

      problems.push({
        contestId: raw.contestId,
        index: raw.index,
        name: raw.name,
        rating: raw.rating,
        tags: raw.tags || [],
      });
    }

    return problems;
  } catch (error: any) {
    throw new Error(`Failed to load problems from Codeforces API: ${error.message}`);
  }
}

export function pickRandomProblems(problems: CodeforcesProblem[], count: number): CodeforcesProblem[] {
  if (problems.length <= count) {
    return [...problems];
  }
  const shuffled = [...problems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
