import { connectDB } from "./db";
import { Game, IGame, Player, IPlayer, Question, IQuestion } from "./models";
import {
  preparePlayerQuestions,
  calculateScore,
  sanitizeCsvFormula,
  RawQuestion,
} from "./logic";
import { signStudentToken } from "./auth";

// --- IN-MEMORY CACHE (PDF Section 6 & 8: High Traffic Performance) ---
interface LeaderboardCache {
  data: any;
  timestamp: number;
}

interface GlobalTechTrivia {
  cachedLeaderboard: LeaderboardCache | null;
  cachedGame: { game: any; timestamp: number } | null;
  cachedQuestionsPool: Array<RawQuestion & { _id: string }> | null;
  cachedQuestionCount: number | null;
  memoryStore: {
    game: {
      pin: string;
      totalMinutes: number;
      secondsPerQuestion: number;
      questionsPerStudent: number;
      status: "lobby" | "running" | "ended";
      joinOpen: boolean;
      startedAt: Date | null;
      endsAt: Date | null;
      updatedAt: Date;
    };
    questions: Array<RawQuestion & { _id: string }>;
    players: Map<string, any>;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __techTriviaGlobal: GlobalTechTrivia | undefined;
}

if (!globalThis.__techTriviaGlobal) {
  globalThis.__techTriviaGlobal = {
    cachedLeaderboard: null,
    cachedGame: null,
    cachedQuestionsPool: null,
    cachedQuestionCount: null,
    memoryStore: {
      game: {
        pin: "1234",
        totalMinutes: 30,
        secondsPerQuestion: 15,
        questionsPerStudent: 20,
        status: "lobby",
        joinOpen: true,
        startedAt: null,
        endsAt: null,
        updatedAt: new Date(),
      },
      questions: [],
      players: new Map(),
    },
  };
}

const tt = globalThis.__techTriviaGlobal;
const memoryStore = tt.memoryStore;
const LEADERBOARD_CACHE_TTL = 2000;
const GAME_CACHE_TTL = 2000;

export function invalidateLeaderboardCache() {
  tt.cachedLeaderboard = null;
}

export function invalidateGameCache() {
  tt.cachedGame = null;
}

/**
 * Check if MongoDB is available or if fallback memory store should be used.
 */
async function hasDb(): Promise<boolean> {
  try {
    const conn = await connectDB();
    return !!conn;
  } catch (err) {
    console.warn("[DB] MongoDB connection unavailable, using in-memory store", err);
    return false;
  }
}

/**
 * Get the Game configuration document, ensuring it exists.
 * Automatically marks game as ended if current time passed endsAt.
 */
export async function getGame(): Promise<IGame | typeof memoryStore.game> {
  const now = Date.now();
  if (tt.cachedGame && now - tt.cachedGame.timestamp < GAME_CACHE_TTL && tt.cachedGame.game) {
    const g = tt.cachedGame.game;
    if (g.status === "running" && g.endsAt && now >= new Date(g.endsAt).getTime()) {
      g.status = "ended";
    }
    return g;
  }

  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    const g = memoryStore.game;
    if (g.status === "running" && g.endsAt && now >= g.endsAt.getTime()) {
      g.status = "ended";
    }
    return g;
  }

  let gameDoc = await Game.findOne();
  if (!gameDoc) {
    gameDoc = await Game.create({
      pin: "1234",
      totalMinutes: 30,
      secondsPerQuestion: 15,
      questionsPerStudent: 20,
      status: "lobby",
      joinOpen: true,
      startedAt: null,
      endsAt: null,
    });
  }

  if (gameDoc.status === "running" && gameDoc.endsAt && now >= gameDoc.endsAt.getTime()) {
    gameDoc.status = "ended";
    await gameDoc.save();
  }

  tt.cachedGame = { game: gameDoc, timestamp: now };
  return gameDoc;
}

/**
 * Update game settings (PIN, duration, timers, questions per student)
 */
