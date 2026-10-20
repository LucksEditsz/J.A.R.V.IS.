const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let janela;

const GAMES = Object.freeze({
  gta_sa: 'GTA_San_Andreas.exe',
  f1_2016: 'F1_2016.exe',
  pes6: 'PES_6.exe',
  gta_vc: 'GTA_Vice_City.exe',
  pes2018: 'PES_2018.exe',
  fifa15: 'FIFA_15.exe'
});

function criarJanela() {
  janela = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  janela.loadFile(path.join(__dirname, 'index.html'));
  janela.on('closed', () => { janela = null; });
}

ipcMain.handle('launch-game', (_event, game) => {
  if (typeof game !== 'string' || !Object.prototype.hasOwnProperty.call(GAMES, game)) {
    return { ok: false, message: 'Jogo não autorizado.' };
  }

  const executable = path.join(__dirname, 'games', GAMES[game]);

  try {
    const processo = spawn(executable, [], {
      cwd: path.dirname(executable),
      detached: true,
      stdio: 'ignore'
    });

    processo.unref();
    return { ok: true, message: 'Jogo iniciado.' };
  } catch (error) {
    console.error('Erro ao iniciar jogo:', error);
    return { ok: false, message: `Não foi possível iniciar o jogo: ${error.message}` };
  }
});

app.whenReady().then(() => {
  criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
