// scripts/patchStatusColumn.ts
import db from "../electron/lib/db";

try {
  db.prepare(`ALTER TABLE lotes ADD COLUMN status TEXT DEFAULT 'aguardando'`).run();
  console.log("✅ Coluna 'status' adicionada com sucesso.");
} catch (err: any) {
  if (err.message.includes("duplicate column name")) {
    console.log("⚠️ Coluna 'status' já existe.");
  } else {
    console.error("❌ Erro ao adicionar coluna:", err.message);
  }
}