export async function updateGameSettings(settings: {
  pin?: string;
  totalMinutes?: number;
  secondsPerQuestion?: number;
  questionsPerStudent?: number;
}) {
  invalidateGameCache();
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    if (settings.pin !== undefined) memoryStore.game.pin = settings.pin.trim().slice(0, 20);
    if (settings.totalMinutes !== undefined)
      memoryStore.game.totalMinutes = Math.max(1, Math.min(240, Number(settings.totalMinutes)));
    if (settings.secondsPerQuestion !== undefined)
      memoryStore.game.secondsPerQuestion = Math.max(5, Math.min(180, Number(settings.secondsPerQuestion)));
    if (settings.questionsPerStudent !== undefined)
      memoryStore.game.questionsPerStudent = Math.max(1, Math.min(100, Number(settings.questionsPerStudent)));
    return memoryStore.game;
  }

  const game = await getGame();
  if ("save" in game) {
    if (settings.pin !== undefined) game.pin = settings.pin.trim().slice(0, 20);
    if (settings.totalMinutes !== undefined)
      game.totalMinutes = Math.max(1, Math.min(240, Number(settings.totalMinutes)));
    if (settings.secondsPerQuestion !== undefined)
      game.secondsPerQuestion = Math.max(5, Math.min(180, Number(settings.secondsPerQuestion)));
    if (settings.questionsPerStudent !== undefined)
      game.questionsPerStudent = Math.max(1, Math.min(100, Number(settings.questionsPerStudent)));
    await (game as any).save();
    invalidateGameCache();
    return game;
  }
}

/**
 * Start the game
 */
export async function startGame() {
  const now = new Date();
  const game = await getGame();
  const endsAt = new Date(now.getTime() + game.totalMinutes * 60 * 1000);

  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    memoryStore.game.status = "running";
    memoryStore.game.startedAt = now;
    memoryStore.game.endsAt = endsAt;
    invalidateGameCache();
    invalidateLeaderboardCache();
    return memoryStore.game;
  }

  const doc = await Game.findOne();
  if (doc) {
    doc.status = "running";
    doc.startedAt = now;
    doc.endsAt = endsAt;
    await doc.save();
    invalidateGameCache();
    invalidateLeaderboardCache();
    return doc;
  }
}

/**
 * Extend the game time by minutes (+2 or +5)
 */
export async function extendGame(minutes: number) {
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    if (memoryStore.game.endsAt) {
      memoryStore.game.endsAt = new Date(
        memoryStore.game.endsAt.getTime() + minutes * 60 * 1000
      );
    }
    invalidateGameCache();
    invalidateLeaderboardCache();
    return memoryStore.game;
  }

  const doc = await Game.findOne();
  if (doc && doc.endsAt) {
    doc.endsAt = new Date(doc.endsAt.getTime() + minutes * 60 * 1000);
    await doc.save();
    invalidateGameCache();
    invalidateLeaderboardCache();
    return doc;
  }
}

/**
 * End the game now
 */
export async function endGame() {
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    memoryStore.game.status = "ended";
    memoryStore.game.endsAt = new Date();
    invalidateGameCache();
    invalidateLeaderboardCache();
    return memoryStore.game;
  }

  const doc = await Game.findOne();
  if (doc) {
    doc.status = "ended";
    doc.endsAt = new Date();
    await doc.save();
    invalidateGameCache();
    invalidateLeaderboardCache();
    return doc;
  }
}

/**
 * Toggle or set join open/close
 */
export async function setJoinOpen(open: boolean) {
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    memoryStore.game.joinOpen = open;
    invalidateGameCache();
    return memoryStore.game;
  }

  const doc = await Game.findOne();
  if (doc) {
    doc.joinOpen = open;
    await doc.save();
    invalidateGameCache();
    return doc;
  }
}

/**
 * Reset game: clears all players, keeps questions, resets to lobby
 */
