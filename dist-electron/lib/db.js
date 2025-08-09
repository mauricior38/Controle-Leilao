"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// electron/lib/db.ts
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const dbPath = path_1.default.resolve(__dirname, "../../data.db"); // mesma base para ambos
const db = new better_sqlite3_1.default(dbPath);
exports.default = db;
