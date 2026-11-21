import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type { Video } from "../models/video";

/**
 * Caché en disco de los vídeos de CADA playlist. Se escribe cuando la API
 * responde bien y solo se lee cuando esa lista concreta falla en un build
 * posterior. Un fichero por lista evita carreras entre las ~100 páginas que
 * se prerenderizan en paralelo.
 */
const DEFAULT_DIR = path.resolve("src/data/playlist-videos");
const VALID_ID = /^[A-Za-z0-9_-]+$/;

let writeWarningShown = false;

function cacheFile(playlistId: string, baseDir: string): string | null {
	// Los ids de YouTube son alfanuméricos con _ y -; así evitamos path traversal.
	if (!VALID_ID.test(playlistId)) return null;
	return path.join(baseDir, `${playlistId}.json`);
}

/** Devuelve null si no hay fichero, está corrupto o el id no es válido. */
export function readCachedPlaylistVideos(
	playlistId: string,
	baseDir: string = DEFAULT_DIR
): Video[] | null {
	const file = cacheFile(playlistId, baseDir);
	if (!file || !existsSync(file)) return null;

	try {
		const parsed = JSON.parse(readFileSync(file, "utf-8"));
		if (!Array.isArray(parsed)) return null;
		// Validación mínima para no servir un caché a medias.
		if (!parsed.every((v) => v && typeof v.id === "string" && typeof v.title === "string")) {
			return null;
		}
		return parsed as Video[];
	} catch {
		return null;
	}
}

/**
 * Guarda de forma atómica y best-effort. No lanza: un FS de solo lectura
 * (Vercel) o un directorio inexistente no deben tumbar el build.
 */
export function writeCachedPlaylistVideos(
	playlistId: string,
	videos: Video[],
	baseDir: string = DEFAULT_DIR
): void {
	const file = cacheFile(playlistId, baseDir);
	if (!file || !Array.isArray(videos) || videos.length === 0) return;

	const payload = JSON.stringify(videos);
	// Si no cambió nada, no reescribir: evita escrituras innecesarias y recargas en dev.
	const current = readCachedPlaylistVideos(playlistId, baseDir);
	if (current && JSON.stringify(current) === payload) return;

	try {
		mkdirSync(baseDir, { recursive: true });
		const tmp = `${file}.tmp`;
		writeFileSync(tmp, payload, "utf-8");
		renameSync(tmp, file);
	} catch {
		if (!writeWarningShown) {
			writeWarningShown = true;
			console.warn("[playlist-videos] No se pudo escribir el caché (FS read-only?).");
		}
	}
}
