import { Server } from "@automerge/automerge-repo-sync-server/src/server.js";
import os from "os";

const PORT = process.env.PORT || 3030;
const DATA_DIR = process.env.DATA_DIR || "./sync-server-storage";

// Set environment variables for the Server class
process.env.PORT = PORT.toString();
process.env.DATA_DIR = DATA_DIR;

// Get network interfaces to show available IPs
const getNetworkIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
};

console.log(`Starting Automerge sync server...`);
console.log(`Port: ${PORT}`);
console.log(`Data directory: ${DATA_DIR}`);

const server = new Server();

server.ready().then(() => {
  const networkIPs = getNetworkIPs();
  console.log(`\n✅ Sync server is running!`);
  console.log(`   Local:   ws://localhost:${PORT}`);
  if (networkIPs.length > 0) {
    console.log(`   Network: ws://${networkIPs[0]}:${PORT}`);
    if (networkIPs.length > 1) {
      networkIPs.slice(1).forEach(ip => {
        console.log(`            ws://${ip}:${PORT}`);
      });
    }
    console.log(`\n   Use the Network URL from other devices on your local network.`);
  } else {
    console.log(`   (No network interfaces found - server may only be accessible via localhost)`);
  }
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down sync server...");
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down sync server...");
  server.close();
  process.exit(0);
});

