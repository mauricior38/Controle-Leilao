// electron/lib/db.ts
import path from "path"
import Database from "better-sqlite3"

const dbPath = path.resolve(__dirname, "../../data.db") // mesma base para ambos
const db = new Database(dbPath)

export default db
