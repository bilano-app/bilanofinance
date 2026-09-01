process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { applySecurityHeaders, applyWaf, applyRateLimiter } from "./security.js";

const app = express();

// 1. Lapisan Pertama: Security Headers (HSTS, Anti-Clickjacking, Anti-XSS, MIME Sniffing Protection)
app.use(applySecurityHeaders);

// 2. Lapisan Kedua: Web Application Firewall (WAF) & Input Sanitization
app.use(applyWaf);

// 3. Batasan Ukuran Payload (Cegah Memory Exhaustion / Buffer Overflow)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: false }));

// 4. Lapisan Ketiga: Global API Rate Limiter
app.use("/api", applyRateLimiter('api'));

// Middleware Logging sederhana untuk pantau performa & status HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });
  next();
});

// Daftarkan semua rute API
registerRoutes(app);

// Global Secure Error Handler (Mencegah kebocoran stack trace database ke pengguna)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = (process.env.NODE_ENV === "production" && status === 500) 
    ? "Terjadi kesalahan internal pada server. Tim keamanan kami telah menerima laporan ini." 
    : err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});

// PENTING UNTUK VERCEL: Wajib diekspor agar API bisa menyala
export default app;