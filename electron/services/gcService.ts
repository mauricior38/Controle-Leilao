// ✅ electron/services/gcService.ts
import db from "../lib/db";

export interface GC {
  id: number;
  evento_id: number;
  nome: string;
  cargo: string;
}

export function listarGCsPorEvento(eventoId: number): GC[] {
  const stmt = db.prepare("SELECT * FROM gc_duas_linhas WHERE evento_id = ?");
  return stmt.all(eventoId) as GC[];
}

export function criarGC(gc: Omit<GC, "id">): number {
  const stmt = db.prepare(`
    INSERT INTO gc_duas_linhas (evento_id, nome, cargo)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(gc.evento_id, gc.nome, gc.cargo);
  return result.lastInsertRowid as number;
}

export function atualizarGC(
  id: number,
  dados: { nome: string; cargo: string }
) {
  const stmt = db.prepare(
    `UPDATE gc_duas_linhas SET nome = ?, cargo = ? WHERE id = ?`
  );
  stmt.run(dados.nome, dados.cargo, id);
}

export function excluirGC(id: number): void {
  const stmt = db.prepare("DELETE FROM gc_duas_linhas WHERE id = ?");
  stmt.run(id);
}

// Define o GC "no ar"
export function definirGCNoAr(eventoId: number, gcId: number) {
  // Remove existente
  db.prepare("DELETE FROM gc_duas_linhas_no_ar WHERE evento_id = ?").run(
    eventoId
  );

  // Insere novo
  db.prepare(
    "INSERT INTO gc_duas_linhas_no_ar (evento_id, gc_id) VALUES (?, ?)"
  ).run(eventoId, gcId);
}

// Busca o GC "no ar"
export function obterGCNoAr(eventoId: number): GC | null {
  const row = db.prepare(`
    SELECT g.id, g.evento_id, g.nome, g.cargo
    FROM gc_duas_linhas_no_ar n
    JOIN gc_duas_linhas g ON g.id = n.gc_id
    WHERE n.evento_id = ?
    LIMIT 1
  `).get(eventoId);

  return row ? (row as GC) : null;
}
