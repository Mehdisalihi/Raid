const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

let mainWindow;
let backendProcess;
let frontendProcess;

const isDev = require('electron-is-dev');

// ─── Resolve node.exe path ────────────────────────────────────────────────────
// When Electron is launched outside a terminal (e.g. double-click), the system
// PATH usually doesn't include Node.js, causing `spawn 'node' ENOENT`.
// We locate it using `where.exe` or common installation paths.
function resolveNodeBin() {
  // 1. Try `where.exe node` (works when Node is in PATH)
  try {
    const result = execSync('where.exe node', { encoding: 'utf8', timeout: 3000 });
    const found = result.split(/\r?\n/).map(s => s.trim()).filter(s => s.endsWith('.exe') && fs.existsSync(s));
    if (found.length > 0) return found[0];
  } catch (_) {}

  // 2. Fallback: check common Windows installation paths
  const candidates = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    path.join(process.env.APPDATA || '', 'nvm', 'current', 'node.exe'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Last resort: rely on shell PATH
  return 'node';
}

const NODE_BIN = resolveNodeBin();
console.log(`Using node: ${NODE_BIN}`);

// ─── Load backend .env into child process env ────────────────────────────────
function loadEnv(envFile) {
  if (!fs.existsSync(envFile)) return {};
  const result = {};
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

// ─── Windows ─────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'RAID Accounting System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:3000');

  if (isDev) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

function startBackend() {
  const isPackaged = app.isPackaged;
  const baseDir    = isPackaged ? process.resourcesPath : path.join(__dirname, '..');

  const backendPath = path.join(baseDir, 'backend', 'src', 'app.js');
  const envPath    = path.join(baseDir, 'backend', '.env');
  const envVars    = loadEnv(envPath);

  // Set database path to userData to ensure persistence across updates
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'mohassibe.db');
  
  // Copy initial DB if it exists in resources and not in userData
  if (isPackaged) {
    const packagedDbPath = path.join(baseDir, 'backend', 'prisma', 'mohassibe.db');
    if (fs.existsSync(packagedDbPath) && !fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(packagedDbPath, dbPath);
        console.log('Initial database copied to userData');
      } catch (err) {
        console.error('Failed to copy initial database:', err);
      }
    }
  }

  const nodeBin = isPackaged ? path.join(process.resourcesPath, 'bin', 'node.exe') : NODE_BIN;
  backendProcess = spawn(nodeBin, [backendPath], {
    env: { 
      ...process.env, 
      ...envVars, 
      PORT: '5001',
      DATABASE_URL: `file:${dbPath}` 
    },
    shell: false,
  });

  backendProcess.stdout.on('data', d => console.log(`Backend: ${d}`));
  backendProcess.stderr.on('data', d => console.error(`Backend Error: ${d}`));
  backendProcess.on('error', e => console.error('Backend spawn error:', e.message));
}

function startFrontend() {
  const isPackaged = app.isPackaged;
  const baseDir    = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const nodeModulesDir = isPackaged ? path.join(process.resourcesPath, 'node_modules') : path.join(__dirname, '..', '..', 'node_modules');

  const nodeBin = isPackaged ? path.join(process.resourcesPath, 'bin', 'node.exe') : NODE_BIN;
  const nextBin = path.join(nodeModulesDir, 'next', 'dist', 'bin', 'next');
  const webPath  = path.join(baseDir, 'web');
  const command  = isDev ? 'dev' : 'start';

  console.log(`Starting frontend in ${command} mode...`);

  frontendProcess = spawn(nodeBin, [nextBin, command], {
    cwd: webPath,
    env: { ...process.env, PORT: '3000' },
    shell: false,
  });

  frontendProcess.stdout.on('data', d => console.log(`Frontend: ${d}`));
  frontendProcess.stderr.on('data', d => console.error(`Frontend Error: ${d}`));
  frontendProcess.on('error', e => console.error('Frontend spawn error:', e.message));
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.on('ready', () => {
  console.log('App ready. Starting services...');
  startBackend();
  startFrontend();

  const waitTime = isDev ? 12000 : 8000;
  setTimeout(createWindow, waitTime);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (backendProcess)  backendProcess.kill();
  if (frontendProcess) frontendProcess.kill();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
