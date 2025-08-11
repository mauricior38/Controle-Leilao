import express from "express";
import cors from "cors";
import multer from "multer";
import xlsx from "xlsx";
import os from "os";

import {
  criarTabelaEventos,
  listarEventos,
  inserirEvento,
  getEventoPorId,
  deletarEvento,
  editarEvento,
  encerrarEvento,
  type Evento,
  adicionarColunaCondicaoPagamentoPadrao,
  adicionarColunaGCLotesSeNaoExistir_safe,
  getStatusGCLotes,
  setStatusGCLotes,
  iniciarEvento,
} from "./services/eventosService";

import {
  cadastrarLote,
  editarLote,
  excluirLote,
  getLotesPorEvento,
  gerarLoteDisponivel,
  atualizarStatusLote,
  adicionarColunaStatusSeNaoExistir,
  adicionarColunaIncompletoSeNaoExistir,
  getLotesEmPista,
  registrarLance,
  venderLote,
  venderTodosLotes,
  colocarLoteEmPista,
  getLancesDeLote,
  getRelatorioDoEvento,
  type LoteRelatorio,
  type LoteEmPistaDTO,
} from "./services/lotesService";

import {
  listarGCsPorEvento,
  criarGC,
  atualizarGC,
  excluirGC,
  definirGCNoAr,
  obterGCNoAr,
  GC,
} from "./services/gcService";

const app = express();

/**
 * CORS
 * - Permite localhost:5173 (Vite) com credenciais
 * - Responde preflight corretamente
 */
const ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

/** Boot do banco e migrações seguras */
criarTabelaEventos();
adicionarColunaCondicaoPagamentoPadrao();
adicionarColunaStatusSeNaoExistir();
adicionarColunaIncompletoSeNaoExistir();
adicionarColunaGCLotesSeNaoExistir_safe();

/** Auth (token simples) — libera algumas rotas públicas */
const API_TOKEN = process.env.API_TOKEN || "crur1280";
app.use((req, res, next) => {
  const p = req.path; // caminho puro (sem query)
  const isGet = req.method === "GET";

  // rotas públicas SEM token
  const isPublic =
    p === "/health" ||
    (isGet &&
      (p === "/eventos" ||
        /^\/eventos\/\d+\/?$/.test(p) || // /eventos/:id (com ou sem /)
        /^\/eventos\/\d+\/(lotes|lotes-em-pista)$/.test(p) || // leitura de lotes
        /^\/eventos\/\d+\/relatorio(\.xlsx)?$/.test(p) || // relatório json/xlsx
        /^\/eventos\/\d+\/gc-lotes\/status$/.test(p) || // status GC
        /^\/gc-duas-linhas-no-ar\/\d+$/.test(p) || // GC duas linhas no ar
        /^\/lotes\/\d+\/lances$/.test(p))); // lances de lote

  if (isPublic) return next();

  // demais rotas exigem Authorization: Bearer <token>
  const auth = req.headers.authorization || "";
  const ok = auth.startsWith("Bearer ") && auth.split(" ")[1] === API_TOKEN;
  if (!ok) return res.status(401).json({ error: "unauthorized" });
  next();
});

