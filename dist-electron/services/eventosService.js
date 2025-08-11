"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarTabelaEventos = criarTabelaEventos;
exports.listarEventos = listarEventos;
exports.inserirEvento = inserirEvento;
exports.getEventoPorId = getEventoPorId;
exports.deletarEvento = deletarEvento;
exports.editarEvento = editarEvento;
exports.encerrarEvento = encerrarEvento;
exports.adicionarColunaCondicaoPagamentoPadrao = adicionarColunaCondicaoPagamentoPadrao;
exports.adicionarColunaGCLotesSeNaoExistir_safe = adicionarColunaGCLotesSeNaoExistir_safe;
exports.getStatusGCLotes = getStatusGCLotes;
exports.setStatusGCLotes = setStatusGCLotes;
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const dbPath = path_1.default.resolve(__dirname, "../../data.db");
const db = new better_sqlite3_1.default(dbPath);
function criarTabelaEventos() {
    db.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data TEXT NOT NULL,
      descricao TEXT,
      start_time TEXT,
      end_time TEXT,
      condicao_pagamento_padrao TEXT
    )
  `).run();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      lote TEXT NOT NULL,
      nome_animal TEXT NOT NULL,
      gira_1 TEXT,
      gira_2 TEXT,
      gira_3 TEXT,
      gira_4 TEXT,
      gira_5 TEXT,
      gira_6 TEXT,
      condicao_pagamento TEXT,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
      UNIQUE (evento_id, lote)
    )
  `).run();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS lote_em_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_evento INTEGER NOT NULL,
      id_lote INTEGER NOT NULL,
      valor INTEGER DEFAULT 0,
      FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (id_lote) REFERENCES lotes(id) ON DELETE CASCADE,
      UNIQUE (id_evento, id_lote)
    )
  `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lote_em_pista_evento ON lote_em_pista (id_evento)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lote_em_pista_lote ON lote_em_pista (id_lote)`).run();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS lances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_evento INTEGER NOT NULL,
      id_lote INTEGER NOT NULL,
      valor INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (id_lote) REFERENCES lotes(id) ON DELETE CASCADE
    )
  `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lances_evento ON lances (id_evento)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lances_lote ON lances (id_lote)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_lances_timestamp ON lances (timestamp)`).run();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS gc_duas_linhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      cargo TEXT NOT NULL
    )
  `).run();
    db.prepare(`
    CREATE TABLE IF NOT EXISTS gc_duas_linhas_no_ar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      gc_id INTEGER NOT NULL,
      FOREIGN KEY (gc_id) REFERENCES gc_duas_linhas(id)
    )
  `).run();
    // Coluna de status GC LOTES (on/off) no evento
    adicionarColunaGCLotesSeNaoExistir_safe();
}
function listarEventos() {
    return db.prepare(`SELECT * FROM eventos ORDER BY id ASC`).all();
}
function inserirEvento(nome, data, descricao, start_time, condicao_pagamento_padrao) {
    const isoData = data.toISOString();
    db.prepare(`INSERT INTO eventos (nome, data, descricao, start_time, condicao_pagamento_padrao)
     VALUES (?, ?, ?, ?, ?)`).run(nome, isoData, descricao ?? null, start_time ?? null, condicao_pagamento_padrao ?? null);
}
function getEventoPorId(id) {
    const evento = db.prepare("SELECT * FROM eventos WHERE id = ?").get(id);
    return evento ? evento : null;
}
function deletarEvento(id) {
    const result = db.prepare("DELETE FROM eventos WHERE id = ?").run(id);
    return result.changes > 0;
}
function editarEvento(id, nome, data, descricao) {
    db.prepare("UPDATE eventos SET nome = ?, data = ?, descricao = ? WHERE id = ?").run(nome, data, descricao || null, id);
}
function encerrarEvento(id, endTime) {
    db.prepare("UPDATE eventos SET end_time = ? WHERE id = ?").run(endTime, id);
}
function adicionarColunaCondicaoPagamentoPadrao() {
    try {
        db.prepare("SELECT condicao_pagamento_padrao FROM eventos LIMIT 1").get();
    }
    catch {
        db.prepare("ALTER TABLE eventos ADD COLUMN condicao_pagamento_padrao TEXT DEFAULT ''").run();
        console.log("✅ Coluna 'condicao_pagamento_padrao' adicionada à tabela eventos.");
    }
}
/** GC LOTES: coluna booleana no evento */
function adicionarColunaGCLotesSeNaoExistir_safe() {
    try {
        const cols = db.prepare("PRAGMA table_info(eventos)").all();
        const existe = cols.some((c) => c.name === "gc_lotes_on");
        if (!existe) {
            db.prepare("ALTER TABLE eventos ADD COLUMN gc_lotes_on INTEGER DEFAULT 0").run();
            console.log("✅ Coluna 'gc_lotes_on' criada em 'eventos'");
        }
    }
    catch (err) {
        console.error("Erro ao verificar/criar coluna gc_lotes_on:", err);
    }
}
function getStatusGCLotes(eventoId) {
    const row = db
        .prepare(`SELECT gc_lotes_on FROM eventos WHERE id = ?`)
        .get(eventoId);
    return row?.gc_lotes_on === 1;
}
function setStatusGCLotes(eventoId, on) {
    db.prepare(`UPDATE eventos SET gc_lotes_on = ? WHERE id = ?`).run(on ? 1 : 0, eventoId);
}
