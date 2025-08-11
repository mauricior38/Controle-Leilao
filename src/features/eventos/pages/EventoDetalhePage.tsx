// src/features/eventos/pages/EventoDetalhePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { format, intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LotesTab from "@/features/components/LotesTab";
import { LoteEmPista } from "@/features/components/LotesEmPista";
import { RelatorioTab } from "@/features/components/RelatorioTab";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import GcDuasLinhasTab from "@/features/components/GcDuasLinhasTab";
import GcDuasLinhasNoAr from "@/features/components/GcDuasLinhasNoAr";
import { apiFetch } from "@/lib/api";
import { Label } from "@radix-ui/react-label";
import ConfigEventoTab from "@/features/components/ConfigEventoTab";
import { TelefonesTab } from "@/features/components/TelefonesTab";

interface Evento {
  id: number;
  nome: string;
  data: string;
  descricao?: string;
  start_time?: string;
  end_time?: string;
  condicao_pagamento_padrao?: string;
}

export default function EventoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [editando, setEditando] = useState(false);
  const [refreshPista, setRefreshPista] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [refreshGCNoAr, setRefreshGCNoAr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function carregarEvento(eventoId: string) {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await apiFetch(`/eventos/${eventoId}`);
      const data = await res.json();
      setEvento(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErrorMsg(e?.message || "Falha ao carregar evento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) carregarEvento(id);
  }, [id]);

  // ⏳ Cronômetro regressivo
  useEffect(() => {
    const interval = setInterval(() => {
      if (evento?.start_time) {
        const now = new Date();
        const inicio = new Date(evento.start_time);

        if (inicio > now) {
          const duration = intervalToDuration({ start: now, end: inicio });
          const formatado = formatDuration(duration, {
            format: ["days", "hours", "minutes", "seconds"],
            locale: ptBR,
          });
          setCountdown(formatado);
        } else {
          setCountdown("Evento já começou");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [evento?.start_time]);

  async function handleDeletar() {
    if (!id) return;
    try {
      setLoading(true);
      await apiFetch(`/eventos/${id}`, { method: "DELETE" });
      navigate("/");
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro ao excluir evento");
    } finally {
      setLoading(false);
    }
  }

  async function handleAtualizar() {
    if (!id || !evento) return;
    try {
      setLoading(true);
      await apiFetch(`/eventos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: evento.nome,
          data: evento.data,
          descricao: evento.descricao,
        }),
      });
      setEditando(false);
      await carregarEvento(id); // refaz GET (PUT retorna 204)
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro ao atualizar evento");
    } finally {
      setLoading(false);
    }
  }

  async function encerrarEvento() {
    if (!id) return;
    try {
      setLoading(true);
      await apiFetch(`/eventos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ end_time: new Date().toISOString() }),
      });
      await carregarEvento(id);
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro ao encerrar evento");
    } finally {
      setLoading(false);
    }
  }

  if (!evento) {
    return (
      <p className="p-6">
        {loading ? "Carregando evento..." : errorMsg || "Carregando evento..."}
      </p>
    );
  }

  return (
    <>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          {/* {evento.condicao_pagamento_padrao} */}
          {editando ? (
            <Label>
              <Input
                value={evento.nome}
                onChange={(e) => setEvento({ ...evento, nome: e.target.value })}
              />
            </Label>
          ) : (
            <h1 className="text-2xl font-bold">
              {evento.nome} (ID: {evento.id})
            </h1>
          )}
          <div className="flex gap-2">
            {editando ? (
              <Button onClick={handleAtualizar} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setEditando(true)}>
                Editar
              </Button>
            )}
            <Dialog
              open={confirmandoExclusao}
              onOpenChange={setConfirmandoExclusao}
            >
              <DialogTrigger asChild>
                <Button variant="destructive">Excluir Evento</Button>
              </DialogTrigger>

              <DialogContent className="max-w-sm text-center">
                <h2 className="text-lg font-semibold">
                  Tem certeza que deseja excluir?
                </h2>
                <p className="text-muted-foreground mb-4">
                  Esta ação não poderá ser desfeita.
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmandoExclusao(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeletar();
                      setConfirmandoExclusao(false);
                    }}
                  >
                    Confirmar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
          </div>
        </div>

        {editando ? (
          <>
            <Input
              type="datetime-local"
              value={format(new Date(evento.data), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setEvento({ ...evento, data: e.target.value })}
            />
          </>
        ) : (
          <>
            <p className="opacity-60">
              {new Date(evento.data).toLocaleString()}
            </p>
            {evento.descricao && <p>{evento.descricao}</p>}
          </>
        )}

        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

        {/* ✅ Cronômetro Regressivo */}
        {evento.start_time && !evento.end_time && countdown && (
          <div className="text-lg font-semibold text-green-600">
            ⏳ Faltam {countdown} para o início do evento
          </div>
        )}

        {/* ✅ Botão Encerrar Evento */}
        {evento.start_time && !evento.end_time && (
          <Button
            variant="destructive"
            onClick={encerrarEvento}
            disabled={loading}
          >
            {loading ? "Encerrando..." : "Encerrar Evento"}
          </Button>
        )}
        <GcDuasLinhasNoAr eventoId={evento.id} refresh={refreshGCNoAr} />

        {/* ✅ Em pista */}
        <LoteEmPista
          idEvento={evento.id}
          refresh={refreshPista}
          onRefreshLotes={() => setRefreshPista((r) => r + 1)}
        />
      </div>

      <Tabs defaultValue="lotes" className="w-full px-6">
        <TabsList>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="duas_linhas">Duas Linhas</TabsTrigger>
          <TabsTrigger value="telefones">Telefones</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          <TabsTrigger value="configuracao">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes">
          <LotesTab
            evento={evento}
            eventoId={evento.id}
            refresh={refreshPista}
            onRefreshPista={() => setRefreshPista((r) => r + 1)}
          />
        </TabsContent>

        <TabsContent value="duas_linhas">
          <GcDuasLinhasTab
            eventoId={evento.id}
            setRefreshGCNoAr={setRefreshGCNoAr}
          />
        </TabsContent>

        <TabsContent value="telefones">
          <TelefonesTab eventoId={evento.id} />
        </TabsContent>

        <TabsContent value="relatorio">
          <RelatorioTab evento={evento} />
        </TabsContent>

        <TabsContent value="configuracao">
          <ConfigEventoTab eventoId={evento.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