/** Utils */
function formatValorBR(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  if (v >= 100) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

interface LoteEmPistaOut {
  valor: string;
  lote: string;
  nome_animal: string;
  gira_1: string;
  gira_2: string;
  gira_3: string;
  gira_4: string;
  gira_5: string;
  gira_6: string;
  condicao_pagamento: string;
}
interface EventoOut extends Evento {
  lotes_em_pista: LoteEmPistaOut[];
  gc_duas_linhas_no_ar: { nome: string; cargo: string } | null;
  gc_lotes_on?: boolean;
}

/** Rotas de eventos */
app.get("/eventos", (req, res) => {
  try {
    const eventos: Evento[] = listarEventos();

    const payload: EventoOut[] = eventos.map((ev) => {
      const lotesRaw: LoteEmPistaDTO[] = getLotesEmPista(ev.id);
      const lotes_em_pista: LoteEmPistaOut[] = lotesRaw.map((l) => ({
        valor: formatValorBR(Number(l.valor)),
        lote: l.lote,
        nome_animal: l.nome_animal,
        gira_1: l.gira_1 ?? "",
        gira_2: l.gira_2 ?? "",
        gira_3: l.gira_3 ?? "",
        gira_4: l.gira_4 ?? "",
        gira_5: l.gira_5 ?? "",
        gira_6: l.gira_6 ?? "",
        condicao_pagamento:
          l.condicao_pagamento && l.condicao_pagamento.trim() !== ""
            ? l.condicao_pagamento
            : ev.condicao_pagamento_padrao ?? "",
      }));

      const gc: GC | null = obterGCNoAr(ev.id);
      const gc_lotes_on = getStatusGCLotes(ev.id);

      return {
        id: ev.id,
        nome: ev.nome,
        data: ev.data,
        descricao: ev.descricao ?? null,
        start_time: ev.start_time ?? ev.data ?? null,
        end_time: ev.end_time ?? null,
        condicao_pagamento_padrao: ev.condicao_pagamento_padrao ?? null,
        lotes_em_pista,
        gc_duas_linhas_no_ar: gc ? { nome: gc.nome, cargo: gc.cargo } : null,
        gc_lotes_on,
      };
    });

    res.json(payload);
  } catch (err) {
    console.error("❌ Erro ao montar /eventos:", err);
    res.status(500).json({ error: "Erro interno ao listar eventos" });
  }
});

app.post("/eventos", (req, res) => {
  const { nome, data, descricao, start_time, condicao_pagamento_padrao } =
    req.body;
  inserirEvento(
    nome,
    new Date(data),
    descricao,
    start_time,
    condicao_pagamento_padrao
  );
  res.status(201).send();
});

app.get("/eventos/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = getEventoPorId(id);
    if (!ev) return res.status(404).json({ error: "Evento não encontrado" });

    // lotes em pista
    const lotesRaw: LoteEmPistaDTO[] = getLotesEmPista(ev.id);
    const lotes_em_pista = lotesRaw.map((l) => ({
      valor: formatValorBR(Number(l.valor)),
      lote: l.lote,
      nome_animal: l.nome_animal,
      gira_1: l.gira_1 ?? "",
      gira_2: l.gira_2 ?? "",
      gira_3: l.gira_3 ?? "",
      gira_4: l.gira_4 ?? "",
      gira_5: l.gira_5 ?? "",
      gira_6: l.gira_6 ?? "",
      condicao_pagamento:
        l.condicao_pagamento && l.condicao_pagamento.trim() !== ""
          ? l.condicao_pagamento
          : ev.condicao_pagamento_padrao ?? "",
    }));

    // GC duas linhas “no ar”
    const gc = obterGCNoAr(ev.id);
    const gc_duas_linhas_no_ar = gc ? { nome: gc.nome, cargo: gc.cargo } : null;

    // status GC LOTES
    const gc_lotes_on = getStatusGCLotes(ev.id);

    const payload = {
      id: ev.id,
      nome: ev.nome,
      data: ev.data,
      descricao: ev.descricao ?? null,
      start_time: ev.start_time ?? ev.data ?? null,
      end_time: ev.end_time ?? null,
      condicao_pagamento_padrao: ev.condicao_pagamento_padrao ?? null,
      lotes_em_pista,
      gc_duas_linhas_no_ar,
      gc_lotes_on,
    };

    res.json(payload);
  } catch (err) {
    console.error("❌ Erro em GET /eventos/:id:", err);
    res.status(500).json({ error: "Erro interno ao obter evento" });
  }
});

app.patch("/eventos/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      nome,
      data, // ISO
      descricao,
      condicao_pagamento_padrao,
    } = req.body ?? {};

    editarEvento(
      id,
      nome,
      data,
      descricao ?? null,
      condicao_pagamento_padrao ?? null
    );
    const ev = getEventoPorId(id);
    if (!ev) return res.status(404).json({ error: "Não encontrado" });
    res.json(ev);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/eventos/:id/iniciar", (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = iniciarEvento(id); // define start_time=agora se ainda não começou
    res.json(ev);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/eventos/:id/encerrar", (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = encerrarEvento(id); // define end_time=agora
    res.json(ev);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.put("/eventos/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, data, descricao, condicao_pagamento_padrao } = req.body ?? {};

    editarEvento(
      id,
      nome,
      data, // ISO
      descricao ?? null,
      condicao_pagamento_padrao ?? null // 👈 importante
    );

    const ev = getEventoPorId(id);
    if (!ev) return res.status(404).json({ error: "Não encontrado" });
    res.json(ev);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/eventos/:id", (req, res) => {
  const id = Number(req.params.id);
  const ok = deletarEvento(id);
  if (!ok)
    return res
      .status(404)
      .json({ error: "Evento não encontrado para deletar" });
  res.status(204).send();
});

