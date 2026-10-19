import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuestion extends Document {
  text: string;
  options: string[];
  correct: number;
  createdAt: Date;
}

export interface IGame extends Document {
  pin: string;
  totalMinutes: number;
  secondsPerQuestion: number;
  questionsPerStudent: number;
  status: "lobby" | "running" | "ended";
  joinOpen: boolean;
  startedAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
}

export interface IPlayerQuestion {
  questionId: string;
  text: string;
  options: string[];
  correct: number;
}

export interface IPlayerAnswer {
  questionNumber: number;
  chosen: number | null;
  isCorrect: boolean;
  timeTaken: number;
  points: number;
  answeredAt: Date;
}

export interface IPlayer extends Document {
  name: string;
  roll: string;
  token: string;
  questions: IPlayerQuestion[];
  currentQuestion: number;
  currentQuestionStartedAt: Date | null;
  score: number;
  correct: number;
  totalTime: number;
  tabSwitches: number;
  finished: boolean;
  answers: IPlayerAnswer[];
  createdAt: Date;
}

// Question Schema
const QuestionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length === 4, "Must have exactly 4 options"],
    },
    correct: { type: Number, required: true, min: 0, max: 3 },
  },
  { timestamps: true }
);

// Game Schema (Single configuration document)
const GameSchema = new Schema<IGame>(
  {
    pin: { type: String, default: "1234", maxlength: 20 },
    totalMinutes: { type: Number, default: 30, min: 1, max: 240 },
    secondsPerQuestion: { type: Number, default: 15, min: 5, max: 180 },
    questionsPerStudent: { type: Number, default: 20, min: 1, max: 100 },
    status: {
      type: String,
      enum: ["lobby", "running", "ended"],
      default: "lobby",
    },
    joinOpen: { type: Boolean, default: true },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Player Schema
const PlayerSchema = new Schema<IPlayer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    roll: { type: String, required: true, trim: true, maxlength: 30 },
    token: { type: String, required: true, unique: true, index: true },
    questions: [
      {
        questionId: String,
        text: String,
        options: [String],
        correct: Number,
      },
    ],
    currentQuestion: { type: Number, default: 0 },
    currentQuestionStartedAt: { type: Date, default: null },
    score: { type: Number, default: 0, index: true },
    correct: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
    answers: [
      {
        questionNumber: Number,
        chosen: { type: Number, default: null },
        isCorrect: { type: Boolean, default: false },
        timeTaken: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        answeredAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Compound index for fast leaderboard ordering
PlayerSchema.index({ score: -1, totalTime: 1 });
PlayerSchema.index({ roll: 1 });

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);

export const Game: Model<IGame> =
  mongoose.models.Game || mongoose.model<IGame>("Game", GameSchema);

export const Player: Model<IPlayer> =
  mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);
