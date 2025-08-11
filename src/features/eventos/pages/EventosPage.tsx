// src/features/eventos/pages/EventosPage.tsx
import { useEffect, useState } from "react";
import { NovoEventoDialog } from "@/features/components/NovoEventoDialog";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api"; // helper para base configurável

type Evento = {
  id: number;
  nome: string;
  data: string;
  descricao?: string;
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function carregarEventos() {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await apiFetch("/eventos");
      const data = await res.json();
      setEventos(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao carregar eventos:", err);
      setErrorMsg(err?.message || "Falha ao carregar eventos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <div className="flex gap-2">
          <NovoEventoDialog onSave={carregarEventos} />
          <Button>
            <Link to="config">Configurações</Link>
          </Button>
        </div>
      </div>

      <div className="p-6">
        {loading && <p className="opacity-60">Carregando eventos…</p>}
        {errorMsg && <p className="text-red-500">{errorMsg}</p>}

        {!loading && !errorMsg && eventos.length === 0 ? (
          <p className="opacity-60">Nenhum evento cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {eventos.map((evento) => (
              <li
                key={evento.id}
                className="border p-4 rounded hover:bg-muted transition"
              >
                <Link to={`/eventos/${evento.id}`} className="block">
                  <div className="font-semibold">{evento.nome}</div>
                  <div className="text-sm opacity-60">
                    {new Date(evento.data).toLocaleString()}
                  </div>
                  {evento.descricao && <p>{evento.descricao}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