// app.patch("/eventos/:id", (req, res) => {
//   const id = Number(req.params.id);
//   const { end_time } = req.body;
//   if (!end_time) {
//     return res.status(400).json({ error: "Campo 'end_time' obrigatório" });
//   }
//   try {
//     encerrarEvento(id, end_time);
//     res.status(200).json({ message: "Evento encerrado com sucesso" });
//   } catch (error) {
//     console.error("Erro ao encerrar evento:", error);
//     res.status(500).json({ error: "Erro interno ao encerrar evento" });
//   }
// });

/** Lotes - Upload via Excel */
const upload = multer({ storage: multer.memoryStorage() });

app.post("/lotes/upload", upload.single("file"), async (req, res) => {
  try {
    const eventoId = Number(req.body.evento_id);
    const buffer = req.file?.buffer;

    if (!eventoId || !Number.isInteger(eventoId) || eventoId <= 0) {
      return res.status(400).json({ error: "evento_id inválido." });
    }
    if (!buffer) {
      return res.status(400).json({ error: "Arquivo Excel ausente." });
    }

    const evento = getEventoPorId(eventoId);
    const condicaoPadrao = evento?.condicao_pagamento_padrao || "";

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    let importados = 0;
    let ignorados = 0;

    for (const row of data as any[]) {
      const nome = row["LINHA 1 - NOME ANIMAL"];
      const loteBase = row["LOTE"];

      if (!nome || !loteBase) {
        ignorados++;
        continue;
      }

      const loteFinal = gerarLoteDisponivel(eventoId, String(loteBase));

      const gira_1 = (row["LINHA 2 - GIRA"] ?? "").toString().trim();
      const gira_2 = (row["LINHA 3 - GIRA"] ?? "").toString().trim();
      const gira_3 = (row["LINHA 4 - GIRA"] ?? "").toString().trim();
      const gira_4 = (row["LINHA 5 - GIRA"] ?? "").toString().trim();
      const gira_5 = (row["LINHA 6 - GIRA"] ?? "").toString().trim();
      const gira_6 = "";

      const condicaoDoExcel = (row["CONDICAO DE PAGAMENTO"] ?? "")
        .toString()
        .trim();
      const condicaoFinal = condicaoDoExcel || condicaoPadrao;

      const incompleto =
        !nome ||
        !gira_1 ||
        !gira_2 ||
        !gira_3 ||
        !gira_4 ||
        !gira_5 ||
        !condicaoFinal;

      try {
        cadastrarLote({
          evento_id: eventoId,
          valor: 0,
          lote: loteFinal,
          nome_animal: nome,
          gira_1,
          gira_2,
          gira_3,
          gira_4,
          gira_5,
          gira_6,
          condicao_pagamento: condicaoFinal,
          incompleto,
        });
        importados++;
      } catch {
        ignorados++;
      }
    }

    res.status(200).json({
      success: true,
      importados,
      ignorados,
      mensagem: `${importados} lote(s) importado(s). ${ignorados} ignorado(s).`,
    });
  } catch (err) {
    console.error("Erro ao processar upload:", err);
    res.status(500).json({ error: "Erro interno ao processar o arquivo." });
  }
});

/** Lotes - listagem (paginação + busca) */
app.get("/eventos/:id/lotes", (req, res) => {
  try {
    const eventoId = Number(req.params.id);
    const search = String(req.query.search || "").toLowerCase();
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const searchBy =
      (String(req.query.searchBy) as "lote" | "nome_animal") || "nome_animal";

    const { lotes, total } = getLotesPorEvento(
      eventoId,
      search,
      searchBy,
      page,
      limit
    );
    res.json({ lotes, total });
  } catch (err) {
    console.error("Erro ao listar lotes:", err);
    res.status(500).json({ error: "Erro ao buscar lotes" });
  }
});

/** Lotes - CRUD simples */
app.post("/lotes", (req, res) => {
  try {
    const data = req.body;
    const loteCorrigido = gerarLoteDisponivel(data.evento_id, data.lote);
    const loteData = { ...data, lote: loteCorrigido };
    const id = cadastrarLote(loteData);
    res.status(201).json({ id, lote: loteCorrigido });
  } catch (err) {
    console.error("❌ Erro ao cadastrar lote:", err);
    res.status(500).json({ error: "Erro ao cadastrar lote" });
  }
});

app.put("/lotes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    editarLote(id, req.body);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao editar lote:", err);
    res.status(500).json({ error: "Erro ao editar lote" });
  }
});

app.patch("/lotes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const incompleto =
      !data.nome_animal ||
      !data.lote ||
      !data.condicao_pagamento ||
      !data.gira_1 ||
      !data.gira_2 ||
      !data.gira_3 ||
      !data.gira_4 ||
      !data.gira_5 ||
      !data.gira_6;

    editarLote(id, {
      ...data,
      incompleto,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao editar lote:", err);
    res.status(500).json({ error: "Erro ao editar lote" });
  }
});

