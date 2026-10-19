/**
 * Pure business logic for Tech Trivia:
 * Timing, scoring, question selection, option shuffling, and CSV sanitization.
 * No database dependencies here for testability and portability.
 */

export interface RawQuestion {
  _id?: any;
  text: string;
  options: string[];
  correct: number;
}

export interface PreparedQuestion {
  questionId: string;
  text: string;
  options: string[];
  correct: number; // Stored securely on server only!
}

/**
 * Fisher-Yates array shuffle (immutable)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects random questions for a player and shuffles the 4 options,
 * re-mapping the correct index accordingly.
 */
export function preparePlayerQuestions(
  pool: RawQuestion[],
  count: number
): PreparedQuestion[] {
  if (!pool || pool.length === 0) return [];

  // Shuffle entire question pool and pick 'count' questions
  const shuffledPool = shuffle(pool).slice(0, Math.min(count, pool.length));

  return shuffledPool.map((q, idx) => {
    const originalOptions = q.options;
    const correctText = originalOptions[q.correct] ?? originalOptions[0];

    // Create an indexed array of options to shuffle
    const indices = [0, 1, 2, 3];
    const shuffledIndices = shuffle(indices);
    const shuffledOptions = shuffledIndices.map((i) => originalOptions[i]);

    // Find new position of the correct answer
    const newCorrectIndex = shuffledOptions.findIndex((opt) => opt === correctText);

    return {
      questionId: String(q._id ?? `q_${idx}_${Date.now()}`),
      text: q.text,
      options: shuffledOptions,
      correct: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    };
  });
}

/**
 * Scoring rule per PDF:
 * - Correct answer: 500 to 1000 points.
 * - Answering instantly gives ~1000, answering at the last second gives ~500.
 * - Wrong answer or no answer: 0 points.
 */
export function calculateScore(
  timeTakenSec: number,
  secondsPerQuestion: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  const safeTimeLimit = Math.max(1, secondsPerQuestion);
  const ratio = Math.max(0, Math.min(1, timeTakenSec / safeTimeLimit));
  const points = Math.round(1000 - 500 * ratio);
  return Math.max(500, Math.min(1000, points));
}

/**
 * Security rule per PDF:
 * Exported names beginning with =, +, - or @ get a leading apostrophe
 * so Excel/Google Sheets cannot run them as formulas.
 */
export function sanitizeCsvFormula(str: string): string {
  if (!str) return "";
  const first = str.charAt(0);
  if (first === "=" || first === "+" || first === "-" || first === "@") {
    return `'${str}`;
  }
  return str;
}
