const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    title: "Resonance",
    width: 1000,
    height: 700,
    show: false, // prevents white flash
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  // Windowed fullscreen
  win.maximize();

  win.loadFile("index.html");

  // Show after ready
  win.once("ready-to-show", () => {
    win.show();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
