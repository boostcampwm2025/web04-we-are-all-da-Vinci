import { spawn } from "node:child_process";

export class Process {
  /**
   *
   * @param {string} command
   * @param {string[]} args
   * @param {string} cwd
   * @param {number[]} allowedExitCodes
   * @returns {Promise<number>}
   */
  static run(command, args, cwd = process.cwd(), allowedExitCodes = [0]) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: "inherit",
        shell: false,
      });

      child.on("close", (code) => {
        if (allowedExitCodes.includes(code)) {
          resolve(code);
        } else {
          reject(
            new Error(`${command} ${args.join(" ")} exited with ${code}.`),
          );
        }
      });

      child.on("error", reject);
    });
  }

  /**
   *
   * @param {string} command
   * @param {string[]} args
   * @param {string} cwd
   * @returns {Promise<string>}
   */
  static capture(command, args, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: "pipe",
        shell: false,
      });

      const stdoutChunks = [];
      const stderrChunks = [];

      child.stdout.on("data", (chunk) => {
        stdoutChunks.push(chunk);
      });

      child.stderr.on("data", (chunk) => {
        stderrChunks.push(chunk);
      });

      child.on("close", (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
        const stderr = Buffer.concat(stderrChunks).toString("utf-8");
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(
              `${command} ${args.join(" ")} exited with ${code}. Error: ${stderr}`,
            ),
          );
        }
      });

      child.on("error", (reason) => {
        const stderr = Buffer.concat(stderrChunks).toString("utf-8");

        reject(new Error(`${command} exited with ${reason}. Error: ${stderr}`));
      });
    });
  }
}
