import db from "../lib/db";

// --- TIPOS AUXILIARES ---
type TableInfoRow = { name: string };
type RowGCLotes = { gc_lotes_on?: number };

// --- MIGRAÇÃO: garante a coluna gc_lotes_on ---
export function adicionarColunaGCLotesSeNaoExistir_safe() {
  // checa metadados da tabela
  const cols = db.prepare("PRAGMA table_info(eventos)").all() as TableInfoRow[];

  const hasCol = cols.some((c) => c.name === "gc_lotes_on");
  if (!hasCol) {
    db.prepare(
      "ALTER TABLE eventos ADD COLUMN gc_lotes_on INTEGER DEFAULT 0"
    ).run();
  }

  // normaliza valores nulos
  db.prepare("UPDATE eventos SET gc_lotes_on = COALESCE(gc_lotes_on, 0)").run();
}

// --- GET status GC_LOTES por evento ---
export function getStatusGCLotes(eventoId: number): boolean {
  const row = db
    .prepare("SELECT gc_lotes_on FROM eventos WHERE id = ?")
    .get(eventoId) as RowGCLotes | undefined;

  // se não achou, retorna false; se achou, true somente se === 1
  return !!(row && Number(row.gc_lotes_on) === 1);
}

// --- SET status GC_LOTES por evento ---
export function setStatusGCLotes(eventoId: number, on: boolean) {
  db.prepare("UPDATE eventos SET gc_lotes_on = ? WHERE id = ?").run(
    on ? 1 : 0,
    eventoId
  );
}

// Criação da tabela
export function criarTabelaLotes() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      lote TEXT NOT NULL,
      nome_animal TEXT NOT NULL,
      gira_1 TEXT,
      gira_2 TEXT,
      gira_3 TEXT,
      gira_4 TEXT,
      gira_5 TEXT,
      gira_6 TEXT,
      condicao_pagamento TEXT,
      status TEXT DEFAULT 'aguardando',
      incompleto INTEGER DEFAULT 0
    )
  `
  ).run();
}

export interface LoteEmPistaDTO {
  id: number;
  lote: string;
  nome_animal: string;
  status: string;
  valor: number; // de lote_em_pista
  gira_1?: string;
  gira_2?: string;
  gira_3?: string;
  gira_4?: string;
  gira_5?: string;
  gira_6?: string;
  condicao_pagamento?: string;
}

export interface LoteRelatorio {
  id: number;
  lote: string;
  nome_animal: string;
  valor: number;
  condicao_pagamento: string;
  valor_total: number; // ✅ novo campo
}

// Adicionar coluna "status" se não existir
export function adicionarColunaStatusSeNaoExistir() {
  try {
    db.prepare("SELECT status FROM lotes LIMIT 1").get();
  } catch {
    db.prepare(
      "ALTER TABLE lotes ADD COLUMN status TEXT DEFAULT 'aguardando'"
    ).run();
    console.log("✅ Coluna 'status' adicionada à tabela lotes.");
  }
}

// Adicionar coluna "incompleto" se não existir
export function adicionarColunaIncompletoSeNaoExistir() {
  try {
    db.prepare("SELECT incompleto FROM lotes LIMIT 1").get();
  } catch {
    db.prepare(
      "ALTER TABLE lotes ADD COLUMN incompleto INTEGER DEFAULT 0"
    ).run();
    console.log("✅ Coluna 'incompleto' adicionada à tabela lotes.");
  }
}

// 🧠 Verifica se algum campo obrigatório está faltando
function verificarLoteIncompleto(lote: any): boolean {
  const camposObrigatorios = [
    "valor",
    "lote",
    "nome_animal",
    "gira_1",
    "gira_2",
    "gira_3",
    "gira_4",
    "gira_5",
    "gira_6",
  ];

  return camposObrigatorios.some((campo) => {
    const valor = lote[campo];
    if (campo === "valor") return valor === undefined || valor === null; // número precisa existir
    return !valor?.toString().trim();
  });
}

// Cadastro
export function cadastrarLote(data: any) {
  console.log("📦 Dados recebidos para cadastrar:", data);
  const incompleto = verificarLoteIncompleto(data);
  console.log("📌 Resultado da verificação de incompleto:", incompleto);

  const stmt = db.prepare(`
    INSERT INTO lotes (
      evento_id, valor, lote, nome_animal,
      gira_1, gira_2, gira_3, gira_4, gira_5, gira_6,
      condicao_pagamento, status, incompleto
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.evento_id,
    data.valor,
    data.lote,
    data.nome_animal,
    data.gira_1,
    data.gira_2,
    data.gira_3,
    data.gira_4,
    data.gira_5,
    data.gira_6,
    data.condicao_pagamento,
    data.status || "aguardando",
    incompleto ? 1 : 0
  );

  return result.lastInsertRowid;
}

