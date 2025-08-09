"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const xlsx_1 = __importDefault(require("xlsx"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const excelPath = path_1.default.resolve(__dirname, "../GC LOTES - COPIAR,COLAR E NÃO APAGAR.xlsx");
const eventoId = 1; // ✅ Defina o ID do evento alvo aqui
async function importarLotes() {
    if (!fs_1.default.existsSync(excelPath)) {
        console.error("Arquivo Excel não encontrado:", excelPath);
        return;
    }
    const workbook = xlsx_1.default.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx_1.default.utils.sheet_to_json(sheet);
    for (const [index, row] of data.entries()) {
        const lote = {
            evento_id: eventoId,
            valor: 0, // Campo em branco no Excel
            lote: String(row["LOTE"]),
            nome_animal: row["LINHA 1 - NOME ANIMAL"],
            gira_1: row["LINHA 2 - GIRA"],
            gira_2: row["LINHA 3 - GIRA"],
            gira_3: row["LINHA 4 - GIRA"],
            gira_4: row["LINHA 5 - GIRA"],
            gira_5: row["LINHA 6 - GIRA"],
            condicao_pagamento: row["CONDICAO DE PAGAMENTO"],
        };
        try {
            const res = await (0, node_fetch_1.default)("http://localhost:3030/lotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lote),
            });
            if (res.ok) {
                const result = await res.json();
                console.log(`✅ Lote ${lote.lote} importado com ID ${result.id}`);
            }
            else {
                console.error(`❌ Erro ao importar lote ${lote.lote}:`, await res.text());
            }
        }
        catch (err) {
            console.error(`❌ Erro de conexão ao importar lote ${lote.lote}:`, err);
        }
    }
}
importarLotes();
