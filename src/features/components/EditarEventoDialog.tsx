import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";

import EditarEventoDialog from "../components/EditarEventoDialog";


type Evento = {
  id: number;
  nome: string;
  data: string; // ISO
  descricao?: string | null;
  condicao_pagamento_padrao?: string | null;
};

const OPCOES = [
  "2 + 2 + 2 + 2 + 2 + 40 = 50",
  "2 + 2 + 2 + 2 + 20 = 30",
  "3 + 3 + 3 + 31 = 40",
  "À vista",
  "Outro",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: Evento;
  onSaved?: () => void;
}

export default function EditarEventoDialog({
  open,
  onOpenChange,
  evento,
  onSaved,
}: Props) {
  const [nome, setNome] = useState(evento?.nome ?? "");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [condicao, setCondicao] = useState(
    evento?.condicao_pagamento_padrao ?? ""
  );
  const [condicaoPreset, setCondicaoPreset] = useState<string>(() => {
    const encontrada = OPCOES.find(
      (o) => o !== "Outro" && o === (evento?.condicao_pagamento_padrao ?? "")
    );
    return encontrada ?? (evento?.condicao_pagamento_padrao ? "Outro" : "");
  });
  const [condicaoCustom, setCondicaoCustom] = useState(
    condicaoPreset === "Outro" ? evento?.condicao_pagamento_padrao ?? "" : ""
  );

  // datetime-local precisa de "YYYY-MM-DDTHH:mm"
  const dataLocalDefault = useMemo(() => {
    const d = evento?.data ? new Date(evento.data) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [evento?.data]);
  const [dataLocal, setDataLocal] = useState(dataLocalDefault);

  useEffect(() => {
    setNome(evento?.nome ?? "");
    setDescricao(evento?.descricao ?? "");
    setCondicao(evento?.condicao_pagamento_padrao ?? "");
    setCondicaoPreset((prev) => {
      const encontrada = OPCOES.find(
        (o) => o !== "Outro" && o === (evento?.condicao_pagamento_padrao ?? "")
      );
      return encontrada ?? (evento?.condicao_pagamento_padrao ? "Outro" : "");
    });
    setCondicaoCustom(evento?.condicao_pagamento_padrao ?? "");
    const d = evento?.data ? new Date(evento.data) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setDataLocal(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`
    );
  }, [evento, open]);

  useEffect(() => {
    if (condicaoPreset === "Outro") {
      setCondicao(condicaoCustom);
    } else if (condicaoPreset) {
      setCondicao(condicaoPreset);
    }
  }, [condicaoPreset, condicaoCustom]);

  

  async function handleSalvar() {
    const body = {
      nome,
      descricao: descricao || null,
      data: new Date(dataLocal).toISOString(),
      condicao_pagamento_padrao: condicao || null,
    };
    await apiFetch(`/eventos/${evento.id}`, { method: "PATCH", json: body });
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <Label>Data e hora</Label>
            <Input
              type="datetime-local"
              value={dataLocal}
              onChange={(e) => setDataLocal(e.target.value)}
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Condição de pagamento padrão</Label>
            <Select value={condicaoPreset} onValueChange={setCondicaoPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {condicaoPreset === "Outro" && (
              <Input
                placeholder="Descreva a condição"
                value={condicaoCustom}
                onChange={(e) => setCondicaoCustom(e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
