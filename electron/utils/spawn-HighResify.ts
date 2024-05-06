import { spawn } from "child_process";
import { execPath } from "./get-resource-paths";

export const spawnHighResify = (
  command: string[],
  logit: (...args: any) => void,
) => {
  logit(
    "📢 HighResify Command: ",
    command.filter((arg) => arg !== ""),
  );

  const spawnedProcess = spawn(
    execPath,
    command.filter((arg) => arg !== ""),
    {
      cwd: undefined,
      detached: false,
    },
  );

  return {
    process: spawnedProcess,
    kill: () => spawnedProcess.kill(),
  };
};
