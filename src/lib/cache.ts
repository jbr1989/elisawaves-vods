import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

export const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas en ms
// Cambiar este número cuando cambie la estructura del caché (p.ej. añadir campos a un modelo).
// Se mantiene en 2 a propósito: `channelStatus` es un campo OPCIONAL, así los
// youtube-cache.json ya generados siguen siendo válidos sin migración (si se
// subiera la versión, isCacheFresh descartaría TODO el caché y perderíamos
// precisamente los datos del canal que queremos conservar).
export const CACHE_VERSION = 2;

/** Estado del último intento de captura de un canal. */
export type ChannelStatus = "ok" | "stale" | "empty";

export interface PersistedCache {
	version?: number;
	timestamp: number;
	channels: unknown[];
	playlists: unknown[];
	videos: unknown[];
	/** Opcional: permite leer cachés v2 antiguos que no lo tenían. */
	channelStatus?: Record<string, ChannelStatus>;
}

const CACHE_DIR = path.resolve("src/data");
const CACHE_PATH = path.join(CACHE_DIR, "youtube-cache.json");

export function loadPersistedCache(): PersistedCache | null {
	try {
		if (!existsSync(CACHE_PATH)) return null;
		const raw = readFileSync(CACHE_PATH, "utf-8");
		const parsed = JSON.parse(raw) as PersistedCache;
		if (
			!parsed.timestamp ||
			!Array.isArray(parsed.channels) ||
			!Array.isArray(parsed.playlists) ||
			!Array.isArray(parsed.videos)
		) return null;
		// Compatibilidad con cachés v2 generados antes de añadir `channelStatus`.
		if (!parsed.channelStatus) parsed.channelStatus = {};
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