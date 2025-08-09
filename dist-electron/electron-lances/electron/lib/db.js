"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/lib/db.ts
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
// Usar pasta de dados do sistema operacional
const dbFolder = path_1.default.join(os_1.default.homedir(), ".electron-lances");
const dbPath = path_1.default.join(dbFolder, "eventos.db");
// Cria a pasta se não existir
if (!fs_1.default.existsSync(dbFolder)) {
    fs_1.default.mkdirSync(dbFolder);
}
const db = new better_sqlite3_1.default(dbPath);
exports.default = db;
