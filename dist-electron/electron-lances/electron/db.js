"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Cria pasta `data` se não existir
const dbPath = path_1.default.join(__dirname, "..", "data");
if (!fs_1.default.existsSync(dbPath))
    fs_1.default.mkdirSync(dbPath);
const db = new better_sqlite3_1.default(path_1.default.join(dbPath, "database.db"));
// ✅ Cria tabela se não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    data TEXT NOT NULL,
    descricao TEXT
  )
`).run();
exports.default = db;
