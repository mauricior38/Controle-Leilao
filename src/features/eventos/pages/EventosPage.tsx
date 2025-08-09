// src/features/eventos/pages/EventosPage.tsx
import { useEffect, useState } from "react";
import { NovoEventoDialog } from "@/features/components/NovoEventoDialog";
import { Link } from "react-router-dom";

type Evento = {
  id: number;
  nome: string;
  data: string;
  descricao?: string;
};

export default function EventosPage() {

  const [eventos, setEventos] = useState<Evento[]>([]);

  async function carregarEventos() {
    try {
      const res = await fetch("http://localhost:3030/eventos");
      const data = await res.json();
      setEventos(data);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Eventos</h1>
        <NovoEventoDialog onSave={carregarEventos} />
      </div>

      <div className="p-6">
        {eventos.length === 0 ? (
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
