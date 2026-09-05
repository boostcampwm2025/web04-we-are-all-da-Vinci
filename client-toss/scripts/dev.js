import { spawn } from "child_process";
import { createRequire } from "module";
import { networkInterfaces } from "os";
import { dirname, join } from "path";

function getLocalIP() {
  for (const [name, iface] of Object.entries(networkInterfaces())) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("vethernet") || lowerName.includes("wsl")) continue;
    for (const net of iface) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const host = getLocalIP();
console.log(`host: ${host}`);

// `granite`라는 bin 이름은 웹 CLI(@apps-in-toss/web-framework)와 RN CLI(@granite-js/react-native)가
// 함께 선언한다. 어느 쪽이 node_modules/.bin에 링크되는지는 설치 순서에 따라 바뀌어,
// RN CLI가 잡히면 웹용 granite.config.ts를 읽다가 "pluginHooks ... undefined"로 죽는다.
// 이름 대신 웹 프레임워크의 bin 파일을 경로로 직접 실행한다.
const require = createRequire(import.meta.url);
const webFrameworkDir = dirname(
  require.resolve("@apps-in-toss/web-framework/package.json"),
);
const graniteWebCli = join(webFrameworkDir, "bin.js");

const proc = spawn(process.execPath, [graniteWebCli, "dev"], {
  env: { ...process.env, WEBVIEW_HOST: host },
  stdio: "inherit",
});
proc.on("exit", (code) => process.exit(code ?? 0));
