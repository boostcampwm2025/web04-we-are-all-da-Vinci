import { Process } from "./exec.js";
import { sleep } from "./utils.js";

export class Compose {
  _composeFile;
  constructor(composeFile) {
    this._composeFile = composeFile;
  }

  /**
   *
   * @param {string[]} services
   */
  async up(services) {
    const args = [...this._command(["up", "-d", ...services])];
    await Process.run("docker", args);
  }

  /**
   *
   */
  async down() {
    const args = [...this._command(["down", "-v"])];
    await Process.run("docker", args);
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
   */
  async run(service, args = []) {
    const cmd = [...this._command(["run", "--rm", service, ...args])];
    await Process.run("docker", cmd);
  }

  /**
   *
   * @param {string} service
   */
  async logs(service) {
    const args = [...this._command(["logs", service])];
    await Process.run("docker", args);
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