app.delete("/lotes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    excluirLote(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir lote:", err);
    res.status(500).json({ error: "Erro ao excluir lote" });
  }
});

/** Lotes em pista / lances / venda */
app.get("/eventos/:id/lotes-em-pista", (req, res) => {
  const idEvento = Number(req.params.id);
  const lotes = getLotesEmPista(idEvento);
  res.json(lotes);
});

app.get("/lotes/:id/lances", (req, res) => {
  try {
    const idLote = Number(req.params.id);
    if (!Number.isFinite(idLote) || idLote <= 0) {
      return res.status(400).json({ error: "ID do lote inválido" });
    }
    const lances = getLancesDeLote(idLote);
    res.json(Array.isArray(lances) ? lances : []);
  } catch (error) {
    console.error("Erro ao buscar lances do lote:", error);
    res.status(500).json({ error: "Erro ao buscar lances do lote" });
  }
});

app.post("/eventos/:id/lances", (req, res) => {
  const idEvento = Number(req.params.id);
  const { valor } = req.body;
  registrarLance(idEvento, valor);
  res.status(200).json({ message: "Lances registrados" });
});

app.post("/eventos/:id/lotes/:idLote/vender", (req, res) => {
  const idEvento = Number(req.params.id);
  const idLote = Number(req.params.idLote);
  const { valor } = req.body;

  try {
    venderLote(idEvento, idLote, valor ?? 0);
    res.status(200).json({ message: "Lote vendido com valor salvo" });
  } catch (err) {
    console.error("Erro ao vender lote:", err);
    res.status(500).json({ error: "Erro ao vender lote" });
  }
});

app.post("/eventos/:id/lotes/vender-todos", (req, res) => {
  const idEvento = Number(req.params.id);
  venderTodosLotes(idEvento);
  res.status(200).json({ message: "Todos os lotes vendidos" });
});

app.post("/eventos/:id/lotes/:idLote/colocar-em-pista", (req, res) => {
  const idEvento = Number(req.params.id);
  const idLote = Number(req.params.idLote);
  try {
    colocarLoteEmPista(idEvento, idLote);
    res.status(200).json({ message: "Lote colocado em pista" });
  } catch (err) {
    console.error("Erro ao colocar lote em pista:", err);
    res.status(500).json({ error: "Erro ao colocar lote em pista" });
  }
});

app.patch("/lotes/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!["aguardando", "em_pista", "vendido"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  try {
    atualizarStatusLote(id, status);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro ao atualizar status do lote" });
  }
});

