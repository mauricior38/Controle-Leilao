"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarGCsPorEvento = listarGCsPorEvento;
exports.criarGC = criarGC;
exports.atualizarGC = atualizarGC;
exports.excluirGC = excluirGC;
exports.definirGCNoAr = definirGCNoAr;
exports.obterGCNoAr = obterGCNoAr;
// ✅ electron/services/gcService.ts
const db_1 = __importDefault(require("../lib/db"));
function listarGCsPorEvento(eventoId) {
    const stmt = db_1.default.prepare("SELECT * FROM gc_duas_linhas WHERE evento_id = ?");
    return stmt.all(eventoId);
}
function criarGC(gc) {
    const stmt = db_1.default.prepare(`
    INSERT INTO gc_duas_linhas (evento_id, nome, cargo)
    VALUES (?, ?, ?)
  `);
    const result = stmt.run(gc.evento_id, gc.nome, gc.cargo);
    return result.lastInsertRowid;
}
function atualizarGC(id, dados) {
    const stmt = db_1.default.prepare(`UPDATE gc_duas_linhas SET nome = ?, cargo = ? WHERE id = ?`);
    stmt.run(dados.nome, dados.cargo, id);
}
function excluirGC(id) {
    const stmt = db_1.default.prepare("DELETE FROM gc_duas_linhas WHERE id = ?");
    stmt.run(id);
}
// Define o GC "no ar"
function definirGCNoAr(eventoId, gcId) {
    // Remove existente
    db_1.default.prepare("DELETE FROM gc_duas_linhas_no_ar WHERE evento_id = ?").run(eventoId);
    // Insere novo
    db_1.default.prepare("INSERT INTO gc_duas_linhas_no_ar (evento_id, gc_id) VALUES (?, ?)").run(eventoId, gcId);
}
// Busca o GC "no ar"
function obterGCNoAr(eventoId) {
    const row = db_1.default.prepare(`
    SELECT g.id, g.evento_id, g.nome, g.cargo
    FROM gc_duas_linhas_no_ar n
    JOIN gc_duas_linhas g ON g.id = n.gc_id
    WHERE n.evento_id = ?
    LIMIT 1
  `).get(eventoId);
    return row ? row : null;
}
