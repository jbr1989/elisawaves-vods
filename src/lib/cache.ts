import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas en ms

export interface PersistedCache {
	timestamp: number;
	channels: unknown[];
	playlists: unknown[];
	videos: unknown[];
}

const CACHE_DIR = path.resolve("src/data");
const CACHE_PATH = path.join(CACHE_DIR, "youtube-cache.json");

export function loadPersistedCache(): PersistedCache | null {
	try {
		if (!existsSync(CACHE_PATH)) return null;
		const raw = readFileSync(CACHE_PATH, "utf-8");
		const parsed = JSON.parse(raw) as PersistedCache;
		if (!parsed.timestamp || !Array.isArray(parsed.videos)) return null;
		return parsed;
	} catch (e) {
		console.warn("No se pudo leer el caché persistente:", e);
		return null;
	}
}

export function isCacheFresh(cache: PersistedCache | null): boolean {
	if (!cache) return false;
	return Date.now() - cache.timestamp < CACHE_TTL;
}

export function savePersistedCache(data: Omit<PersistedCache, "timestamp">): void {
	try {
		if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
		const payload: PersistedCache = { timestamp: Date.now(), ...data };
		writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), "utf-8");
		console.log("💾 Caché persistente guardado en", CACHE_PATH);
	} catch (e) {
		// En producción (FS read-only en Vercel) esto falla silenciosamente
		console.warn("No se pudo escribir el caché persistente (FS read-only?):", e);
	}
}