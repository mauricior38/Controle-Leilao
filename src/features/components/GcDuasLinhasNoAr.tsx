import { useEffect, useState } from "react";

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
    fetch(`http://localhost:3030/gc-duas-linhas-no-ar/${eventoId}`)
      .then((res) => res.json())
      .then(setGC)
      .catch(() => setGC(null));
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
