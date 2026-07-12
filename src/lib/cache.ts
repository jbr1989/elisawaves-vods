import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas en ms
// Cambiar este número cuando cambie la estructura del caché (p.ej. añadir campos a un modelo)
export const CACHE_VERSION = 2;

export interface PersistedCache {
	version?: number;
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
	if (cache.version !== CACHE_VERSION) {
		console.log(`♻️ Caché obsoleto (versión ${cache.version} != ${CACHE_VERSION}). Regenerando desde la API...`);
		return false;
	}
	return Date.now() - cache.timestamp < CACHE_TTL;
}

export function savePersistedCache(data: Omit<PersistedCache, "timestamp" | "version">): void {
	try {
		if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
		const payload: PersistedCache = { version: CACHE_VERSION, timestamp: Date.now(), ...data };
		writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), "utf-8");
		console.log("💾 Caché persistente guardado en", CACHE_PATH);
	} catch (e) {
		// En producción (FS read-only en Vercel) esto falla silentiosamente
		console.warn("No se pudo escribir el caché persistente (FS read-only?):", e);
	}
}