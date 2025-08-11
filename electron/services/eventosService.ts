import path from "path";
import Database from "better-sqlite3";

export interface Evento {
  id: number;
  nome: string;
  data: string;
  descricao?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  condicao_pagamento_padrao?: string | null;
}

const dbPath = path.resolve(__dirname, "../../data.db");
const db = new Database(dbPath);

export function criarTabelaEventos() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      data TEXT NOT NULL,
      descricao TEXT,
      start_time TEXT,
      end_time TEXT,
      condicao_pagamento_padrao TEXT
    )
  `
  ).run();

  db.prepare(
    `
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
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS lote_em_pista (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_evento INTEGER NOT NULL,
      id_lote INTEGER NOT NULL,
      valor INTEGER DEFAULT 0,
      FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (id_lote) REFERENCES lotes(id) ON DELETE CASCADE,
      UNIQUE (id_evento, id_lote)
    )
  `
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lote_em_pista_evento ON lote_em_pista (id_evento)`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lote_em_pista_lote ON lote_em_pista (id_lote)`
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS lances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_evento INTEGER NOT NULL,
      id_lote INTEGER NOT NULL,
      valor INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE,
      FOREIGN KEY (id_lote) REFERENCES lotes(id) ON DELETE CASCADE
    )
  `
  ).run();

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lances_evento ON lances (id_evento)`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lances_lote ON lances (id_lote)`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_lances_timestamp ON lances (timestamp)`
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS gc_duas_linhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      cargo TEXT NOT NULL
    )
  `
  ).run();

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS gc_duas_linhas_no_ar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      gc_id INTEGER NOT NULL,
      FOREIGN KEY (gc_id) REFERENCES gc_duas_linhas(id)
    )
  `
  ).run();

  // Coluna de status GC LOTES (on/off) no evento
  adicionarColunaGCLotesSeNaoExistir_safe();
}

export function listarEventos(): Evento[] {
  return db.prepare(`SELECT * FROM eventos ORDER BY id ASC`).all() as Evento[];
}

export function inserirEvento(
  nome: string,
  data: Date,
  descricao?: string | null,
  start_time?: string | null,
  condicao_pagamento_padrao?: string | null
): void {
  const isoData = data.toISOString();
  db.prepare(
    `INSERT INTO eventos (nome, data, descricao, start_time, condicao_pagamento_padrao)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    nome,
    isoData,
    descricao ?? null,
    start_time ?? null,
    condicao_pagamento_padrao ?? null
  );
}

export function getEventoPorId(id: number): Evento | null {
  const evento = db.prepare("SELECT * FROM eventos WHERE id = ?").get(id);
  return evento ? (evento as Evento) : null;
}

export function deletarEvento(id: number): boolean {
  const result = db.prepare("DELETE FROM eventos WHERE id = ?").run(id);
  return result.changes > 0;
}

export function editarEvento(
  id: number,
  nome: string,
  data: string,
  descricao?: string
) {
  db.prepare(
    "UPDATE eventos SET nome = ?, data = ?, descricao = ? WHERE id = ?"
  ).run(nome, data, descricao || null, id);
}

export function encerrarEvento(id: number, endTime: string): void {
  db.prepare("UPDATE eventos SET end_time = ? WHERE id = ?").run(endTime, id);
}

export function adicionarColunaCondicaoPagamentoPadrao() {
  try {
    db.prepare("SELECT condicao_pagamento_padrao FROM eventos LIMIT 1").get();
  } catch {
    db.prepare(
      "ALTER TABLE eventos ADD COLUMN condicao_pagamento_padrao TEXT DEFAULT ''"
    ).run();
    console.log(
      "✅ Coluna 'condicao_pagamento_padrao' adicionada à tabela eventos."
    );
  }
}

/** GC LOTES: coluna booleana no evento */
export function adicionarColunaGCLotesSeNaoExistir_safe() {
  try {
    const cols = db.prepare("PRAGMA table_info(eventos)").all() as {
      name: string;
    }[];
    const existe = cols.some((c) => c.name === "gc_lotes_on");
    if (!existe) {
      db.prepare(
        "ALTER TABLE eventos ADD COLUMN gc_lotes_on INTEGER DEFAULT 0"
      ).run();
      console.log("✅ Coluna 'gc_lotes_on' criada em 'eventos'");
    }
  } catch (err) {
    console.error("Erro ao verificar/criar coluna gc_lotes_on:", err);
  }
}
export function getStatusGCLotes(eventoId: number): boolean {
  const row = db
    .prepare(`SELECT gc_lotes_on FROM eventos WHERE id = ?`)
    .get(eventoId) as { gc_lotes_on?: number } | undefined;
  return row?.gc_lotes_on === 1;
}
export function setStatusGCLotes(eventoId: number, on: boolean) {
  db.prepare(`UPDATE eventos SET gc_lotes_on = ? WHERE id = ?`).run(
    on ? 1 : 0,
    eventoId
  );
}
