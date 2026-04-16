import { networkInterfaces } from "os";
import { spawn } from "child_process";

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

const proc = spawn("granite", ["dev"], {
  env: { ...process.env, WEBVIEW_HOST: host },
  stdio: "inherit",
  shell: true,
});
proc.on("exit", (code) => process.exit(code ?? 0));
