"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const apiServer_1 = require("./apiServer");
electron_1.app.setName("LeiloApp");
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        icon: path_1.default.join(__dirname, 'public', 'cr.png'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    win.loadURL("http://localhost:5173");
}
electron_1.app.whenReady().then(() => {
    createWindow();
    (0, apiServer_1.startApiServer)();
});
