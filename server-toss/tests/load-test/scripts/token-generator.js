export class TokenGenerator {
  _compose;

  constructor(compose) {
    this._compose = compose;
  }

  /**
   *
   * @param {number} count
   */
  async generate(count) {
    await this._compose.run("davinci-migrate", [
      "node",
      "tests/load-test/scripts/generate-test-tokens.js",
      "--count",
      String(count),
    ]);
  }
}
