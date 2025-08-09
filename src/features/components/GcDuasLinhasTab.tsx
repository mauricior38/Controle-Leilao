import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

interface GC {
  id: number;
  nome: string;
  cargo: string;
}

interface Props {
  eventoId: number;
  setRefreshGCNoAr: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function GcDuasLinhasTab({ eventoId, setRefreshGCNoAr }: Props) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [gcs, setGCs] = useState<GC[]>([]);
  const [gcNoAr, setGCNoAr] = useState<GC | null>(null);

  const [modoEdicao, setModoEdicao] = useState<number | null>(null);

  function carregarGCs() {
    fetch(`http://localhost:3030/gc/${eventoId}`)
      .then((res) => res.json())
      .then(setGCs);
  }

  async function handleCadastrar() {
    if (!nome || !cargo) {
      toast.error("Preencha todos os campos");
      return;
    }

    const res = await fetch("http://localhost:3030/gc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId, nome, cargo }),
    });

    if (res.ok) {
      toast.success("GC cadastrado com sucesso");
      setNome("");
      setCargo("");
      carregarGCs();
    } else {
      toast.error("Erro ao cadastrar GC");
    }
  }

  async function handleSalvarEdicao(id: number) {
    if (!nome || !cargo) {
      toast.error("Preencha todos os campos");
      return;
    }

    const res = await fetch(`http://localhost:3030/gc/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cargo }),
    });

    if (res.ok) {
      toast.success("GC atualizado com sucesso");
      setNome("");
      setCargo("");
      setModoEdicao(null);
      carregarGCs();
    } else {
      toast.error("Erro ao atualizar GC");
    }
  }

  async function handleExcluir(id: number) {
    const confirm = window.confirm("Tem certeza que deseja excluir este GC?");
    if (!confirm) return;

    const res = await fetch(`http://localhost:3030/gc/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("GC excluído com sucesso");
      carregarGCs();
    } else {
      toast.error("Erro ao excluir GC");
    }
  }

  async function handleColocarNoAr(gcId: number) {
    const res = await fetch("http://localhost:3030/gc-duas-linhas-no-ar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento_id: eventoId, gc_id: gcId }),
    });

    if (res.ok) {
      toast.success("GC colocado no ar");
      setGCNoAr(gcs.find((gc) => gc.id === gcId) || null);
      setRefreshGCNoAr((prev) => !prev);
    } else {
      toast.error("Erro ao colocar GC no ar");
    }
  }

  useEffect(() => {
    carregarGCs();

    fetch(`http://localhost:3030/gc-duas-linhas-no-ar/${eventoId}`)
      .then((res) => res.json())
      .then(setGCNoAr);
  }, [eventoId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>Cargo</Label>
          <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </div>
      </div>

      {modoEdicao ? (
        <Button onClick={() => handleSalvarEdicao(modoEdicao)}>
          Salvar edição
        </Button>
      ) : (
        <Button onClick={handleCadastrar}>Cadastrar</Button>
      )}

      <hr className="my-4" />

      <h4 className="font-bold">GCs Cadastrados</h4>
      <ul className="space-y-2">
        {gcs.map((gc) => (
          <li
            key={gc.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <div>
              <div className="font-medium">{gc.nome}</div>
              <div className="text-sm">{gc.cargo}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={gcNoAr?.id === gc.id ? "no_ar" : "em_pista"}
                size="sm"
                // disabled={gcNoAr?.id === gc.id}
                onClick={() => handleColocarNoAr(gc.id)}
              >
                {gcNoAr?.id === gc.id ? "No ar" : "Colocar no ar"}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setModoEdicao(gc.id);
                  setNome(gc.nome);
                  setCargo(gc.cargo);
                }}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleExcluir(gc.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
