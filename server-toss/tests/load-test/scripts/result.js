import fs from "node:fs";

import path from "node:path";

export class Result {
  _directory;
  _runId;
  _metadata;

  constructor() {
    this._metadata = {};
    this._metadata.stages = {};
  }
  /**
   * YYYYMMDD-HHMMSS 형식 결과 저장 디렉토리 생성
   */
  create() {
    const dirname = this._getFormattedName();

    this._runId = dirname;
    this._metadata.runId = dirname;

    this._directory = path.resolve(
      import.meta.dirname,
      `../results/${dirname}`,
    );

    fs.mkdirSync(this._directory, { recursive: true });

    return this._directory;
  }

  getDirectory() {
    return this._directory;
  }

  getRunId() {
    return this._runId;
  }

  saveMetadata(metadata) {
    Object.assign(this._metadata, metadata);
  }

  recordStage(name, duration) {
    this._metadata.stages[name] = { durationMs: duration };
  }

  flush() {
    fs.writeFileSync(
      path.join(this._directory, "metadata.json"),
      JSON.stringify(this._metadata, null, 2),
    );
  }

  copyConfig(configPath) {
    fs.copyFileSync(configPath, path.join(this._directory, "config.yaml"));
  }

  _getFormattedName() {
    const now = new Date();

    // Intl.DateTimeFormat을 이용해 각 포맷 요소를 추출합니다.
    const formatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // 24시간 형식 필수
    };

    const [
      { value: year },
      ,
      { value: month },
      ,
      { value: day },
      ,
      { value: hour },
      ,
      { value: minute },
      ,
      { value: second },
    ] = new Intl.DateTimeFormat("ko-KR", formatOptions).formatToParts(now);

    return `${year}${month}${day}-${hour}${minute}${second}`;
  }
}