export async function resetGame() {
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    memoryStore.players.clear();
    memoryStore.game.status = "lobby";
    memoryStore.game.startedAt = null;
    memoryStore.game.endsAt = null;
    invalidateGameCache();
    invalidateLeaderboardCache();
    return;
  }

  await Player.deleteMany({});
  const doc = await Game.findOne();
  if (doc) {
    doc.status = "lobby";
    doc.startedAt = null;
    doc.endsAt = null;
    await doc.save();
    invalidateGameCache();
    invalidateLeaderboardCache();
  }
}

/**
 * Invalidate cached question pool
 */
export function invalidateQuestionCache() {
  tt.cachedQuestionsPool = null;
  tt.cachedQuestionCount = null;
}

/**
 * Get Question Pool (with in-memory cache to prevent repeated MongoDB scans)
 */
export async function getQuestionPool(): Promise<Array<RawQuestion & { _id: string }>> {
  if (tt.cachedQuestionsPool && tt.cachedQuestionsPool.length > 0) {
    return tt.cachedQuestionsPool;
  }
  const dbAvailable = await hasDb();
  if (dbAvailable) {
    const docs = await Question.find({});
    const pool = docs.map((q) => ({
      _id: String(q._id),
      text: q.text,
      options: q.options,
      correct: q.correct,
    }));
    tt.cachedQuestionsPool = pool;
    tt.cachedQuestionCount = pool.length;
    return pool;
  }
  return memoryStore.questions;
}

/**
 * Import questions into the question pool
 */
export async function importQuestions(
  questions: Array<{ text: string; options: string[]; correct: number }>,
  mode: "add" | "replace" = "add"
) {
  invalidateQuestionCache();
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    if (mode === "replace") {
      memoryStore.questions = [];
    }
    const prepared = questions.map((q, i) => ({
      ...q,
      _id: `mem_q_${Date.now()}_${i}`,
    }));
    memoryStore.questions.push(...prepared);
    tt.cachedQuestionsPool = memoryStore.questions;
    tt.cachedQuestionCount = memoryStore.questions.length;
    return { added: prepared.length, total: memoryStore.questions.length };
  }

  if (mode === "replace") {
    await Question.deleteMany({});
  }
  const inserted = await Question.insertMany(questions);
  const total = await Question.countDocuments();
  invalidateQuestionCache();
  return { added: inserted.length, total };
}

/**
 * Get question count and optionally list
 */
export async function getQuestions(includeList = false) {
  if (!includeList && tt.cachedQuestionCount !== null) {
    return { count: tt.cachedQuestionCount };
  }
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    return { count: memoryStore.questions.length, questions: includeList ? memoryStore.questions : undefined };
  }
  const count = await Question.countDocuments();
  tt.cachedQuestionCount = count;
  const questions = includeList ? await Question.find({}, { text: 1, options: 1, correct: 1 }).limit(100) : undefined;
  return { count, questions };
}

/**
 * Clear all questions
 */
export async function clearQuestions() {
  invalidateQuestionCache();
  const dbAvailable = await hasDb();
  if (!dbAvailable) {
    memoryStore.questions = [];
    return;
  }
  await Question.deleteMany({});
}

/**
 * Student join handler
 * PDF: One roll number = one player. Joining again with same roll is blocked,
 * unless it is the same device returning after a refresh.
 */
