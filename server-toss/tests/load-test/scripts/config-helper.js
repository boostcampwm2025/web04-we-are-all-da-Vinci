import * as fs from "node:fs";
import * as path from "node:path";
import * as YAML from "yaml";

export class ConfigHelper {
  static load(filepath) {
    return YAML.parse(fs.readFileSync(path.resolve(filepath), "utf-8"));
  }
}
