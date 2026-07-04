#!/usr/bin/env node

import { Compose } from "./compose.js";
import { ConfigHelper } from "./config-helper.js";
import { K6Runner } from "./k6-runner.js";
import { Runner } from "./runner.js";
import { TokenGenerator } from "./token-generator.js";

async function run() {
  const config = ConfigHelper.load("tests/load-test/configs/example.yaml");
  const compose = new Compose("tests/load-test/docker/compose.yml");
  const k6 = new K6Runner();
  const token = new TokenGenerator(compose);

  const runner = new Runner(config, compose, k6, token);
  await runner.run();
}

run().catch(console.error);
