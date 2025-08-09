import { formatDuration, intervalToDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";

interface ItemRelatorio {
  id: number;
  lote: string;
  nome_animal: string;
  valor: number;
  condicao_pagamento: string;
  valor_total: number; // ← novo campo
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
  // const [somaTotal, setSomaTotal] = useState(0);

  // const somaTotalNumber = Number(somaTotal) || 0;

  useEffect(() => {
    fetch(`http://localhost:3030/eventos/${evento.id}/relatorio`)
      .then((res) => res.json())
      .then((data) => {
        setItens(data);
      });
  }, [evento.id]);

  function toNumberBR(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      // remove separador de milhar e converte vírgula para ponto
      return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return 0;
  }

  const somaTotal = (itens ?? []).reduce((acc, item) => {
    const base = item.valor_total ?? item.valor ?? 0; // prioriza valor_total
    return acc + toNumberBR(base);
  }, 0);

  function formatBR(n: number): string {
    return n >= 100
      ? n.toLocaleString("pt-BR", { minimumFractionDigits: 0 })
      : n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  return (
    <div className="p-4">
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

      <h2 className="text-xl font-bold mb-4">Relatório de Vendas</h2>
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
              <td>
                R${" "}
                {Number(item.valor).toLocaleString("pt-BR", {
                  minimumFractionDigits: Number(item.valor) >= 100 ? 0 : 2,
                })}
              </td>
              <td>{item.condicao_pagamento}</td>
              <td>
                R${" "}
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
            <td className="p-2" colSpan={2}>
              Total
            </td>
            <td className="p-2">R$ {formatBR(somaTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
