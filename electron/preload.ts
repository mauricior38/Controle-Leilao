import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // funções aqui se necessário
})
