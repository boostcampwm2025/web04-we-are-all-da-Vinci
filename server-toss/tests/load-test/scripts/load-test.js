#!/usr/bin/env node

import { Compose } from "./compose.js";
import { ConfigHelper } from "./config-helper.js";
import { K6Runner } from "./k6-runner.js";
import { Result } from "./result.js";
import { Runner } from "./runner.js";
import { TokenGenerator } from "./token-generator.js";

async function run() {
  const configFile = process.argv[2] ?? "example.yaml";
  const { config, path } = ConfigHelper.load(configFile);
  const compose = new Compose("compose.yml");
  const k6 = new K6Runner();
  const token = new TokenGenerator(compose);
  const result = new Result();
  result.create();
  result.copyConfig(path);

  const runner = new Runner(config, compose, k6, token, result);
  await runner.run();
}

run().catch(console.error);
