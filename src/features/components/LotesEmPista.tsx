// src/features/lotes/components/LoteEmPista.tsx
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import GCOverlayButton from "./GCOverlayButton";

interface Lote {
  id: number;
  lote: string;
  nome_animal: string;
  valor: number;
  status?: "aguardando" | "em_pista" | "vendido";
}

export function LoteEmPista({
  idEvento,
  refresh,
  onRefreshLotes,
}: {
  idEvento: number;
  refresh: number;
  onRefreshLotes?: () => void;
}) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [valorAtual, setValorAtual] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregarLotes() {
    try {
      const res = await apiFetch(`/eventos/${idEvento}/lotes-em-pista`);
      const data = await res.json();
      setLotes(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao carregar lotes em pista");
    }
  }

  useEffect(() => {
    carregarLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEvento, refresh]);

  async function atualizarValor(novoValor: number) {
    try {
      setValorAtual(novoValor);
      await apiFetch(`/eventos/${idEvento}/lances`, {
        method: "POST",
        body: JSON.stringify({ valor: novoValor }),
      });
      await carregarLotes();
      onRefreshLotes?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao atualizar valor");
    }
  }

  async function venderLote(idLote: number) {
    try {
      await apiFetch(`/eventos/${idEvento}/lotes/${idLote}/vender`, {
        method: "POST",
        body: JSON.stringify({ valor: valorAtual }),
      });
      toast.success("Lote vendido");
      await carregarLotes();
      onRefreshLotes?.();
      atualizarValor(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao vender lote");
    }
  }

  async function venderTodos() {
    try {
      await apiFetch(`/eventos/${idEvento}/lotes/vender-todos`, {
        method: "POST",
        body: JSON.stringify({ valor: valorAtual }),
      });
      toast.success("Todos os lotes vendidos");
      await carregarLotes();
      onRefreshLotes?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao vender todos os lotes");
    }
  }

  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="w-full bg-muted rounded-xl p-4 space-y-4 mb-4">
      <h2 className="text-xl font-bold">Lotes em Pista</h2>

      <GCOverlayButton
        eventoId={idEvento}
        targetVmix="vmix1" // ou "vmix2", se preferir
        overlay={1} // 1..4 conforme seu padrão
        vmixInput="LowerThirdGC" // ou "1", dep. do seu setup
        className="ml-2"
        labelOff="GC LOTE OFF"
        labelOn="GC LOTE ON"
      />

      <div className="flex items-center gap-4">
        <Input
          ref={inputRef}
          type="text"
          value={`R$ ${formatBRL(valorAtual)}`}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setValorAtual(Number(raw || 0));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") atualizarValor(valorAtual);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          -1000, -100, -50, -20, -10, 0, 10, 20, 50, 100, 1000, 5000, 10000,
        ].map((valor) => {
          const isNegativeTooBig = valor < 0 && valorAtual + valor < 0;

          return (
            <Button
              key={valor}
              variant={
                valor === 0
                  ? "default"
                  : valor > 0
                  ? "aguardando_pista"
                  : "destructive"
              }
              disabled={isNegativeTooBig}
              onClick={() => {
                if (valor === 0) {
                  atualizarValor(0);
                } else {
                  atualizarValor(valorAtual + valor);
                }
              }}
            >
              R{"$ "}
              {valor === 0
                ? "Zerar valor atual"
                : valor > 0
                ? `+${formatBRL(valor)}`
                : formatBRL(valor)}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lotes.map((lote) => (
          <div
            key={lote.id}
            className={`border rounded p-4 shadow flex justify-between items-center transition-all duration-300 ${
              lote.status === "em_pista"
                ? "bg-yellow-100 border-yellow-400"
                : "bg-white"
            }`}
          >
            <div>
              <p className="text-lg font-semibold">
                {lote.lote} - {lote.nome_animal}
              </p>
              <p className="text-muted-foreground text-sm">
                Valor atual: R$ {lote.valor.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="default" onClick={() => venderLote(lote.id)}>
                Vender Lote
              </Button>
            </div>
          </div>
        ))}
      </div>
      {lotes.length > 1 && (
        <Button variant="destructive" onClick={venderTodos}>
          Vender Todos os Lotes
        </Button>
      )}
    </div>
  );
}
