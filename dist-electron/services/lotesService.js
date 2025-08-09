"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarTabelaLotes = criarTabelaLotes;
exports.adicionarColunaStatusSeNaoExistir = adicionarColunaStatusSeNaoExistir;
exports.adicionarColunaIncompletoSeNaoExistir = adicionarColunaIncompletoSeNaoExistir;
exports.cadastrarLote = cadastrarLote;
exports.editarLote = editarLote;
exports.excluirLote = excluirLote;
exports.getLotesPorEvento = getLotesPorEvento;
exports.gerarLoteDisponivel = gerarLoteDisponivel;
exports.atualizarStatusLote = atualizarStatusLote;
exports.getLotesEmPista = getLotesEmPista;
exports.registrarLance = registrarLance;
exports.venderLote = venderLote;
exports.venderTodosLotes = venderTodosLotes;
exports.colocarLoteEmPista = colocarLoteEmPista;
exports.contarLancesPorLote = contarLancesPorLote;
exports.getLancesDeLote = getLancesDeLote;
exports.getRelatorioDoEvento = getRelatorioDoEvento;
const db_1 = __importDefault(require("../lib/db"));
// Criação da tabela
function criarTabelaLotes() {
    db_1.default.prepare(`
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
  `).run();
}
// Adicionar coluna "status" se não existir
function adicionarColunaStatusSeNaoExistir() {
    try {
        db_1.default.prepare("SELECT status FROM lotes LIMIT 1").get();
    }
    catch {
        db_1.default.prepare("ALTER TABLE lotes ADD COLUMN status TEXT DEFAULT 'aguardando'").run();
        console.log("✅ Coluna 'status' adicionada à tabela lotes.");
    }
}
// Adicionar coluna "incompleto" se não existir
function adicionarColunaIncompletoSeNaoExistir() {
    try {
        db_1.default.prepare("SELECT incompleto FROM lotes LIMIT 1").get();
    }
    catch {
        db_1.default.prepare("ALTER TABLE lotes ADD COLUMN incompleto INTEGER DEFAULT 0").run();
        console.log("✅ Coluna 'incompleto' adicionada à tabela lotes.");
    }
}
// 🧠 Verifica se algum campo obrigatório está faltando
function verificarLoteIncompleto(lote) {
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
        if (campo === "valor")
            return valor === undefined || valor === null; // número precisa existir
        return !valor?.toString().trim();
    });
}
// Cadastro
function cadastrarLote(data) {
    console.log("📦 Dados recebidos para cadastrar:", data);
    const incompleto = verificarLoteIncompleto(data);
    console.log("📌 Resultado da verificação de incompleto:", incompleto);
    const stmt = db_1.default.prepare(`
    INSERT INTO lotes (
      evento_id, valor, lote, nome_animal,
      gira_1, gira_2, gira_3, gira_4, gira_5, gira_6,
      condicao_pagamento, status, incompleto
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(data.evento_id, data.valor, data.lote, data.nome_animal, data.gira_1, data.gira_2, data.gira_3, data.gira_4, data.gira_5, data.gira_6, data.condicao_pagamento, data.status || "aguardando", incompleto ? 1 : 0);
    return result.lastInsertRowid;
}
// Edição
function editarLote(id, data) {
    const incompleto = verificarLoteIncompleto(data);
    db_1.default.prepare(`
    UPDATE lotes SET
      valor = ?, lote = ?, nome_animal = ?,
      gira_1 = ?, gira_2 = ?, gira_3 = ?,
      gira_4 = ?, gira_5 = ?, gira_6 = ?,
      condicao_pagamento = ?, incompleto = ?
    WHERE id = ?
  `).run(data.valor, data.lote, data.nome_animal, data.gira_1, data.gira_2, data.gira_3, data.gira_4, data.gira_5, data.gira_6, data.condicao_pagamento, incompleto ? 1 : 0, id);
}
// Exclusão
function excluirLote(id) {
    db_1.default.prepare("DELETE FROM lotes WHERE id = ?").run(id);
}
// Busca por evento com paginação e filtro
function getLotesPorEvento(eventoId, search, searchBy, page, limit) {
    const offset = (page - 1) * limit;
    let query = `SELECT l.*, (
    SELECT COUNT(*) FROM lances ln WHERE ln.id_lote = l.id
  ) as qtd_lances FROM lotes l WHERE evento_id = ?`;
    const params = [eventoId];
    if (search) {
        query += ` AND LOWER(${searchBy}) LIKE ?`;
        params.push(`%${search.toLowerCase()}%`);
    }
    query += ` ORDER BY l.id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const lotes = db_1.default.prepare(query).all(...params);
    let countQuery = `SELECT COUNT(*) as total FROM lotes WHERE evento_id = ?`;
    const countParams = [eventoId];
    if (search) {
        countQuery += ` AND LOWER(${searchBy}) LIKE ?`;
        countParams.push(`%${search.toLowerCase()}%`);
    }
    const result = db_1.default.prepare(countQuery).get(...countParams);
    const total = typeof result === "object" && result !== null && "total" in result
        ? result.total
        : 0;
    return { lotes, total };
}
// Gera sufixo único
function gerarLoteDisponivel(eventoId, loteBase) {
    const stmt = db_1.default.prepare("SELECT lote FROM lotes WHERE evento_id = ? AND lote LIKE ?");
    const existentes = stmt
        .all(eventoId, `${loteBase}%`)
        .map((row) => row.lote);
    if (!existentes.includes(loteBase))
        return loteBase;
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const letra of letras) {
        const novoLote = `${loteBase}${letra}`;
        if (!existentes.includes(novoLote))
            return novoLote;
    }
    throw new Error("Limite de lotes com sufixo atingido.");
}
// Atualiza status
function atualizarStatusLote(id, status) {
    db_1.default.prepare("UPDATE lotes SET status = ? WHERE id = ?").run(status, id);
}
function getLotesEmPista(eventoId) {
    const rows = db_1.default
        .prepare(`SELECT 
       l.id,
       l.lote,
       l.nome_animal,
       l.status,
       l.gira_1, l.gira_2, l.gira_3, l.gira_4, l.gira_5, l.gira_6,
       l.condicao_pagamento,
       lep.valor
     FROM lote_em_pista lep
     JOIN lotes l ON l.id = lep.id_lote
     WHERE lep.id_evento = ?`)
        .all(eventoId);
    return rows;
}
function registrarLance(idEvento, valor) {
    const lotes = getLotesEmPista(idEvento);
    const insertLance = db_1.default.prepare(`INSERT INTO lances (id_evento, id_lote, valor, timestamp)
     VALUES (?, ?, ?, ?)`);
    const updateValor = db_1.default.prepare(`UPDATE lote_em_pista SET valor = ? WHERE id_evento = ? AND id_lote = ?`);
    const now = new Date().toISOString();
    for (const lote of lotes) {
        insertLance.run(idEvento, lote.id, valor, now);
        updateValor.run(valor, idEvento, lote.id);
    }
}
function venderLote(idEvento, idLote, valorFinal) {
    db_1.default.prepare(`UPDATE lotes SET status = 'vendido', valor = ? WHERE id = ?`).run(valorFinal, idLote);
    db_1.default.prepare(`DELETE FROM lote_em_pista WHERE id_evento = ? AND id_lote = ?`).run(idEvento, idLote);
}
function venderTodosLotes(idEvento) {
    const lotes = getLotesEmPista(idEvento);
    for (const lote of lotes) {
        venderLote(idEvento, lote.id, lote.valor);
    }
}
function colocarLoteEmPista(idEvento, idLote) {
    db_1.default.prepare(`UPDATE lotes SET status = 'em_pista' WHERE id = ?`).run(idLote);
    db_1.default.prepare(`
    INSERT OR IGNORE INTO lote_em_pista (id_evento, id_lote, valor)
    VALUES (?, ?, 0)
  `).run(idEvento, idLote);
}
function contarLancesPorLote(idLote) {
    const result = db_1.default
        .prepare(`SELECT COUNT(*) as total FROM lances WHERE id_lote = ?`)
        .get(idLote);
    return typeof result === "object" && result !== null && "total" in result
        ? result.total
        : 0;
}
function getLancesDeLote(idLote) {
    return db_1.default
        .prepare(`SELECT valor, timestamp FROM lances WHERE id_lote = ? ORDER BY timestamp DESC`)
        .all(idLote);
}
function getRelatorioDoEvento(eventoId) {
    const stmt = db_1.default.prepare(`
    SELECT id, lote, nome_animal, valor, condicao_pagamento
    FROM lotes
    WHERE evento_id = ? AND status = 'vendido'
  `);
    const rows = stmt.all(eventoId);
    return rows.map((l) => {
        // Converte valor para número, tratando separadores
        const valorNumber = Number(String(l.valor).replace(/\./g, "").replace(",", ".")) || 0;
        let parcelasTotais = 1;
        if (l.condicao_pagamento) {
            if (l.condicao_pagamento.toLowerCase().includes("vista")) {
                // Caso seja "à vista", apenas 1 parcela
                parcelasTotais = 1;
            }
            else if (l.condicao_pagamento.includes("=")) {
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
            valor_total: valorTotal
        };
    });
}
