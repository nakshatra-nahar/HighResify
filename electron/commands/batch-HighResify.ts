import fs from "fs";
import { getMainWindow } from "../main-window";
import {
  childProcesses,
  savedCustomModelsPath,
  setStopped,
  stopped,
} from "../utils/config-variables";
import logit from "../utils/logit";
import { spawnHighResify } from "../utils/spawn-HighResify";
import { getBatchArguments } from "../utils/get-arguments";
import slash from "../utils/slash";
import { modelsPath } from "../utils/get-resource-paths";
import COMMAND from "../../common/commands";
import { BatchHighResifyPayload } from "../../common/types/types";
import showNotification from "../utils/show-notification";
import { DEFAULT_MODELS } from "../../common/models-list";

const batchHighResify = async (event, payload: BatchHighResifyPayload) => {
  const mainWindow = getMainWindow();
  if (!mainWindow) return;

  const tileSize = payload.tileSize;
  const compression = payload.compression;
  const scale = payload.scale;
  const useCustomWidth = payload.useCustomWidth;
  const customWidth = useCustomWidth ? payload.customWidth : "";
  const model = payload.model;
  const gpuId = payload.gpuId;
  const saveImageAs = payload.saveImageAs;
  // GET THE IMAGE DIRECTORY
  let inputDir = decodeURIComponent(payload.batchFolderPath);
  // GET THE OUTPUT DIRECTORY
  let outputFolderPath = decodeURIComponent(payload.outputPath);
  const outputFolderName = `HighResify_${saveImageAs}_${model}_${
    useCustomWidth ? `${customWidth}px` : `${scale}x`
  }`;
  outputFolderPath += slash + outputFolderName;
  // CREATE THE OUTPUT DIRECTORY
  if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath, { recursive: true });
  }

  const isDefaultModel = DEFAULT_MODELS.includes(model);

  // UPSCALE
  const HighResify = spawnHighResify(
    getBatchArguments({
      inputDir,
      outputDir: outputFolderPath,
      modelsPath: isDefaultModel
        ? modelsPath
        : savedCustomModelsPath ?? modelsPath,
      model,
      gpuId,
      saveImageAs,
      scale,
      customWidth,
      compression,
      tileSize,
    }),
    logit,
  );

  childProcesses.push(HighResify);

  setStopped(false);
  let failed = false;
  let encounteredError = false;

  const onData = (data: any) => {
    if (!mainWindow) return;
    data = data.toString();
    mainWindow.webContents.send(
      COMMAND.FOLDER_HighResify_PROGRESS,
      data.toString(),
    );
    if ((data as string).includes("Error")) {
      logit("❌ ", data);
      encounteredError = true;
    } else if (data.includes("Resizing")) {
      mainWindow.webContents.send(COMMAND.SCALING_AND_CONVERTING);
    }
  };
  const onError = (data: any) => {
    if (!mainWindow) return;
    mainWindow.setProgressBar(-1);
    mainWindow.webContents.send(
      COMMAND.FOLDER_HighResify_PROGRESS,
      data.toString(),
    );
    failed = true;
    HighResify.kill();
    mainWindow &&
      mainWindow.webContents.send(
        COMMAND.HighResify_ERROR,
        `Error upscaling images! ${data}`,
      );
    return;
  };
  const onClose = () => {
    if (!mainWindow) return;
    if (!failed && !stopped) {
      logit("💯 Done upscaling");
      HighResify.kill();
      mainWindow.webContents.send(
        COMMAND.FOLDER_HighResify_DONE,
        outputFolderPath,
      );
      if (!encounteredError) {
        showNotification("HighResifyed", "Images HighResifyed successfully!");
      } else {
        showNotification(
          "HighResifyed",
          "Images were HighResifyed but encountered some errors!",
        );
      }
    } else {
      HighResify.kill();
    }
  };
  HighResify.process.stderr.on("data", onData);
  HighResify.process.on("error", onError);
  HighResify.process.on("close", onClose);
};

export default batchHighResify;
