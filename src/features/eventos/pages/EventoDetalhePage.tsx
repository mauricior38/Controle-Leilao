// src/features/eventos/pages/EventoDetalhePage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { format, intervalToDuration, formatDuration } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LotesTab from "@/features/components/LotesTab";
import { LoteEmPista } from "@/features/components/LotesEmPista";
import { RelatorioTab } from "@/features/components/RelatorioTab";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import GcDuasLinhasTab from "@/features/components/GcDuasLinhasTab";
import GcDuasLinhasNoAr from "@/features/components/GcDuasLinhasNoAr";
import { apiFetch } from "@/lib/api";
import ConfigEventoTab from "@/features/components/ConfigEventoTab";
import { TelefonesTab } from "@/features/components/TelefonesTab";
import { Circle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Evento {
  id: number;
  nome: string;
  data: string;
  descricao?: string;
  start_time?: string;
  end_time?: string;
  condicao_pagamento_padrao?: string;
}

const OPCOES_CONDICAO = [
  "2 + 2 + 2 + 2 + 2 + 40 = 50",
  "2 + 2 + 2 + 2 + 20 = 30",
  "3 + 3 + 3 + 31 = 40",
  "À vista",
  "Outro",
];

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

  const [condicaoPreset, setCondicaoPreset] = useState<string>("");
  const [condicaoCustom, setCondicaoCustom] = useState<string>("");

  const [confirmarInicio, setConfirmarInicio] = useState(false);
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false);

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
    if (!evento) return;
    if (editando) {
      const atual = evento.condicao_pagamento_padrao ?? "";
      const presetEncontrado =
        OPCOES_CONDICAO.find((op) => op !== "Outro" && op === atual) ??
        (atual ? "Outro" : "");
      setCondicaoPreset(presetEncontrado);
      setCondicaoCustom(presetEncontrado === "Outro" ? atual : "");
    }
  }, [editando, evento]);

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

      const condicaoFinal =
        condicaoPreset === "Outro"
          ? condicaoCustom || null
          : condicaoPreset || null;

      await apiFetch(`/eventos/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          nome: evento.nome,
          data: evento.data,
          descricao: evento.descricao,
          condicao_pagamento_padrao: condicaoFinal, // 👈 NOVO
        }),
      });

      setEditando(false);
      await carregarEvento(id); // refaz GET
    } catch (e) {
      console.error(e);
      setErrorMsg("Erro ao atualizar evento");
    } finally {
      setLoading(false);
    }
  }

  function formatDHMS(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }

  async function fetchEvento() {
    if (!id) return;
    const res = await apiFetch(`/eventos/${id}`, { method: "GET" });
    const json = await res.json();
    setEvento(json);
  }

  useEffect(() => {
    fetchEvento();
  }, [id]);

  // Cronômetro
  const startTs = useMemo(() => {
    if (!evento?.start_time) return null;
    return new Date(evento.start_time).getTime();
  }, [evento?.start_time]);

  const endTs = useMemo(() => {
    if (!evento?.end_time) return null;
    return new Date(evento.end_time).getTime();
  }, [evento?.end_time]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = useMemo(() => {
    if (!startTs) return 0;
    return Math.max(0, startTs - now);
  }, [startTs, now]);

  const { days, hours, minutes, seconds } = formatDHMS(remainingMs);

  const jaComecou = useMemo(() => {
    if (!startTs) return false;
    return now >= startTs;
  }, [now, startTs]);

  const encerrado = !!endTs;

  // Ações
  async function handleIniciarAgora() {
    if (!id) return;
    await apiFetch(`/eventos/${id}/iniciar`, { method: "PATCH" });
    await fetchEvento();
  }

  async function handleEncerrar() {
    if (!id) return;
    await apiFetch(`/eventos/${id}/encerrar`, { method: "PATCH" });
    await fetchEvento();
  }

  const podeEncerrar = jaComecou && !encerrado;
  const podeIniciarManual = !encerrado && !jaComecou;

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
          <div className="flex gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                Voltar
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmarInicio(true)}
                disabled={!podeIniciarManual}
                title={
                  podeIniciarManual
                    ? "Iniciar evento agora"
                    : "Disponível apenas antes do início"
                }
              >
                Iniciar evento agora
              </Button>

              <Button
                variant="destructive"
                onClick={() => setConfirmarEncerrar(true)}
                disabled={!podeEncerrar}
                title={
                  podeEncerrar
                    ? "Encerrar evento"
                    : "Disponível somente após o início"
                }
              >
                Encerrar evento
              </Button>
            </div>

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
          </div>

          {!encerrado ? (
            <div className="text-xl">
              {jaComecou ? (
                // <span>Evento em andamento.</span>
                <div className="flex gap-1">
                  <span className="bg-current px-4 py-2 rounded-lg flex flex-col  justify-center items-center">
                    <Circle className="bg-green-400 rounded-full pulse-smooth w-3 h-3" />
                    <p className="text-white text-sm font-normal">
                      Evento em andamento
                    </p>
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-1">
                    <span className="bg-current px-2 py-2 rounded-lg flex flex-col max-w-[60px] justify-center items-center">
                      <p className="text-white text-sm font-thin">Dias</p>
                      <p className="text-white">{days}</p>
                    </span>

                    <span className="bg-current px-2 py-2 rounded-lg flex flex-col max-w-[60px] justify-center items-center">
                      <p className="text-white text-sm font-thin">Horas</p>
                      <p className="text-white">{hours}</p>
                    </span>

                    <span className="bg-current px-2 py-2 rounded-lg flex flex-col max-w-[60px] justify-center items-center">
                      <p className="text-white text-sm font-thin">Minutos</p>
                      <p className="text-white">{minutes}</p>
                    </span>

                    <span className="bg-current px-2 py-2 rounded-lg flex flex-col max-w-[70px] justify-center items-center">
                      <p className="text-white text-sm font-thin">Segundos</p>
                      <p className="text-white">{seconds}</p>
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-1">
              <span className="bg-current px-4 py-2 rounded-lg flex justify-center items-center gap-2">
                <Circle className="bg-red-400 rounded-full pulse-smooth w-3 h-3" />
                <p className="text-white text-sm font-normal">
                  Evento encerrado
                </p>
              </span>
            </div>
          )}
        </div>

        {editando ? (
          <>
            <Input
              type="datetime-local"
              value={format(new Date(evento.data), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => setEvento({ ...evento, data: e.target.value })}
            />

            <div className="mt-3 space-y-2">
              <Label>Condição de pagamento padrão</Label>
              <Select value={condicaoPreset} onValueChange={setCondicaoPreset}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {OPCOES_CONDICAO.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {condicaoPreset === "Outro" && (
                <Input
                  className="mt-2"
                  placeholder="Descreva a condição"
                  value={condicaoCustom}
                  onChange={(e) => setCondicaoCustom(e.target.value)}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <p className="opacity-60">
              {new Date(evento.data).toLocaleString()}
            </p>
            {/* {evento.descricao && <p>{evento.descricao}</p>} */}
          </>
        )}

        <Card>
          <CardTitle className="p-2 text-2xl">
            {evento?.nome ?? "Evento"}
          </CardTitle>

          <CardContent>
            <CardDescription>
              {new Date(evento.data).toLocaleDateString("pt-BR", {
                day: "2-digit",
              })}
              /
              {new Date(evento.data).toLocaleDateString("pt-BR", {
                month: "2-digit",
              })}
              /
              {new Date(evento.data).toLocaleDateString("pt-BR", {
                year: "numeric",
              })}
            </CardDescription>
            <CardDescription>Evento Id: {evento?.id}</CardDescription>
            <CardDescription>
              Condição de pagamento padrão: {evento?.condicao_pagamento_padrao}
            </CardDescription>
            <CardDescription>
              Inicio previsto para:{" "}
              {new Date(evento.data).toLocaleDateString("pt-BR")}
            </CardDescription>

            <CardDescription>
              Horário: {new Date(evento.data).getHours()}:
              {String(new Date(evento.data).getMinutes()).padStart(2, "0")}
              {/* {new Date(evento.data).getHours()} */}
            </CardDescription>
          </CardContent>
        </Card>

        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

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

      <Dialog open={confirmarInicio} onOpenChange={setConfirmarInicio}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar evento?</DialogTitle>
            <DialogDescription>
              Ao iniciar o evento, o cronômetro será zerado e o evento entrará
              em andamento.
              <br />
              <strong>
                Depois disso, a única ação disponível será encerrar o evento.
              </strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmarInicio(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await handleIniciarAgora();
                setConfirmarInicio(false);
              }}
            >
              Iniciar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarEncerrar} onOpenChange={setConfirmarEncerrar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Encerrar evento?</DialogTitle>
            <DialogDescription>
              Ao encerrar, o evento será finalizado e não poderá ser reiniciado.
              <br />
              Confirme para prosseguir.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmarEncerrar(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleEncerrar();
                setConfirmarEncerrar(false);
              }}
            >
              Encerrar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
