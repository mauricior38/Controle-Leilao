import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Telefone {
  id: number;
  logo_path: string;
  nome: string;
  telefone: string;
}

export function TelefonesTab({ eventoId }: { eventoId: number }) {
  const { register, handleSubmit, setValue, reset } = useForm();
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setValueEdit,
    reset: resetEdit,
  } = useForm();

  const [telefones, setTelefones] = useState<Telefone[]>([]);
  const [logos, setLogos] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [selectedTelefoneId, setSelectedTelefoneId] = useState<number | null>(
    null
  );

  async function fetchTelefones() {
    try {
      const res = await apiFetch(`/eventos/${eventoId}/telefones`);
      const json = await res.json();
      setTelefones(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Erro ao buscar telefones:", err);
      setTelefones([]);
    }
  }

  async function fetchLogos() {
    const ctx = import.meta.glob(
      "/src/assets/logos_leiloeiras/*.{png,jpg,jpeg,svg}",
      { eager: true }
    );
    const files = Object.keys(ctx).map((p) =>
      p.replace("/src/assets/logos_leiloeiras/", "")
    );
    setLogos(files);
  }

  useEffect(() => {
    fetchTelefones();
    fetchLogos();
  }, [eventoId]);

  async function onSubmit(data: any) {
    await apiFetch(`/eventos/${eventoId}/telefones`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    reset();
    fetchTelefones();
  }

  function handleLogoSelect(file: string) {
    setValue("logo_path", `/src/assets/logos_leiloeiras/${file}`);
    setValueEdit("logo_path", `/src/assets/logos_leiloeiras/${file}`);
    setLogoModalOpen(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este telefone?")) return;
    await apiFetch(`/eventos/${eventoId}/telefones/${id}`, {
      method: "DELETE",
    });
    fetchTelefones();
  }

  function openEditModal(t: Telefone) {
    setSelectedTelefoneId(t.id);
    setValueEdit("logo_path", t.logo_path);
    setValueEdit("nome", t.nome);
    setValueEdit("telefone", t.telefone);
    setEditModalOpen(true);
  }

  async function onEditSubmit(data: any) {
    if (!selectedTelefoneId) return;
    await apiFetch(`/eventos/${eventoId}/telefones/${selectedTelefoneId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    resetEdit();
    setEditModalOpen(false);
    fetchTelefones();
  }

  return (
    <div className="space-y-6">
      {/* Form de cadastro */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block font-medium mb-1">Logo</label>
          <div className="flex items-center gap-3">
            <input
              {...register("logo_path", { required: true })}
              readOnly
              className="border px-2 py-1 w-full"
              placeholder="Selecione a logo…"
            />
            <Button type="button" onClick={() => setLogoModalOpen(true)}>
              Selecionar
            </Button>
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Nome Leiloeira</label>
          <input
            {...register("nome", { required: true })}
            className="border px-2 py-1 w-full"
            placeholder="Digite o nome"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Telefone</label>
          <input
            {...register("telefone", { required: true })}
            className="border px-2 py-1 w-full"
            placeholder="Digite o telefone"
          />
        </div>

        <Button type="submit" className="w-full">
          Cadastrar
        </Button>
      </form>

      {/* Lista */}
      <div>
        <h3 className="text-lg font-bold mb-2">Telefones cadastrados</h3>
        {telefones.length === 0 ? (
          <p className="text-gray-500">Nenhum telefone cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {telefones.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 border p-2 rounded"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={t.logo_path}
                    alt={t.nome}
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <div className="font-semibold">{t.nome}</div>
                    <div className="text-sm text-gray-600">{t.telefone}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(t)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(t.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Telefone</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmitEdit(onEditSubmit)}
            className="space-y-3 mt-4"
          >
            <div>
              <label className="block font-medium mb-1">Logo</label>
              <div className="flex items-center gap-3">
                <input
                  {...registerEdit("logo_path", { required: true })}
                  readOnly
                  className="border px-2 py-1 w-full"
                  placeholder="Selecione a logo…"
                />
                <Button type="button" onClick={() => setLogoModalOpen(true)}>
                  Selecionar
                </Button>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Nome Leiloeira</label>
              <input
                {...registerEdit("nome", { required: true })}
                className="border px-2 py-1 w-full"
                placeholder="Digite o nome"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Telefone</label>
              <input
                {...registerEdit("telefone", { required: true })}
                className="border px-2 py-1 w-full"
                placeholder="Digite o telefone"
              />
            </div>

            <Button type="submit" className="w-full">
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal seleção de logo */}
      <Dialog open={logoModalOpen} onOpenChange={setLogoModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecione uma Logo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {logos.map((file) => (
              <img
                key={file}
                src={`/src/assets/logos_leiloeiras/${file}`}
                alt={file}
                className="cursor-pointer border rounded hover:opacity-80"
                onClick={() => handleLogoSelect(file)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
