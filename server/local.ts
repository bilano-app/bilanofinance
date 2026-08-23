import "dotenv/config";
import app from "./index.js";
import { setupVite, log } from "./vite.js";
import http from "http";

const server = http.createServer(app);

(async () => {
  // Tambahkan Vite middleware ke Express
  await setupVite(app, server);
  
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Local dev server (Fullstack) serving on http://localhost:${PORT}`);
  });
})();
