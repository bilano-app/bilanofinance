import crypto from "crypto";

const KEY_LENGTH = 64;

/**
 * Enkripsi password menggunakan Scrypt (Standar Keamanan OWASP / Fintech)
 * Menghasilkan salt unik 16-byte dan hash 64-byte.
 */
export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString("hex")}`);
        });
    });
}

/**
 * Verifikasi password dengan dukungan Backward-Compatibility
 * Aman dari Timing-Attacks dan mendukung migrasi akun lama secara otomatis.
 */
export async function verifyPassword(password: string, storedValue: string | null | undefined): Promise<boolean> {
    if (!storedValue || !password) return false;

    // Jika format adalah hash scrypt (salt:derivedKey)
    if (storedValue.includes(":")) {
        const [salt, keyHex] = storedValue.split(":");
        if (!salt || !keyHex) return false;

        return new Promise((resolve) => {
            crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
                if (err) return resolve(false);
                const keyBuffer = Buffer.from(keyHex, "hex");
                if (keyBuffer.length !== derivedKey.length) return resolve(false);
                resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
            });
        });
    }

    // Fallback akun lama: jika password di database masih plain text
    return storedValue === password;
}
