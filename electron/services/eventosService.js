"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarTabelaEventos = criarTabelaEventos;
exports.inserirEvento = inserirEvento;
exports.listarEventos = listarEventos;
exports.deletarEvento = deletarEvento;
exports.getEventoPorId = getEventoPorId;
// src/features/eventos/services/eventosService.ts
const db_1 = __importDefault(require("../../electron/lib/db"));
function criarTabelaEventos() {
    db_1.default.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data TEXT NOT NULL,
      descricao TEXT
    )
  `).run();
}
function inserirEvento(nome, data, descricao) {
    const stmt = db_1.default.prepare("INSERT INTO eventos (nome, data, descricao) VALUES (?, ?, ?)");
    stmt.run(nome, data.toISOString(), descricao || null);
}
function listarEventos() {
    return db_1.default.prepare("SELECT * FROM eventos ORDER BY datetime(data) DESC").all();
}
function deletarEvento(id) {
    const stmt = db_1.default.prepare("DELETE FROM eventos WHERE id = ?");
    stmt.run(id);
}
function getEventoPorId(id) {
    const stmt = db_1.default.prepare("SELECT * FROM eventos WHERE id = ?");
    const evento = stmt.get(id);
    if (!evento)
        return null;
    return evento;
}
// src/services/eventosService.ts
