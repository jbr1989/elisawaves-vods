import type { Channel } from "../models/channel";
import type { Playlist } from "../models/playlist";
import type { Video } from "../models/video";

/**
 * Instantánea de los tres arrays planos del caché. Se mantiene plana a propósito:
 * así todos los consumidores existentes (getPlaylists, getStaticPaths, sitemaps,
 * find, ...) siguen funcionando sin cambios.
 */
export interface CacheSnapshot {
	channels: Channel[];
	playlists: Playlist[];
	videos: Video[];
}

/** Datos frescos obtenidos para UN canal. */
export interface ChannelSegment {
	channel: Channel | null;
	playlists: Playlist[];
	videos: Video[];
}

const UNASSIGNED = "__unassigned__";

const channelKeyOf = (channel: Channel): string => channel.id;
const elementKeyOf = (element: { channelId: string }): string => element.channelId;

/**
 * Parte el caché plano en segmentos por canal, respetando el orden de
 * `channelIds`. Los elementos que no pertenecen a ningún canal configurado se
 * guardan aparte para no perderlos al recomponer.
 */
export function partitionByChannel(
	snapshot: CacheSnapshot,
	channelIds: string[]
): Map<string, CacheSnapshot> {
	const segments = new Map<string, CacheSnapshot>();

	for (const id of channelIds) {
		segments.set(id, {
			channels: snapshot.channels.filter((c) => channelKeyOf(c) === id),
			playlists: snapshot.playlists.filter((p) => elementKeyOf(p) === id),
			videos: snapshot.videos.filter((v) => elementKeyOf(v) === id),
		});
	}

	const known = new Set(channelIds);
	segments.set(UNASSIGNED, {
		channels: snapshot.channels.filter((c) => !known.has(channelKeyOf(c))),
		playlists: snapshot.playlists.filter((p) => !known.has(elementKeyOf(p))),
		videos: snapshot.videos.filter((v) => !known.has(elementKeyOf(v))),
	});

	return segments;
}

/**
 * Sustituye SOLO los segmentos de los canales que se actualizaron con éxito y
 * recompone los arrays en orden canónico. Los canales ausentes en `updates`
 * (los que fallaron) conservan íntegramente su segmento anterior.
 *
 * Es una función pura: no toca `youtubeCache` ni el sistema de archivos.
 */
export function mergeChannelSegments(
	base: CacheSnapshot,
	updates: Map<string, ChannelSegment>,
	channelIds: string[]
): CacheSnapshot {
	const segments = partitionByChannel(base, channelIds);

	for (const [id, data] of updates) {
		const previous = segments.get(id);
		segments.set(id, {
			// Si no llegó la ficha del canal, se conserva la anterior.
			channels: data.channel ? [data.channel] : previous?.channels ?? [],
			playlists: data.playlists,
			videos: data.videos,
		});
	}

	const merged: CacheSnapshot = { channels: [], playlists: [], videos: [] };
	for (const id of [...channelIds, UNASSIGNED]) {
		const segment = segments.get(id);
		if (!segment) continue;
		merged.channels.push(...segment.channels);
		merged.playlists.push(...segment.playlists);
		merged.videos.push(...segment.videos);
	}

	return merged;
}
