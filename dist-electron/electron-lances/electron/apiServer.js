"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./db"));
const eventosService_1 = require("./services/eventosService");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/eventos", (req, res) => {
    const eventos = db_1.default
        .prepare("SELECT * FROM eventos ORDER BY datetime(data) DESC")
        .all();
    res.json(eventos);
});
app.post("/eventos", (req, res) => {
    const { nome, data, descricao } = req.body;
    db_1.default.prepare("INSERT INTO eventos (nome, data, descricao) VALUES (?, ?, ?)").run(nome, data, descricao || null);
    res.status(201).send();
});
app.get("/eventos/:id", (req, res) => {
    const id = Number(req.params.id);
    try {
        const evento = db_1.default.prepare("SELECT * FROM eventos WHERE id = ?").get(id);
        if (!evento) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }
        res.json(evento);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }
    catch (error) {
        res.status(500).json({ error: "Erro ao buscar evento" });
    }
});
// electron/apiServer.ts
app.delete("/eventos/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).send("ID inválido");
    (0, eventosService_1.deletarEvento)(id);
    res.sendStatus(204);
});
function startApiServer() {
    app.listen(3030, () => {
        console.log("🟢 API local rodando em http://localhost:3030");
    });
}
