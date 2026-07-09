import path from "node:path";
import { Process } from "./exec.js";
import { sleep } from "./utils.js";

export class Compose {
  _composeFile;
  constructor(composeFile) {
    this._composeFile = path.resolve(
      import.meta.dirname,
      `../docker/${composeFile}`,
    );
  }

  /**
   *
   * @param {{services: string[], profiles: string[], env: object}} args
   */
  async up({ services = [], profiles = [], env = {} }) {
    const args = [
      ...this._command([
        ...profiles.flatMap((profile) => ["--profile", profile]),
        "up",
        "-d",
        ...services,
      ]),
    ];

    await Process.run({
      command: "docker",
      args,
      env: {
        ...process.env,
        ...env,
      },
    });
  }

  /**
   *  @param {{profiles: string[]}} args
   */
  async down({ profiles = [] } = {}) {
    let args = [...this._command(["down", "-v"])];

    if (Array.isArray(profiles) && profiles.length > 0) {
      args = [
        ...this._command([
          ...profiles.flatMap((profile) => ["--profile", profile]),
          "down",
          "-v",
        ]),
      ];
    }
    await Process.run({ command: "docker", args });
  }

  /**
   *
   * @param {string} service
   * @param {{timeout: number, interval: number}} options
   * @returns {Promise<void>}
   */
  async waitHealthy(service, options = { timeout: 60_000, interval: 1000 }) {
    const deadline = Date.now() + options.timeout;

    while (Date.now() < deadline) {
      const state = await this._inspect(await this._getContainerId(service));

      if (!state.Health) {
        return;
      }
      if (state.Health.Status === "healthy") {
        return;
      }

      await sleep(options.interval);
    }

    throw new Error("timeout");
  }

  /**
   *
   * @param {string} service
   * @param {string[]} args
   * @param {Record<string, string|number>} env
   */
  async run(service, command = [], env = {}) {
    const envArgs = Object.entries(env).flatMap(([key, value]) => [
      "-e",
      `${key}=${String(value)}`,
    ]);
    const args = [
      ...this._command(["run", "--rm", ...envArgs, service, ...command]),
    ];
    await Process.run({ command: "docker", args, env: process.env });
  }

  /**
   *
   * @param {string} service
   */
  async logs(service) {
    const args = [...this._command(["logs", service])];
    await Process.run({ command: "docker", args });
  }

  /**
   *
   * @param {string[]} args
   * @returns {string[]}
   */
  _command(args) {
    return ["compose", "-f", this._composeFile, ...args];
  }

  /**
   *
   * @param {string} service
   * @returns {Promise<string>}
   */
  async _getContainerId(service) {
    const args = [...this._command(["ps", "-q", service])];
    return await Process.capture("docker", args);
  }

  /**
   *
   * @param {string} containerId
   * @returns {Promise<any>}
   */
  async _inspect(containerId) {
    const result = JSON.parse(
      await Process.capture("docker", ["inspect", containerId]),
    );
    if (result?.length < 1 || !result[0]?.State) {
      throw new Error("docker inspect error");
    }
    return result[0].State;
  }
}
