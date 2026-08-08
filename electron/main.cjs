const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

// URL of the deployed web app. Update after publishing.
const APP_URL =
  process.env.APP_URL ||
  "https://project--80261e4e-2049-4962-840b-d76d12debfdf.lovable.app/app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0c0c0e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    title: "Premium Chat",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);

  // Open external links in the user's default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
