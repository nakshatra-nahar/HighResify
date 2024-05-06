import { parse } from "path";
import { getMainWindow } from "../main-window";
import {
  childProcesses,
  savedCustomModelsPath,
  setStopped,
  stopped,
} from "../utils/config-variables";
import slash from "../utils/slash";
import { spawnHighResify } from "../utils/spawn-HighResify";
import {
  getDoubleUpscaleArguments,
  getDoubleUpscaleSecondPassArguments,
} from "../utils/get-arguments";
import { modelsPath } from "../utils/get-resource-paths";
import logit from "../utils/logit";
import COMMAND from "../../common/commands";
import { DoubleHighResifyPayload } from "../../common/types/types";
import { ImageFormat } from "../types/types";
import showNotification from "../utils/show-notification";
import { DEFAULT_MODELS } from "../../common/models-list";
import getFilenameFromPath from "../../common/get-file-name";
import decodePath from "../../common/decode-path";
import getDirectoryFromPath from "../../common/get-directory-from-path";

const doubleHighResify = async (event, payload: DoubleHighResifyPayload) => {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const tileSize = payload.tileSize;
  const compression = payload.compression;
  const scale = parseInt(payload.scale) ** 2;
  const useCustomWidth = payload.useCustomWidth;
  const customWidth = useCustomWidth ? payload.customWidth : "";
  const model = payload.model;
  const gpuId = payload.gpuId as string;
  const saveImageAs = payload.saveImageAs as ImageFormat;
  const imagePath = decodePath(payload.imagePath);
  let inputDir = getDirectoryFromPath(imagePath);
  let outputDir = decodePath(payload.outputPath);
  const fullfileName = getFilenameFromPath(imagePath);
  const fileName = parse(fullfileName).name;

  const isDefaultModel = DEFAULT_MODELS.includes(model);

  // COPY IMAGE TO TMP FOLDER

  const outFile =
    outputDir +
    slash +
    fileName +
    "_HighResify_" +
    (useCustomWidth ? `${customWidth}px_` : `${scale}x_`) +
    model +
    "." +
    saveImageAs;

  // UPSCALE
  let HighResify = spawnHighResify(
    getDoubleUpscaleArguments({
      inputDir,
      fullfileName: decodeURIComponent(fullfileName),
      outFile,
      modelsPath: isDefaultModel
        ? modelsPath
        : savedCustomModelsPath ?? modelsPath,
      model,
      gpuId,
      saveImageAs,
      tileSize,
    }),
    logit,
  );

  let HighResify2: ReturnType<typeof spawnHighResify>;

  childProcesses.push(HighResify);

  setStopped(false);
  let failed = false;
  let failed2 = false;

  // SECOND PASS FUNCTIONS
  const onError2 = (data) => {
    if (!mainWindow) return;
    data.toString();
    // SEND HighResify PROGRESS TO RENDERER
    mainWindow.webContents.send(COMMAND.DOUBLE_HighResify_PROGRESS, data);
    // SET FAILED TO TRUE
    failed2 = true;
    mainWindow &&
      mainWindow.webContents.send(
        COMMAND.HighResify_ERROR,
        "Error upscaling image. Error: " + data,
      );
    showNotification("HighResify Failure", "Failed to upscale image!");
    HighResify2.kill();
    return;
  };

  const onData2 = (data) => {
    if (!mainWindow) return;
    // CONVERT DATA TO STRING
    data = data.toString();
    // SEND HighResify PROGRESS TO RENDERER
    mainWindow.webContents.send(COMMAND.DOUBLE_HighResify_PROGRESS, data);
    // IF PROGRESS HAS ERROR, HighResify FAILED
    if (data.includes("Error")) {
      HighResify2.kill();
      failed2 = true;
    } else if (data.includes("Resizing")) {
      mainWindow.webContents.send(COMMAND.SCALING_AND_CONVERTING);
    }
  };

  const onClose2 = async (code) => {
    if (!mainWindow) return;
    if (!failed2 && !stopped) {
      logit("💯 Done upscaling");

      mainWindow.setProgressBar(-1);
      mainWindow.webContents.send(COMMAND.DOUBLE_HighResify_DONE, outFile);
      showNotification("HighResifyed", "Image HighResifyed successfully!");
    }
  };

  // FIRST PASS FUNCTIONS
  const onError = (data) => {
    if (!mainWindow) return;
    mainWindow.setProgressBar(-1);
    data.toString();
    // SEND HighResify PROGRESS TO RENDERER
    mainWindow.webContents.send(COMMAND.DOUBLE_HighResify_PROGRESS, data);
    // SET FAILED TO TRUE
    failed = true;
    mainWindow &&
      mainWindow.webContents.send(
        COMMAND.HighResify_ERROR,
        "Error upscaling image. Error: " + data,
      );
    showNotification("HighResify Failure", "Failed to upscale image!");
    HighResify.kill();
    return;
  };

  const onData = (data) => {
    if (!mainWindow) return;
    // CONVERT DATA TO STRING
    data = data.toString();
    // SEND HighResify PROGRESS TO RENDERER
    mainWindow.webContents.send(COMMAND.DOUBLE_HighResify_PROGRESS, data);
    // IF PROGRESS HAS ERROR, HighResify FAILED
    if (data.includes("Error") || data.includes("failed")) {
      HighResify.kill();
      failed = true;
    } else if (data.includes("Resizing")) {
      mainWindow.webContents.send(COMMAND.SCALING_AND_CONVERTING);
    }
  };

  const onClose = (code) => {
    // IF NOT FAILED
    if (!failed && !stopped) {
      // SPAWN A SECOND PASS
      HighResify2 = spawnHighResify(
        getDoubleUpscaleSecondPassArguments({
          outFile,
          modelsPath: isDefaultModel
            ? modelsPath
            : savedCustomModelsPath ?? modelsPath,
          model,
          gpuId,
          saveImageAs,
          scale: scale.toString(),
          customWidth,
          compression,
          tileSize,
        }),
        logit,
      );
      logit("🚀 Upscaling Second Pass");
      childProcesses.push(HighResify2);
      HighResify2.process.stderr.on("data", onData2);
      HighResify2.process.on("error", onError2);
      HighResify2.process.on("close", onClose2);
    }
  };

  HighResify.process.stderr.on("data", onData);
  HighResify.process.on("error", onError);
  HighResify.process.on("close", onClose);
};

export default doubleHighResify;
