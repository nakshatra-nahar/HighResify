import prepareNext from "electron-next";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { app, ipcMain, protocol } from "electron";
import COMMAND from "../common/commands";
import logit from "./utils/logit";
import openFolder from "./commands/open-folder";
import stop from "./commands/stop";
import selectFolder from "./commands/select-folder";
import selectFile from "./commands/select-file";
import getModelsList from "./commands/get-models-list";
import customModelsSelect from "./commands/custom-models-select";
import imageHighResify from "./commands/image-HighResify";
import { createMainWindow } from "./main-window";
import electronIsDev from "electron-is-dev";
import { execPath, modelsPath } from "./utils/get-resource-paths";
import batchHighResify from "./commands/batch-HighResify";
import doubleHighResify from "./commands/double-HighResify";
import autoUpdate from "./commands/auto-update";
import { featureFlags } from "../common/feature-flags";
import settings from "electron-settings";

// INITIALIZATION
log.initialize({ preload: true });
logit("🚃 App Path: ", app.getAppPath());

app.on("ready", async () => {
  await prepareNext("./renderer");

  app.whenReady().then(() => {
    protocol.registerFileProtocol("file", (request, callback) => {
      const pathname = decodeURI(request.url.replace("file:///", ""));
      callback(pathname);
    });
  });

  createMainWindow();

  if (!electronIsDev) {
    autoUpdater.checkForUpdates();
  }

  log.info("🚀 HighResify EXEC PATH: ", execPath);
  log.info("🚀 MODELS PATH: ", modelsPath);

  let closeAccess;
  const folderBookmarks = await settings.get("folder-bookmarks");
  if (featureFlags.APP_STORE_BUILD && folderBookmarks) {
    logit("🚨 Folder Bookmarks: ", folderBookmarks);
    try {
      closeAccess = app.startAccessingSecurityScopedResource(
        folderBookmarks as string,
      );
    } catch (error) {
      logit("📁 Folder Bookmarks Error: ", error);
    }
  }
});

// Quit the app once all windows are closed
app.on("window-all-closed", () => {
  app.quit();
});

// ! ENABLE THIS FOR MACOS APP STORE BUILD
if (featureFlags.APP_STORE_BUILD) {
  logit("🚀 APP STORE BUILD ENABLED");
  app.commandLine.appendSwitch("in-process-gpu");
}

ipcMain.on(COMMAND.STOP, stop);

ipcMain.on(COMMAND.OPEN_FOLDER, openFolder);

ipcMain.handle(COMMAND.SELECT_FOLDER, selectFolder);

ipcMain.handle(COMMAND.SELECT_FILE, selectFile);

ipcMain.on(COMMAND.GET_MODELS_LIST, getModelsList);

ipcMain.handle(COMMAND.SELECT_CUSTOM_MODEL_FOLDER, customModelsSelect);

ipcMain.on(COMMAND.HighResify, imageHighResify);

ipcMain.on(COMMAND.FOLDER_HighResify, batchHighResify);

ipcMain.on(COMMAND.DOUBLE_HighResify, doubleHighResify);

if (!featureFlags.APP_STORE_BUILD) {
  autoUpdater.on("update-downloaded", autoUpdate);
}
