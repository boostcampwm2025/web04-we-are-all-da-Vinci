import { networkInterfaces } from "os";
import { spawn } from "child_process";

function getLocalIP() {
  for (const iface of Object.values(networkInterfaces())) {
    for (const net of iface) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const host = getLocalIP();

const proc = spawn("granite", ["dev"], {
  env: { ...process.env, WEBVIEW_HOST: host },
  stdio: "inherit",
  shell: true,
});
proc.on("exit", (code) => process.exit(code ?? 0));
