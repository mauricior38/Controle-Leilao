// src/features/components/RelatorioTab.tsx
import { formatDuration, intervalToDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface ItemRelatorio {
  id: number;
  lote: string;
  nome_animal: string;
  valor: number;
  condicao_pagamento: string;
  valor_total: number; // total por item
}

interface Evento {
  id: number;
  start_time?: string;
  end_time?: string;
}

interface Props {
  evento: Evento;
}

export function RelatorioTab({ evento }: Props) {
  const [itens, setItens] = useState<ItemRelatorio[]>([]);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await apiFetch(`/eventos/${evento.id}/relatorio`);
        const json = await res.json();
        setItens(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Erro ao carregar relatório:", e);
        setItens([]);
      }
    }
    carregar();
  }, [evento.id]);

  function toNumberBR(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return 0;
  }

  const somaTotal = (itens ?? []).reduce((acc, item) => {
    const base = item.valor_total ?? item.valor ?? 0;
    return acc + toNumberBR(base);
  }, 0);

  function formatBR(n: number): string {
    return n >= 100
      ? n.toLocaleString("pt-BR", { minimumFractionDigits: 0 })
      : n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  async function exportarExcel() {
    try {
      setBaixando(true);
      // usa a rota dedicada .xlsx
      const res = await apiFetch(`/eventos/${evento.id}/relatorio.xlsx`, {
        // não precisa enviar Content-Type manualmente em GET
        method: "GET",
      });
      if (!res.ok) {
        // lê corpo como texto para facilitar debug
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `relatorio_evento_${evento.id}_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar Excel:", err);
      alert("Falha ao exportar Excel. Veja o console para detalhes.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Cabeçalho com infos do evento e duração */}
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-muted-foreground px-4 pb-2">
          <p>
            <strong>Início:</strong>{" "}
            {evento.start_time
              ? new Date(evento.start_time).toLocaleString()
              : "Não iniciado"}
          </p>
          <p>
            <strong>Término:</strong>{" "}
            {evento.end_time
              ? new Date(evento.end_time).toLocaleString()
              : "Em andamento"}
          </p>
          {evento.start_time && evento.end_time && (
            <p>
              <strong>Duração:</strong>{" "}
              {formatDuration(
                intervalToDuration({
                  start: new Date(evento.start_time),
                  end: new Date(evento.end_time),
                }),
                { format: ["hours", "minutes", "seconds"], locale: ptBR }
              )}
            </p>
          )}
        </div>

        <div className="pr-4 pt-2">
          <Button onClick={exportarExcel} disabled={baixando}>
            {baixando ? "Gerando Excel..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      <h2 className="text-xl font-bold">Relatório de Vendas</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-muted text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Lote</th>
            <th className="p-2">Nome Animal</th>
            <th className="p-2">Valor Vendido</th>
            <th className="p-2">Condição Pagamento</th>
            <th className="p-2">Valor total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="p-2">{item.id}</td>
              <td className="p-2">{item.lote}</td>
              <td className="p-2">{item.nome_animal}</td>
              <td className="p-2">
                R{"$ "}
                {Number(item.valor).toLocaleString("pt-BR", {
                  minimumFractionDigits: Number(item.valor) >= 100 ? 0 : 2,
                })}
              </td>
              <td className="p-2">{item.condicao_pagamento}</td>
              <td className="p-2">
                R{"$ "}
                {Number(item.valor_total || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits:
                    Number(item.valor_total) >= 100 ? 0 : 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="font-bold border-t">
            <td className="p-2" colSpan={4}>
              Total
            </td>
            <td className="p-2" colSpan={2}>
              R$ {formatBR(somaTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