export async function joinStudent(name: string, roll: string, pin: string, existingToken?: string) {
  const game = await getGame();
  const trimmedPin = pin.trim();
  const trimmedRoll = roll.trim().toUpperCase();
  const trimmedName = name.trim();

  if (game.pin && trimmedPin !== game.pin) {
    throw new Error("Invalid Game PIN. Please check the screen and try again.");
  }

  if (game.status === "ended") {
    throw new Error("This game has already ended.");
  }

  if (!game.joinOpen) {
    throw new Error("Joining is currently closed by the administrator.");
  }

  const dbAvailable = await hasDb();

  // Check if player with this roll number already joined
  if (dbAvailable) {
    const existing = await Player.findOne({ roll: trimmedRoll });
    if (existing) {
      if (existingToken && existing.token === existingToken) {
        return { token: existing.token };
      }
      throw new Error("This roll number has already joined the game on another device.");
    }

    // Get question pool from in-memory cache or DB
    const pool = await getQuestionPool();
    if (pool.length === 0) {
      throw new Error("The quiz has not been loaded with questions yet. Please wait for the admin.");
    }

    const assignedQuestions = preparePlayerQuestions(
      pool,
      game.questionsPerStudent
    );

    const token = signStudentToken({ roll: trimmedRoll, name: trimmedName });

    const newPlayer = await Player.create({
      name: trimmedName,
      roll: trimmedRoll,
      token,
      questions: assignedQuestions,
      currentQuestion: 0,
      currentQuestionStartedAt: null,
      score: 0,
      correct: 0,
      totalTime: 0,
      tabSwitches: 0,
      finished: false,
      answers: [],
    });

    invalidateLeaderboardCache();
    return { token: newPlayer.token };
  } else {
    // Memory store fallback
    for (const [, p] of memoryStore.players) {
      if (p.roll === trimmedRoll) {
        if (existingToken && p.token === existingToken) {
          return { token: p.token };
        }
        throw new Error("This roll number has already joined the game on another device.");
      }
    }

    if (memoryStore.questions.length === 0) {
      throw new Error("The quiz has not been loaded with questions yet. Please wait for the admin.");
    }

    const assignedQuestions = preparePlayerQuestions(
      memoryStore.questions,
      game.questionsPerStudent
    );

    const token = signStudentToken({ roll: trimmedRoll, name: trimmedName });
    const newPlayer = {
      name: trimmedName,
      roll: trimmedRoll,
      token,
      questions: assignedQuestions,
      currentQuestion: 0,
      currentQuestionStartedAt: null,
      score: 0,
      correct: 0,
      totalTime: 0,
      tabSwitches: 0,
      finished: false,
      answers: [],
      createdAt: new Date(),
    };

    memoryStore.players.set(token, newPlayer);
    invalidateLeaderboardCache();
    return { token };
  }
}

/**
 * Calculate player's current rank
 */
async function getPlayerRank(playerScore: number, playerTotalTime: number, dbAvailable: boolean) {
  if (dbAvailable) {
    const higherCount = await Player.countDocuments({
      $or: [
        { score: { $gt: playerScore } },
        { score: playerScore, totalTime: { $lt: playerTotalTime } },
      ],
    });
    return higherCount + 1;
  } else {
    let rank = 1;
    for (const [, p] of memoryStore.players) {
      if (p.score > playerScore || (p.score === playerScore && p.totalTime < playerTotalTime)) {
        rank++;
      }
    }
    return rank;
  }
}

/**
 * Student /api/play state getter
 * Handles automatic timer progression, expiry, and question delivery
 */
