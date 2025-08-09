"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// import path from "path"
const apiServer_1 = require("./apiServer");
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
        },
    });
    win.loadURL("http://localhost:5173");
}
electron_1.app.whenReady().then(() => {
    createWindow();
    (0, apiServer_1.startApiServer)();
});
