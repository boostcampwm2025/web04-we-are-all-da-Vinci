import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "yaml";

export class ConfigHelper {
  static load(filename) {
    const p = path.resolve(import.meta.dirname, `../configs/${filename}`);
    return { path: p, config: YAML.parse(fs.readFileSync(p, "utf-8")) };
  }
}