export async function getPlayState(token: string) {
  const game = await getGame();
  const dbAvailable = await hasDb();

  let player: any = null;
  if (dbAvailable) {
    player = await Player.findOne({ token });
  } else {
    player = memoryStore.players.get(token);
  }

  if (!player) {
    return null; // 401
  }

  const now = Date.now();
  const gameEnded = game.status === "ended" || (game.endsAt && now >= new Date(game.endsAt).getTime());

  // Lobby phase
  if (game.status === "lobby") {
    return {
      phase: "lobby",
      gameStatus: "lobby",
      pin: game.pin,
    };
  }

  // Done phase (either player finished or game ended)
  if (player.finished || gameEnded) {
    const rank = await getPlayerRank(player.score, player.totalTime, dbAvailable);
    return {
      phase: "done",
      score: player.score,
      correct: player.correct,
      totalTime: Math.round(player.totalTime),
      rank,
      gameEnded,
    };
  }

  // Active question phase
  const idx = player.currentQuestion;
  if (idx >= player.questions.length) {
    player.finished = true;
    if (dbAvailable) await player.save();
    invalidateLeaderboardCache();
    const rank = await getPlayerRank(player.score, player.totalTime, dbAvailable);
    return {
      phase: "done",
      score: player.score,
      correct: player.correct,
      totalTime: Math.round(player.totalTime),
      rank,
    };
  }

  // If question timer not started yet, start it now
  if (!player.currentQuestionStartedAt) {
    player.currentQuestionStartedAt = new Date();
    if (dbAvailable) await player.save();
  }

  const startedAtMs = new Date(player.currentQuestionStartedAt).getTime();
  const questionDeadline = startedAtMs + game.secondsPerQuestion * 1000;
  const gameDeadline = game.endsAt ? new Date(game.endsAt).getTime() : questionDeadline;
  const deadline = Math.min(questionDeadline, gameDeadline);

  // If question timer expired (with 1.5s grace allowance)
  if (now > deadline + 1500) {
    // Question timed out: record as wrong/unanswered
    player.answers.push({
      questionNumber: idx + 1,
      chosen: null,
      isCorrect: false,
      timeTaken: game.secondsPerQuestion,
      points: 0,
      answeredAt: new Date(),
    });
    player.totalTime = Math.round((player.totalTime + game.secondsPerQuestion) * 10) / 10;
    player.currentQuestion += 1;
    player.currentQuestionStartedAt = null;

    if (player.currentQuestion >= player.questions.length) {
      player.finished = true;
    }

    if (dbAvailable) await player.save();
    invalidateLeaderboardCache();

    // Re-call to return next question or done state
    return getPlayState(token);
  }

  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const gameSecondsLeft = game.endsAt ? Math.max(0, Math.ceil((new Date(game.endsAt).getTime() - now) / 1000)) : 0;
  const currentQ = player.questions[idx];

  return {
    phase: "question",
    question: {
      number: idx + 1,
      total: player.questions.length,
      text: currentQ.text,
      options: currentQ.options,
      secondsLeft,
      secondsTotal: game.secondsPerQuestion,
    },
    gameSecondsLeft,
  };
}

/**
 * Record answer submitted by student
 */
export async function submitAnswer(token: string, questionNumber: number, chosenOption?: number | null) {
  const game = await getGame();
  const dbAvailable = await hasDb();

  let player: any = null;
  if (dbAvailable) {
    player = await Player.findOne({ token });
  } else {
    player = memoryStore.players.get(token);
  }

  if (!player) return null;
  if (player.finished) return { done: true };

  const currentIdx = player.currentQuestion;
  // If request doesn't match current question index, ignore safely (idempotent)
  if (questionNumber !== currentIdx + 1) {
    return { done: player.finished };
  }

  const now = Date.now();
  const startedAtMs = player.currentQuestionStartedAt
    ? new Date(player.currentQuestionStartedAt).getTime()
    : now;
  const elapsedSec = Math.max(0, (now - startedAtMs) / 1000);
  const maxAllowedSec = game.secondsPerQuestion + 1.5; // 1.5s network allowance

  const currentQ = player.questions[currentIdx];
  const chosen = typeof chosenOption === "number" ? chosenOption : null;

  let isCorrect = false;
  let points = 0;

  if (elapsedSec <= maxAllowedSec && chosen !== null && chosen === currentQ.correct) {
    isCorrect = true;
    points = calculateScore(elapsedSec, game.secondsPerQuestion, true);
  }

  const timeRecorded = Math.min(game.secondsPerQuestion, elapsedSec);

  player.score += points;
  if (isCorrect) player.correct += 1;
  player.totalTime = Math.round((player.totalTime + timeRecorded) * 10) / 10;
  player.answers.push({
    questionNumber: currentIdx + 1,
    chosen,
    isCorrect,
    timeTaken: Math.round(timeRecorded * 10) / 10,
    points,
    answeredAt: new Date(),
  });

  player.currentQuestion += 1;
  player.currentQuestionStartedAt = null;

  if (player.currentQuestion >= player.questions.length) {
    player.finished = true;
  }

  if (dbAvailable) {
    await player.save();
  }
  invalidateLeaderboardCache();

  return { done: player.finished };
}

/**
 * Anti-cheat flag tab switch
 */
