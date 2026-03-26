import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { initDatabase } from "./database";
import { spawn, ChildProcess } from "child_process";
import net from "net";

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

// Find a free port
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

// Wait for the server to be ready
function waitForServer(port: number, timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = net.createConnection({ port, host: "127.0.0.1" }, () => {
        req.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error("Server startup timeout"));
        } else {
          setTimeout(check, 200);
        }
      });
    };
    check();
  });
}

async function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "SME 회계",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/dashboard`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startApp() {
  try {
    // Initialize SQLite database
    const userDataPath = app.getPath("userData");
    initDatabase(userDataPath);
    console.log("Database initialized at:", userDataPath);

    // Find free port and start Next.js server
    const port = await findFreePort();
    const standalonePath = path.join(__dirname, "..", ".next", "standalone");
    const serverPath = path.join(standalonePath, "server.js");

    nextServer = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        SME_DB_PATH: path.join(userDataPath, "sme-accounting", "data.db"),
      },
      cwd: standalonePath,
    });

    nextServer.stdout?.on("data", (data) => {
      console.log(`[Next.js] ${data}`);
    });

    nextServer.stderr?.on("data", (data) => {
      console.error(`[Next.js] ${data}`);
    });

    await waitForServer(port);
    console.log(`Next.js server ready on port ${port}`);

    await createWindow(port);
  } catch (error) {
    console.error("Failed to start app:", error);
    dialog.showErrorBox("시작 오류", `앱을 시작할 수 없습니다: ${error}`);
    app.quit();
  }
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startApp);
}

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill();
  }
  app.quit();
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
  }
});
