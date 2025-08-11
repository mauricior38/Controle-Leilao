import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface GC {
  id: number;
  nome: string;
  cargo: string;
}

export default function GcDuasLinhasNoAr({
  eventoId,
  refresh,
}: {
  eventoId: number;
  refresh: boolean;
}) {
  const [gc, setGC] = useState<GC | null>(null);

  useEffect(() => {
    let active = true;

    async function carregar() {
      try {
        const res = await apiFetch(`/gc-duas-linhas-no-ar/${eventoId}`);
        const data = await res.json();
        if (active) setGC(data || null);
      } catch {
        if (active) setGC(null);
      }
    }

    carregar();
    return () => {
      active = false;
    };
  }, [eventoId, refresh]);

  if (!gc) return null;

  return (
    <div className="border p-3 rounded bg-green-100 text-green-900">
      <div className="font-bold">GC no Ar:</div>
      <div>
        {gc.nome} - {gc.cargo}
      </div>
    </div>
  );
}