// Edição
export function editarLote(id: number, data: any) {
  const incompleto = verificarLoteIncompleto(data);

  db.prepare(
    `
    UPDATE lotes SET
      valor = ?, lote = ?, nome_animal = ?,
      gira_1 = ?, gira_2 = ?, gira_3 = ?,
      gira_4 = ?, gira_5 = ?, gira_6 = ?,
      condicao_pagamento = ?, incompleto = ?
    WHERE id = ?
  `
  ).run(
    data.valor,
    data.lote,
    data.nome_animal,
    data.gira_1,
    data.gira_2,
    data.gira_3,
    data.gira_4,
    data.gira_5,
    data.gira_6,
    data.condicao_pagamento,
    incompleto ? 1 : 0,
    id
  );
}

// Exclusão
export function excluirLote(id: number) {
  db.prepare("DELETE FROM lotes WHERE id = ?").run(id);
}

// Busca por evento com paginação e filtro
export function getLotesPorEvento(
  eventoId: number,
  search: string,
  searchBy: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;

  let query = `SELECT l.*, (
    SELECT COUNT(*) FROM lances ln WHERE ln.id_lote = l.id
  ) as qtd_lances FROM lotes l WHERE evento_id = ?`;

  const params: any[] = [eventoId];

  if (search) {
    query += ` AND LOWER(${searchBy}) LIKE ?`;
    params.push(`%${search.toLowerCase()}%`);
  }

  query += ` ORDER BY l.id ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const lotes = db.prepare(query).all(...params);

  let countQuery = `SELECT COUNT(*) as total FROM lotes WHERE evento_id = ?`;
  const countParams: any[] = [eventoId];

  if (search) {
    countQuery += ` AND LOWER(${searchBy}) LIKE ?`;
    countParams.push(`%${search.toLowerCase()}%`);
  }

  const result = db.prepare(countQuery).get(...countParams);
  const total =
    typeof result === "object" && result !== null && "total" in result
      ? (result as any).total
      : 0;

  return { lotes, total };
}

// Gera sufixo único
export function gerarLoteDisponivel(
  eventoId: number,
  loteBase: string
): string {
  const stmt = db.prepare(
    "SELECT lote FROM lotes WHERE evento_id = ? AND lote LIKE ?"
  );
  const existentes = stmt
    .all(eventoId, `${loteBase}%`)
    .map((row: any) => row.lote);

  if (!existentes.includes(loteBase)) return loteBase;

  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const letra of letras) {
    const novoLote = `${loteBase}${letra}`;
    if (!existentes.includes(novoLote)) return novoLote;
  }

  throw new Error("Limite de lotes com sufixo atingido.");
}

// Atualiza status
export function atualizarStatusLote(id: number, status: string) {
  db.prepare("UPDATE lotes SET status = ? WHERE id = ?").run(status, id);
}

export interface LoteEmPistaDTO {
  id: number;
  lote: string;
  nome_animal: string;
  status: string;
  valor: number;
  gira_1?: string;
  gira_2?: string;
  gira_3?: string;
  gira_4?: string;
  gira_5?: string;
  gira_6?: string;
  condicao_pagamento?: string;
}

export function getLotesEmPista(eventoId: number): LoteEmPistaDTO[] {
  const rows = db
    .prepare(
      `SELECT 
       l.id,
       l.lote,
       l.nome_animal,
       l.status,
       l.gira_1, l.gira_2, l.gira_3, l.gira_4, l.gira_5, l.gira_6,
       l.condicao_pagamento,
       lep.valor
     FROM lote_em_pista lep
     JOIN lotes l ON l.id = lep.id_lote
     WHERE lep.id_evento = ?`
    )
    .all(eventoId);

  return rows as LoteEmPistaDTO[];
}

export function registrarLance(idEvento: number, valor: number) {
  const lotes = getLotesEmPista(idEvento);
  const insertLance = db.prepare(
    `INSERT INTO lances (id_evento, id_lote, valor, timestamp)
     VALUES (?, ?, ?, ?)`
  );
  const updateValor = db.prepare(
    `UPDATE lote_em_pista SET valor = ? WHERE id_evento = ? AND id_lote = ?`
  );
  const now = new Date().toISOString();
  for (const lote of lotes) {
    insertLance.run(idEvento, lote.id, valor, now);
    updateValor.run(valor, idEvento, lote.id);
  }
}

export function venderLote(
  idEvento: number,
  idLote: number,
  valorFinal: number
) {
  db.prepare(`UPDATE lotes SET status = 'vendido', valor = ? WHERE id = ?`).run(
    valorFinal,
    idLote
  );
  db.prepare(
    `DELETE FROM lote_em_pista WHERE id_evento = ? AND id_lote = ?`
  ).run(idEvento, idLote);
}

export function venderTodosLotes(idEvento: number) {
  const lotes = getLotesEmPista(idEvento);
  for (const lote of lotes) {
    venderLote(idEvento, lote.id, lote.valor);
  }
}

export function colocarLoteEmPista(idEvento: number, idLote: number) {
  db.prepare(`UPDATE lotes SET status = 'em_pista' WHERE id = ?`).run(idLote);
  db.prepare(
    `
    INSERT OR IGNORE INTO lote_em_pista (id_evento, id_lote, valor)
    VALUES (?, ?, 0)
  `
  ).run(idEvento, idLote);
}

export function contarLancesPorLote(idLote: number): number {
  const result = db
    .prepare(`SELECT COUNT(*) as total FROM lances WHERE id_lote = ?`)
    .get(idLote);
  return typeof result === "object" && result !== null && "total" in result
    ? (result as any).total
    : 0;
}

export function getLancesDeLote(idLote: number) {
  return db
    .prepare(
      `SELECT valor, timestamp FROM lances WHERE id_lote = ? ORDER BY timestamp DESC`
    )
    .all(idLote);
}

export function getRelatorioDoEvento(eventoId: number): LoteRelatorio[] {
  const stmt = db.prepare(`
    SELECT id, lote, nome_animal, valor, condicao_pagamento
    FROM lotes
    WHERE evento_id = ? AND status = 'vendido'
  `);

  const rows = stmt.all(eventoId) as {
    id: number;
    lote: string;
    nome_animal: string;
    valor: any;
    condicao_pagamento: string;
  }[];

  return rows.map((l) => {
    // Converte valor para número, tratando separadores
    const valorNumber =
      Number(String(l.valor).replace(/\./g, "").replace(",", ".")) || 0;

    let parcelasTotais = 1;

    if (l.condicao_pagamento) {
      if (l.condicao_pagamento.toLowerCase().includes("vista")) {
        // Caso seja "à vista", apenas 1 parcela
        parcelasTotais = 1;
      } else if (l.condicao_pagamento.includes("=")) {
        // Caso tenha "=" pega o número após ele
        const afterEquals = l.condicao_pagamento.split("=")[1]?.trim();
        parcelasTotais = Number(afterEquals) || 1;
      }
    }

    const valorTotal = valorNumber * parcelasTotais;

    return {
      id: l.id,
      lote: l.lote,
      nome_animal: l.nome_animal,
      valor: valorNumber,
      condicao_pagamento: l.condicao_pagamento ?? "",
      valor_total: valorTotal,
    };
  });
}