/** Relatório */
app.get("/eventos/:id/relatorio", (req, res) => {
  try {
    const eventoId = Number(req.params.id);
    const relatorio = getRelatorioDoEvento(eventoId);
    res.json(
      relatorio.map((item) => ({
        ...item,
        valor: Number(item.valor) || 0,
        valor_total: Number(item.valor_total) || 0,
      }))
    );
  } catch (err) {
    console.error("Erro ao gerar relatório:", err);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Uma única aba "Relatório" com resumo + tabela de itens
app.get("/eventos/:id/relatorio.xlsx", (req, res) => {
  try {
    const eventoId = Number(req.params.id);

    const evento = getEventoPorId(eventoId);
    if (!evento)
      return res.status(404).json({ error: "Evento não encontrado" });

    const relatorio = getRelatorioDoEvento(eventoId);

    const header = [
      "ID",
      "Lote",
      "Nome do Animal",
      "Valor Vendido",
      "Condição de Pagamento",
      "Valor Total",
    ];

    const linhas = relatorio.map((r) => [
      r.id,
      r.lote,
      r.nome_animal,
      Number(r.valor) || 0,
      r.condicao_pagamento,
      Number(r.valor_total) || 0,
    ]);

    const inicio = evento.start_time ? new Date(evento.start_time) : null;
    const fim = evento.end_time ? new Date(evento.end_time) : null;
    const duracao = (() => {
      if (!inicio || !fim) return "";
      const diff = Math.max(0, fim.getTime() - inicio.getTime());
      const totalSec = Math.floor(diff / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      const s = String(totalSec % 60).padStart(2, "0");
      return `${h}:${m}:${s}`;
    })();

    const aoa: (string | number)[][] = [
      ["Evento ID", eventoId],
      ["Início", inicio ? inicio.toLocaleString("pt-BR") : "—"],
      ["Término", fim ? fim.toLocaleString("pt-BR") : "—"],
      ["Duração (hh:mm:ss)", duracao || "—"],
      [],
      header,
      ...linhas,
    ];

    const ws = xlsx.utils.aoa_to_sheet(aoa);

    const firstDataRow = 7;
    const lastDataRow = linhas.length
      ? firstDataRow + linhas.length - 1
      : firstDataRow - 1;
    const totalRow = lastDataRow + 1;

    const colValorVendido = 3; // D
    const colValorTotal = 5; // F

    const addr = (r1based: number, c0based: number) =>
      xlsx.utils.encode_cell({ r: r1based - 1, c: c0based });

    // Formatar colunas de moeda
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const dCell = ws[addr(r, colValorVendido)];
      if (dCell) dCell.z = '"R$"#,##0.00';

      const fCell = ws[addr(r, colValorTotal)];
      if (fCell) fCell.z = '"R$"#,##0.00';
    }

    // Linha total geral
    ws[addr(totalRow, 4)] = { t: "s", v: "TOTAL GERAL" };
    ws[addr(totalRow, colValorTotal)] =
      linhas.length > 0
        ? {
            t: "n",
            f: `SUM(F${firstDataRow}:F${lastDataRow})`,
            z: '"R$"#,##0.00',
          }
        : { t: "n", v: 0, z: '"R$"#,##0.00' };

    // Ajustar largura das colunas
    ws["!cols"] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 28 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
    ];

    // 💡 Estilização extra do TOTAL GERAL
    const totalLabelCell = ws[addr(totalRow, 4)];
    const totalValueCell = ws[addr(totalRow, colValorTotal)];

    if (totalLabelCell) {
      totalLabelCell.s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFF599" } }, // amarelo claro
      };
    }
    if (totalValueCell) {
      totalValueCell.s = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFF599" } },
        numFmt: '"R$"#,##0.00',
      };
    }

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Relatório");
    const buffer = xlsx.write(wb, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio_evento_${eventoId}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error("Erro ao gerar Excel:", err);
    res.status(500).json({ error: "Erro ao gerar arquivo Excel" });
  }
});

/** GC Duas Linhas */
app.get("/gc/:eventoId", (req, res) => {
  const eventoId = Number(req.params.eventoId);
  const gcs = listarGCsPorEvento(eventoId);
  res.json(gcs);
});

app.post("/gc", (req, res) => {
  try {
    const { evento_id, nome, cargo } = req.body;
    if (!evento_id || !nome || !cargo) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }
    const id = criarGC({ evento_id, nome, cargo });
    res.status(201).json({ id });
  } catch (err) {
    console.error("Erro ao criar GC:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.patch("/gc/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nome, cargo } = req.body;
  if (!id || !nome || !cargo) {
    return res.status(400).json({ error: "Dados inválidos" });
  }
  try {
    await atualizarGC(id, { nome, cargo });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar GC:", err);
    res.status(500).json({ error: "Erro ao atualizar GC" });
  }
});

app.delete("/gc/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    excluirGC(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao excluir GC:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/gc-duas-linhas-no-ar", (req, res) => {
  const { evento_id, gc_id } = req.body;
  try {
    definirGCNoAr(evento_id, gc_id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro ao definir GC no ar:", err);
    res.status(500).json({ error: "Erro ao definir GC no ar" });
  }
});

app.get("/gc-duas-linhas-no-ar/:eventoId", (req, res) => {
  const eventoId = Number(req.params.eventoId);
  const gc = obterGCNoAr(eventoId);
  res.json(gc || null);
});

/** GC Lotes (status on/off armazenado no evento) */
app.get("/eventos/:id/gc-lotes/status", (req, res) => {
  const id = Number(req.params.id);
  res.json({ on: getStatusGCLotes(id) });
});
app.post("/eventos/:id/gc-lotes/on", (req, res) => {
  const id = Number(req.params.id);
  setStatusGCLotes(id, true);
  res.json({ on: true });
});
app.post("/eventos/:id/gc-lotes/off", (req, res) => {
  const id = Number(req.params.id);
  setStatusGCLotes(id, false);
  res.json({ on: false });
});

/** Health */
app.get("/health", (_, res) => {
  res.json({
    ok: true,
    name: "lances-electron",
    version: "1.0.0",
    host: os.hostname(),
  });
});

/** Start server */
const PORT = Number(process.env.API_PORT || 3030);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🟢 API online em http://localhost:${PORT}`);
});

export function startApiServer() {
  app.listen(3030, () => {
    console.log("🟢 API local rodando em http://localhost:3030");
  });
}
