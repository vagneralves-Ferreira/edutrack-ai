const { app, BrowserWindow } = require('electron');
const path = require('path');

const LIVE_APP_URL = 'https://edutrack-ai-mauve-eight.vercel.app';

async function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'EduTrack AI | Planner Acadêmico - Faculdade Impacta',
    backgroundColor: '#07070b',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const loadLocalFallback = () => {
    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {});
  };

  try {
    // Limpa o cache HTTP para garantir que sempre busque a última versão publicada
    await win.webContents.session.clearCache();
    await win.loadURL(LIVE_APP_URL);
  } catch {
    // Caso esteja sem internet, abre o build local mais recente embutido no .exe
    loadLocalFallback();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
