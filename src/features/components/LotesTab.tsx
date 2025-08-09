import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Pencil, Trash2, Copy } from "lucide-react";
import CadastrarLoteModal from "./CadastrarLoteModal";
import EditarLoteModal from "./EditarLoteModal";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Lote {
  qtd_lances: ReactNode;
  id: number;
  nome_animal: string;
  valor: number;
  lote: string;
  gira_1?: string;
  gira_2?: string;
  gira_3?: string;
  gira_4?: string;
  gira_5?: string;
  gira_6?: string;
  condicao_pagamento?: string;
  status: "aguardando" | "em_pista" | "vendido";
  incompleto?: boolean;
}

interface Props {
  eventoId: number;
  evento: {
    id: number;
    nome: string;
    data: string;
    descricao?: string;
    condicao_pagamento_padrao?: string;
  };
  refresh?: number;
  onRefreshPista?: () => void;
}

export default function LotesTab({
  eventoId,
  onRefreshPista,
  refresh,
  evento,
}: Props) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [localRefresh, setLocalRefresh] = useState(0);

  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<"lote" | "nome_animal">("lote");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [loteSelecionado, setLoteSelecionado] = useState<Lote | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editarAberto, setEditarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  // const [copiarLote, setCopiarLote] = useState<Lote | null>(null);
  const [modalCopiarAberto, setModalCopiarAberto] = useState(false);

  const [dialogLancesAberto, setDialogLancesAberto] = useState(false);
  const [lancesDoLote, setLancesDoLote] = useState<
    { valor: number; timestamp: string }[]
  >([]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [condicaoPagamento, setCondicaoPagamento] = useState(
    evento?.condicao_pagamento_padrao ?? "2 + 2 + 2 + 2 + 30 = 40"
  );
  const [condicaoCustom, setCondicaoCustom] = useState("");

  const [copiarModalAberto, setCopiarModalAberto] = useState(false);

  useEffect(() => {
    if (refresh !== undefined) {
      setLocalRefresh((r) => r + 1);
    }
  }, [refresh]);

  useEffect(() => {
    fetch(`http://localhost:3030/eventos/${eventoId}/lotes`)
      .then((res) => res.json())
      .then(setLotes);
  }, [eventoId, refresh]);

  useEffect(() => {
    const params = new URLSearchParams({
      search,
      searchBy,
      page: String(page),
      limit: String(limit),
    });

    fetch(`http://localhost:3030/eventos/${eventoId}/lotes?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLotes(Array.isArray(data.lotes) ? data.lotes : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch((err) => {
        console.error("Erro ao buscar lotes:", err);
        setLotes([]);
        setTotal(0);
      });
  }, [eventoId, localRefresh, search, page]);

  async function handleColocarEmPista(loteId: number) {
    try {
      const res = await fetch(
        `http://localhost:3030/eventos/${eventoId}/lotes/${loteId}/colocar-em-pista`,
        { method: "POST" }
      );
      if (res.ok) {
        toast.success("Lote colocado em pista com sucesso");
        setLocalRefresh((r) => r + 1);
        onRefreshPista?.();
      } else {
        const error = await res.json();
        toast.error(
          "Erro ao colocar lote em pista: " + error?.error ||
            "Erro desconhecido"
        );
      }
    } catch (err) {
      toast.error("Erro na requisição");
      console.error(err);
    }
  }

  async function handleAtualizarStatus(lote: Lote) {
    const res = await fetch(`http://localhost:3030/lotes/${lote.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: lote.status }),
    });

    if (res.ok) {
      toast.success(`Status atualizado para ${lote.status}`);
      setLocalRefresh((r) => r + 1);
      if (lote.status === "vendido" && onRefreshPista) {
        onRefreshPista();
      }
    } else {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm("Deseja realmente excluir este lote?")) return;
    const res = await fetch(`http://localhost:3030/lotes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Lote excluído com sucesso");
      setLocalRefresh((r) => r + 1);
    } else {
      toast.error("Erro ao excluir lote");
    }
  }

  async function handleUploadExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("evento_id", String(eventoId));

    try {
      const res = await fetch("http://localhost:3030/lotes/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        toast.success("Lotes importados com sucesso!");
        setLocalRefresh((r) => r + 1);
      } else {
        toast.error("Erro ao importar lotes");
      }
    } catch (err) {
      toast.error("Erro de rede ao importar");
      console.error(err);
    }

    event.target.value = "";
  }

  function handleAbrirLancesDialog(idLote: number) {
    fetch(`http://localhost:3030/lotes/${idLote}/lances`)
      .then((res) => res.json())
      .then((data) => {
        setLancesDoLote(data);
        setDialogLancesAberto(true);
      });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Select
          value={searchBy}
          onValueChange={(value) =>
            setSearchBy(value as "lote" | "nome_animal")
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lote">Número do Lote</SelectItem>
            <SelectItem value="nome_animal">Nome do Animal</SelectItem>
          </SelectContent>
        </Select>

        {condicaoPagamento === "outro" && (
          <Input
            placeholder="Informe a condição de pagamento"
            value={condicaoCustom}
            onChange={(e) => setCondicaoCustom(e.target.value)}
          />
        )}

        <Input
          placeholder="Buscar por nome ou lote..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2">
          <Dialog
            open={
              modalCopiarAberto === false && editarAberto === false && false
            } // desativa este Dialog
          >
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => setModalCopiarAberto(true)} // 👉 ative o modal como no copiar
              >
                <PlusCircle size={16} /> Novo Lote
              </Button>
            </DialogTrigger>
          </Dialog>

          <Dialog open={modalCopiarAberto} onOpenChange={setModalCopiarAberto}>
            <DialogContent>
              <CadastrarLoteModal
                eventoId={eventoId}
                onSuccess={() => {
                  setModalCopiarAberto(false); // ✅ fecha o modal
                  setLocalRefresh((r) => r + 1); // ✅ atualiza a lista
                }}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => document.getElementById("excelUpload")?.click()}
          >
            <PlusCircle size={16} /> Importar Excel
          </Button>

          <input
            id="excelUpload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUploadExcel}
          />
        </div>
      </div>

      {!Array.isArray(lotes) || lotes.length === 0 ? (
        <p className="text-muted-foreground">Nenhum lote cadastrado.</p>
      ) : (
        <ul className="space-y-2">
          {lotes.map((lote) => (
            <li
              key={lote.id}
              className="border rounded p-4 flex justify-between items-center"
            >
              <div className="flex gap-5 ">
                <div className="flex flex-col items-center justify-center bg-primary p-2 rounded-md max-w-20">
                  <p className="text-white/80 font-extralight break-words whitespace-normal text-center">
                    LOTE
                  </p>
                  <h3
                    className={`text-white/100 font-extrabold break-words w-full max-w-xs text-center ${
                      lote.lote.length > 4 ? "text-sm" : "text-3xl"
                    }`}
                  >
                    {lote.lote}
                  </h3>
                </div>

                <div>
                  <h3 className="font-medium">{lote.nome_animal}</h3>
                  <p className="text-sm text-muted-foreground">
                    ID: {lote.id} | Lote: {lote.lote} | Valor: R${" "}
                    {lote.valor.toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {lote.incompleto ? (
                      <Badge variant="destructive">Incompleto</Badge>
                    ) : (
                      <Badge variant="default">Completo</Badge>
                    )}

                    <Badge
                      variant={
                        lote.status === "em_pista"
                          ? "default"
                          : lote.status === "vendido"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {lote.status === "em_pista"
                        ? "em_pista"
                        : lote.status === "vendido"
                        ? "Vendido"
                        : "Aguardando"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {lote.status === "aguardando" && (
                  <Button
                    // className="mt-2"
                    variant="aguardando_pista"
                    onClick={() => handleColocarEmPista(lote.id)}
                  >
                    Puxar para pista
                  </Button>
                )}
                <Select
                  value={lote.status}
                  onValueChange={async (newStatus) => {
                    if (newStatus === "em_pista") {
                      await handleAtualizarStatus({
                        ...lote,
                        status: "em_pista",
                      });
                      await handleColocarEmPista(lote.id);
                    } else {
                      await handleAtualizarStatus({
                        ...lote,
                        status: newStatus as Lote["status"],
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="em_pista">Vendendo</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setLoteSelecionado(lote);
                    setCopiarModalAberto(true);
                  }}
                  title="Copiar lote"
                >
                  <Copy size={16} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setLoteSelecionado(lote);
                    setModalEditarAberto(true);
                  }}
                >
                  <Pencil size={16} />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleExcluir(lote.id)}
                >
                  <Trash2 size={16} />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleAbrirLancesDialog(lote.id)}
                >
                  {lote.qtd_lances}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-center items-center gap-4 mt-4">
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </Button>
        <span>
          Página {page} de {Math.ceil(total / limit) || 1}
        </span>
        <Button
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>

      {copiarModalAberto && loteSelecionado && (
        <Dialog open={copiarModalAberto} onOpenChange={setCopiarModalAberto}>
          <DialogContent>
            <DialogTitle>Copiar Lote</DialogTitle>
            <EditarLoteModal
              lote={loteSelecionado}
              eventoId={eventoId}
              modo="copia"
              onSuccess={() => {
                setCopiarModalAberto(false);
                setLoteSelecionado(null);
                setLocalRefresh((r) => r + 1);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent>
          <DialogTitle>Editar lote</DialogTitle>
          {loteSelecionado && (
            <EditarLoteModal
              eventoId={evento.id}
              lote={loteSelecionado}
              onSuccess={() => {
                setModalEditarAberto(false);
                setLocalRefresh((r) => r + 1);
                setLoteSelecionado(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogLancesAberto} onOpenChange={setDialogLancesAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lances Recebidos</DialogTitle>
          </DialogHeader>

          {lancesDoLote.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lance registrado.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {lancesDoLote.map((lance, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b pb-1 text-sm"
                >
                  <span>R$ {lance.valor.toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(lance.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
