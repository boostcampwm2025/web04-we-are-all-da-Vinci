import { spawn } from "node:child_process";
import fs from "node:fs";
import { finished } from "node:stream/promises";

export class Process {
  /**
   * @property {string} command
   * @property {string[]} args
   * @property {string} [cwd]
   * @property {number[]} [allowedExitCodes]
   * @property {string} [stdoutFile]
   * @property {string} [stderrFile]
   */
  static async run({
    command,
    args,
    cwd = process.cwd(),
    allowedExitCodes = [0],
    stdoutFile,
    stderrFile,
  }) {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const startedAt = new Date();

      const child = spawn(command, args, {
        cwd,
        shell: false,
        stdio: ["inherit", "pipe", "pipe"],
      });

      let stdoutStream;
      let stderrStream;

      if (stdoutFile) {
        stdoutStream = fs.createWriteStream(stdoutFile);
        child.stdout.pipe(stdoutStream);
      }

      if (stderrFile) {
        stderrStream = fs.createWriteStream(stderrFile);
        child.stderr.pipe(stderrStream);
      }

      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);

      child.on("error", reject);

      child.on("close", async (code) => {
        const finishedAt = new Date();
        const ended = performance.now();
        try {
          if (stdoutStream) {
            stdoutStream.end();
            await finished(stdoutStream);
          }

          if (stderrStream) {
            stderrStream.end();
            await finished(stderrStream);
          }

          if (allowedExitCodes.includes(code)) {
            resolve({
              exitCode: code,
              startedAt,
              finishedAt,
              durationMs: ended - started,
            });
          } else {
            reject(
              new Error(`${command} ${args.join(" ")} exited with ${code}.`),
            );
          }
        } catch (err) {
          reject(err);
        }
      });
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
