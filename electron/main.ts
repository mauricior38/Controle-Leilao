import { app, BrowserWindow } from "electron"
import path from "path"
import { startApiServer } from "./apiServer"

app.setName("LeiloApp");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'public', 'cr.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL("http://localhost:5173")
}

app.whenReady().then(() => {
  createWindow()
  startApiServer()
})