export async function flagTabSwitch(token: string) {
  const dbAvailable = await hasDb();
  if (dbAvailable) {
    await Player.updateOne({ token }, { $inc: { tabSwitches: 1 } });
  } else {
    const p = memoryStore.players.get(token);
    if (p) p.tabSwitches = (p.tabSwitches || 0) + 1;
  }
}

/**
 * Leaderboard with 2-second server memory cache
 */
export async function getLeaderboard() {
  const now = Date.now();
  if (tt.cachedLeaderboard && now - tt.cachedLeaderboard.timestamp < LEADERBOARD_CACHE_TTL) {
    return tt.cachedLeaderboard.data;
  }

  const game = await getGame();
  const dbAvailable = await hasDb();

  let joined = 0;
  let finished = 0;
  let topPlayers: Array<{ name: string; score: number; rank?: number }> = [];

  if (dbAvailable) {
    joined = await Player.countDocuments();
    finished = await Player.countDocuments({ finished: true });
    const docs = await Player.find({}, { name: 1, score: 1, totalTime: 1 })
      .sort({ score: -1, totalTime: 1 })
      .limit(10);
    topPlayers = docs.map((d, i) => ({
      name: d.name,
      score: d.score,
      rank: i + 1,
    }));
  } else {
    const all = Array.from(memoryStore.players.values());
    joined = all.length;
    finished = all.filter((p) => p.finished).length;
    all.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });
    topPlayers = all.slice(0, 10).map((p, i) => ({
      name: p.name,
      score: p.score,
      rank: i + 1,
    }));
  }

  const result = {
    status: game.status,
    pin: game.pin,
    endsAt: game.endsAt ? new Date(game.endsAt).toISOString() : null,
    joined,
    finished,
    players: topPlayers,
  };

  tt.cachedLeaderboard = { data: result, timestamp: now };
  return result;
}

/**
 * Admin Game Overview
 */
export async function getAdminGameStatus() {
  const game = await getGame();
  const dbAvailable = await hasDb();

  let joined = 0;
  let finished = 0;
  if (dbAvailable) {
    joined = await Player.countDocuments();
    finished = await Player.countDocuments({ finished: true });
  } else {
    joined = memoryStore.players.size;
    finished = Array.from(memoryStore.players.values()).filter((p) => p.finished).length;
  }

  const now = Date.now();
  const secondsLeft =
    game.status === "running" && game.endsAt
      ? Math.max(0, Math.ceil((new Date(game.endsAt).getTime() - now) / 1000))
      : 0;

  return {
    status: game.status,
    pin: game.pin,
    totalMinutes: game.totalMinutes,
    secondsPerQuestion: game.secondsPerQuestion,
    questionsPerStudent: game.questionsPerStudent,
    joinOpen: game.joinOpen,
    startedAt: game.startedAt,
    endsAt: game.endsAt,
    joined,
    finished,
    secondsLeft,
  };
}

/**
 * Export results CSV
 * Format: Rank, Name, Roll, Score, Correct, Answered, TotalTimeSec, TabSwitches, Finished
 * Formula sanitization enabled.
 */
export async function generateResultsCsv(): Promise<string> {
  const dbAvailable = await hasDb();
  let players: any[] = [];

  if (dbAvailable) {
    players = await Player.find({}).sort({ score: -1, totalTime: 1 });
  } else {
    players = Array.from(memoryStore.players.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });
  }

  const headers = [
    "Rank",
    "Name",
    "Roll",
    "Score",
    "Correct",
    "Answered",
    "TotalTimeSec",
    "TabSwitches",
    "Finished",
  ];

  const rows = players.map((p, idx) => {
    const answeredCount = p.answers ? p.answers.length : 0;
    return [
      idx + 1,
      `"${sanitizeCsvFormula(p.name).replace(/"/g, '""')}"`,
      `"${sanitizeCsvFormula(p.roll).replace(/"/g, '""')}"`,
      p.score,
      p.correct,
      answeredCount,
      p.totalTime,
      p.tabSwitches || 0,
      p.finished ? "YES" : "NO",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}
