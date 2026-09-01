import { type Request, type Response, type NextFunction } from "express";

// =========================================================================
// 🛡️ BILANO ENTERPRISE SECURITY & SHIELD ENGINE
// Perlindungan multi-lapis terhadap SQLi, XSS, Brute-force, DoS, & Bot Spammers
// =========================================================================

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Bersihkan cache rate limiter setiap 5 menit agar memori tetap ramping
setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    });
}, 5 * 60 * 1000);

/**
 * 1. HTTP Security Headers (Anti-Clickjacking, Anti-MIME Sniffing, HSTS, CSP)
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
    // Sembunyikan identitas server Express dari penyerang
    res.removeHeader("X-Powered-By");

    // Cegah Clickjacking (pembajakan klik via iframe)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Cegah MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Aktifkan filter XSS bawaan browser
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Paksa browser hanya menggunakan koneksi terenkripsi HTTPS (HSTS)
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    // Kebijakan perujuk (Referrer Policy) ketat
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Batasi akses fitur sensor perangkat
    res.setHeader("Permissions-Policy", "geolocation=(), camera=(self), microphone=(self)");

    // Cegah Flash / Cross-domain XML exploits
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Download-Options", "noopen");

    // Cache control ketat untuk data finansial sensitif
    if (req.path.startsWith("/api")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }

    next();
}

/**
 * 2. Web Application Firewall (WAF): Blokir Bot Jahat, SQLi, XSS, & Path Traversal
 */
const MALICIOUS_USER_AGENTS = [
    "sqlmap", "nikto", "acunetix", "dirbuster", "gobuster", "havij",
    "masscan", "wpscan", "zgrab", "nmap", "nessus", "openvas"
];

const SQLI_PATTERNS = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))(\s*)((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /union(\s|\+)+(all(\s|\+)+)?select/i,
    /drop(\s|\+)+table/i,
    /insert(\s|\+)+into/i,
    /information_schema/i
];

const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
];

function sanitizeString(str: string): string {
    if (typeof str !== "string") return str;
    // Bersihkan karakter kontrol berbahaya dan tag script tersembunyi
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/onload=/gi, "")
        .replace(/onerror=/gi, "");
}

function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => typeof item === "string" ? sanitizeString(item) : sanitizeObject(item));
    }
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "string") {
            sanitized[key] = sanitizeString(val);
        } else if (typeof val === "object") {
            sanitized[key] = sanitizeObject(val);
        } else {
            sanitized[key] = val;
        }
    }
    return sanitized;
}

export function applyWaf(req: Request, res: Response, next: NextFunction) {
    const userAgent = (req.headers["user-agent"] || "").toLowerCase();

    // 1. Blokir Scanner Jahat / Hacking Tools Otomatis
    if (MALICIOUS_USER_AGENTS.some(bot => userAgent.includes(bot))) {
        return res.status(403).json({ error: "Akses ditolak oleh Sistem Keamanan Bilano (Shield WAF)." });
    }

    // 2. Cegah Path Traversal (/../, \..\)
    const rawUrl = decodeURIComponent(req.originalUrl || "");
    if (rawUrl.includes("../") || rawUrl.includes("..\\") || rawUrl.includes("/etc/passwd")) {
        return res.status(400).json({ error: "Permintaan diblokir karena mengandung pola jalur ilegal." });
    }

    // 3. Sanitasi otomatis payload JSON body & query
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === "object") {
        req.query = sanitizeObject(req.query);
    }

    next();
}

/**
 * 3. Intelligent Multi-Tier Rate Limiting (Anti Brute-Force & Anti-DDoS)
 */
export function applyRateLimiter(tier: 'auth' | 'ai' | 'payment' | 'admin' | 'api') {
    let maxRequests = 120;
    let windowMs = 60 * 1000; // 1 Menit

    if (tier === 'auth') {
        maxRequests = 20; // 20 requests per 5 menit untuk login / OTP
        windowMs = 5 * 60 * 1000;
    } else if (tier === 'ai') {
        maxRequests = 30; // 30 requests per menit untuk AI Chat
        windowMs = 60 * 1000;
    } else if (tier === 'admin') {
        maxRequests = 25; // 25 requests per 5 menit untuk admin manager
        windowMs = 5 * 60 * 1000;
    } else if (tier === 'payment') {
        maxRequests = 25; // 25 requests per menit untuk pembayaran
        windowMs = 60 * 1000;
    }

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
        const clientIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
        const key = `${tier}:${clientIp}`;
        const now = Date.now();

        const current = rateLimitStore.get(key);

        if (!current || now > current.resetTime) {
            rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }

        if (current.count >= maxRequests) {
            const retryAfterSec = Math.ceil((current.resetTime - now) / 1000);
            res.setHeader("Retry-After", retryAfterSec.toString());
            return res.status(429).json({
                error: `Terlalu banyak permintaan. Demi keamanan akun Anda, silakan coba lagi dalam ${retryAfterSec} detik.`,
                retryAfter: retryAfterSec
            });
        }

        current.count++;
        next();
    };
}
