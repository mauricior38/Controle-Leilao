// electron/apiServer.ts
import express from "express";
import cors from "cors";
import multer from "multer";
import xlsx from "xlsx";

import {
  criarTabelaEventos,
  listarEventos,
  inserirEvento,
  getEventoPorId,
  deletarEvento,
  editarEvento,
  encerrarEvento,
  type Evento,
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
app.use(cors());
app.use(express.json());

criarTabelaEventos();
adicionarColunaStatusSeNaoExistir();
adicionarColunaIncompletoSeNaoExistir();

interface LoteEmPistaOut {
  valor: string; // string conforme seu exemplo
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
}

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

function extrairParcelas(condicao: string | null | undefined): number {
  if (!condicao) return 1;
  const m = condicao.match(/=\s*(\d+)/); // pega número após "="
  if (m && m[1]) {
    const num = Number(m[1]);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 1;
}

// Rotas de eventos
app.get("/eventos", (req, res) => {
  try {
    const eventos: Evento[] = listarEventos();

    const payload: EventoOut[] = eventos.map((ev) => {
      const lotesRaw: LoteEmPistaDTO[] = getLotesEmPista(ev.id);

      const lotes_em_pista: LoteEmPistaOut[] = lotesRaw.map((l) => ({
        valor: formatValorBR(Number(l.valor)), // <- usar l.valor
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
  const id = Number(req.params.id);
  const evento = getEventoPorId(id);
  if (!evento) return res.status(404).json({ error: "Evento não encontrado" });
  res.json(evento);
});

app.put("/eventos/:id", (req, res) => {
  const id = Number(req.params.id);
  const { nome, data, descricao } = req.body;
  try {
    editarEvento(id, nome, data, descricao);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Erro ao editar evento" });
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

app.patch("/eventos/:id", (req, res) => {
  const id = Number(req.params.id);
  const { end_time } = req.body;

  if (!end_time) {
    return res.status(400).json({ error: "Campo 'end_time' obrigatório" });
  }

  try {
    encerrarEvento(id, end_time);
    res.status(200).json({ message: "Evento encerrado com sucesso" });
  } catch (error) {
    console.error("Erro ao encerrar evento:", error);
    res.status(500).json({ error: "Erro interno ao encerrar evento" });
  }
});

app.post("/lotes", (req, res) => {
  try {
    const data = req.body;
    const loteCorrigido = gerarLoteDisponivel(data.evento_id, data.lote);
    const loteData = { ...data, lote: loteCorrigido };
    const id = cadastrarLote(loteData); // ✅ inclui verificação de incompleto
    res.status(201).json({ id, lote: loteCorrigido });
  } catch (err) {
    console.error("❌ Erro detalhado ao cadastrar lote:", err);
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

app.get("/eventos/:id/lotes", (req, res) => {
  const eventoId = Number(req.params.id);
  const search = String(req.query.search || "").toLowerCase();
  const page = String(req.query.page || "1");
  const limit = String(req.query.limit || "10");
  const searchBy = String(req.query.searchBy || "nome_animal");

  try {
    const { lotes, total } = getLotesPorEvento(
      eventoId,
      search,
      searchBy,
      Number(page),
      Number(limit)
    );
    res.json({ lotes, total });
  } catch (err) {
    console.error("Erro ao listar lotes:", err);
    res.status(500).json({ error: "Erro ao buscar lotes" });
  }
});

// Atualizar status de lote
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

// Upload via Excel
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

    // Busca a condição de pagamento padrão do evento
    const evento = getEventoPorId(eventoId);
    const condicaoPadrao = evento?.condicao_pagamento_padrao || "";
    console.log("🟢 Condição padrão do evento:", condicaoPadrao);

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    let importados = 0;
    let ignorados = 0;

    for (const row of data as any[]) {
      const nome = row["LINHA 1 - NOME ANIMAL"];
      const loteBase = row["LOTE"];

      if (!nome || !loteBase) {
        console.warn("❌ Linha ignorada:", row);
        ignorados++;
        continue;
      }

      const loteFinal = gerarLoteDisponivel(eventoId, String(loteBase));

      const gira_1 = (row["LINHA 2 - GIRA"] ?? "").toString().trim();
      const gira_2 = (row["LINHA 3 - GIRA"] ?? "").toString().trim();
      const gira_3 = (row["LINHA 4 - GIRA"] ?? "").toString().trim();
      const gira_4 = (row["LINHA 5 - GIRA"] ?? "").toString().trim();
      const gira_5 = (row["LINHA 6 - GIRA"] ?? "").toString().trim();
      const gira_6 = ""; // Você pode ajustar isso se quiser permitir via planilha

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
      } catch (err) {
        console.warn("❌ Erro ao importar linha:", err);
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

// Lotes em Pista
app.get("/eventos/:id/lotes-em-pista", (req, res) => {
  const idEvento = Number(req.params.id);
  const lotes = getLotesEmPista(idEvento);
  res.json(lotes);
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

app.get("/lotes/:id/lances", (req, res) => {
  const idLote = Number(req.params.id);
  try {
    const lances = getLancesDeLote(idLote);
    res.json(lances);
  } catch (error) {
    console.error("Erro ao buscar lances do lote:", error);
    res.status(500).json({ error: "Erro ao buscar lances do lote" });
  }
});

// import { getRelatorioDoEvento } from "./services/lotesService";

// import { getRelatorioDoEvento } from "./services/lotesService";

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

app.patch("/lotes/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    // Calcular se é incompleto
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

export function startApiServer() {
  app.listen(3030, () => {
    console.log("🟢 API local rodando em http://localhost:3030");
  });
}

// Listar
app.get("/gc/:eventoId", (req, res) => {
  const eventoId = Number(req.params.eventoId);
  const gcs = listarGCsPorEvento(eventoId);
  res.json(gcs);
});

// Criar
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

// Atualizar
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

// Excluir
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

// Define o GC no ar
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

// Retorna GC no ar
app.get("/gc-duas-linhas-no-ar/:eventoId", (req, res) => {
  const eventoId = Number(req.params.eventoId);
  const gc = obterGCNoAr(eventoId);
  res.json(gc || null);
});
