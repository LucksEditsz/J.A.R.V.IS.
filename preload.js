const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  launchGame: (game) => ipcRenderer.invoke('launch-game', game)
});
