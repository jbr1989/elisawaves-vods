import { Channel } from "../models/channel";
import { Playlist } from "../models/playlist";
import { Video } from "../models/video";

import { channelsConst } from "../constants/channels";
import { Result } from "../models/result";
import { loadPersistedCache, isCacheFresh, savePersistedCache } from "./cache";
import type { ChannelStatus } from "./cache";
import { mergeChannelSegments, partitionByChannel } from "./cacheMerge";
import type { CacheSnapshot, ChannelSegment } from "./cacheMerge";

// src/lib/youtube.ts
const apiUrl = "https://www.googleapis.com/youtube/v3/";
let apiKey = process.env.YOUTUBE_API_KEY;

export function setYoutubeApiKey(key: string) {
  apiKey = key;
}

// Sistema de caché para reducir llamadas a la API
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

type CacheStore = {
  [key: string]: CacheEntry<unknown>;
};

export let youtubeCache = {
	channels: [] as Channel[],
	playlists: [] as Playlist[],
	videos: [] as Video[],
};

/** Estado de la última captura por canal. Se persiste en youtube-cache.json. */
export const channelStatus: Record<string, ChannelStatus> = {};

let initialized = false;

/** "ok" cuando no hay entrada (p.ej. caché v2 antiguo sin estados). */
export function getChannelStatus(channelId: string): ChannelStatus {
	return channelStatus[channelId] ?? "ok";
}

function replaceChannelStatuses(statuses: Record<string, ChannelStatus>): void {
	for (const key of Object.keys(channelStatus)) delete channelStatus[key];
	Object.assign(channelStatus, statuses);
}

// Se muta in place para no romper las referencias vivas de los importadores.
function assignSnapshot(snapshot: CacheSnapshot): void {
	youtubeCache.channels = snapshot.channels;
	youtubeCache.playlists = snapshot.playlists;
	youtubeCache.videos = snapshot.videos;
}

export async function initApp() {
	if (initialized) return;

	const channelIds = channelsConst.map((channel) => channel.id);

	// 1. Intentar cargar desde caché persistente (youtube-cache.json)
	const persisted = loadPersistedCache();
	if (isCacheFresh(persisted)) {
		assignSnapshot({
			channels: persisted!.channels as Channel[],
			playlists: persisted!.playlists as Playlist[],
			videos: persisted!.videos as Video[],
		});
		replaceChannelStatuses(persisted!.channelStatus ?? {});
		const ageH = ((Date.now() - persisted!.timestamp) / 3600000).toFixed(1);
		console.log(`✅ Caché cargado desde JSON (edad: ${ageH}h). Sin llamadas a la API.`);
		initialized = true;
		return;
	}

	// 2. Caché inexistente o expirado: se parte de los datos ANTERIORES como
	//    línea base. Si un canal falla, su segmento se conserva tal cual y solo
	//    se sustituyen los segmentos de los canales que sí se actualizaron.
	const base: CacheSnapshot = {
		channels: Array.isArray(persisted?.channels) ? persisted!.channels as Channel[] : [],
		playlists: Array.isArray(persisted?.playlists) ? persisted!.playlists as Playlist[] : [],
		videos: Array.isArray(persisted?.videos) ? persisted!.videos as Video[] : [],
	};
	const previousSegments = partitionByChannel(base, channelIds);
	const updates = new Map<string, ChannelSegment>();
	let okCount = 0;

	console.log("Inicializando integración de YouTube desde API (actualización por canal)...");

	for (const channelConst of channelsConst) {
		const channelId = channelConst.id;
		const previous = previousSegments.get(channelId)!;
		const hasPreviousData =
			previous.channels.length + previous.playlists.length + previous.videos.length > 0;

		try {
			const channel = await getChannelAPI(channelId);
			const playlists = await getPlaylistsAPI(channelId);
			// Si la ficha no llegó, se usa el uploadsPlaylistId ya almacenado.
			const uploadsPlaylistId =
				channel?.uploadsPlaylistId || previous.channels[0]?.uploadsPlaylistId || "";
			const videosId = await getPlaylistVideosIdAPI(uploadsPlaylistId);
			const videos = await getVideosAPI(videosId);

			// Una respuesta 200 sin datos también cuenta como fallo: evita que un
			// "fallo silencioso" de la API borre el segmento ya guardado del canal.
			const emptyButHadData =
				(playlists.length === 0 && previous.playlists.length > 0) ||
				(videos.length === 0 && previous.videos.length > 0) ||
				(channel === null && previous.channels.length > 0);
			if (emptyButHadData) {
				throw new Error(`Respuesta vacía de la API para el canal ${channelId}`);
			}

			updates.set(channelId, { channel, playlists, videos });
			channelStatus[channelId] = "ok";
			okCount++;
			console.log(
				`- Canal '${channelConst.title}' actualizado: ${playlists.length} listas, ${videos.length} vídeos.`
			);
		} catch (error) {
			channelStatus[channelId] = hasPreviousData ? "stale" : "empty";
			console.warn(
				`⚠️ No se pudo actualizar el canal '${channelConst.title}' (${channelId}). ` +
					`Se conservan sus datos previos (${channelStatus[channelId]}):`,
				error instanceof Error ? error.message : error
			);
		}
	}

	// 3. Mezclar y publicar en memoria (incluso si algún canal falló).
	const merged = mergeChannelSegments(base, updates, channelIds);
	assignSnapshot(merged);

	// 4. Persistir. Si NINGÚN canal se pudo actualizar no se refresca el
	//    timestamp: el caché anterior sigue expirado y el próximo build reintenta.
	if (okCount > 0) {
		savePersistedCache({
			channels: merged.channels,
			playlists: merged.playlists,
			videos: merged.videos,
			channelStatus: { ...channelStatus },
		});
		console.log(
			`✅ Datos de YouTube cargados y persistidos (${okCount}/${channelsConst.length} canales actualizados).`
		);
	} else {
		console.warn(
			"⚠️ Ningún canal se pudo actualizar; se mantiene el timestamp anterior para reintentar en el próximo build."
		);
	}

	initialized = true;
}

//#region CACHE

const cache: CacheStore = {};
const CACHE_DURATION = 3600000; // 1 hora en milisegundos

// Función para obtener datos de la caché o de la API
async function fetchWithCache(url: string, cacheKey?: string): Promise<any> {
	const key = cacheKey || url;
	const now = Date.now();

	// Verificar si existe en caché y no ha expirado
	if (cache[key] && (now - cache[key].timestamp) < CACHE_DURATION) {
		console.log("Cache hit", key);
		return cache[key].data;
	}

	// Si no está en caché o expiró, hacer la petición
	// console.log("Fetching: " + url);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Error en la petición: ${res.status} ${res.statusText}`);

	const data = await res.json();

	// Guardar en caché
	cache[key] = {
	data,
	timestamp: now
	};

	return data;
}

//#endregion


//#region CHANNEL

export async function getChannel({
	channelId = "",
	name = "",
}: { channelId?: string | undefined; name?: string | undefined } = {})  : Promise<Channel | null> {

	if (channelId === "" && name !== "")
		channelId = channelsConst.find((channel) => channel.tag === name)?.id || "";

	if (channelId === "") return null;

	const cachedChannel = youtubeCache.channels.find((channel) => channel.id === channelId);
	if (cachedChannel) return cachedChannel;

	return null;
}

//#endregion

//#region PLAYLIST 

export async function getPlaylists(channelId: string) : Promise<Playlist[]> {

	const cachedPlaylists = youtubeCache.playlists.filter((playlist) => playlist.channelId === channelId);
	if (cachedPlaylists.length > 0) return cachedPlaylists;

	return [];
}


//#endregion

//#region VIDEO

export async function getVideo(videoId: string) : Promise<Video | null> {
	if (videoId === "") return null;
	if (youtubeCache.videos.length === 0) await initApp();

	console.log("Buscando vídeo en caché:", videoId);
	// console.log(youtubeCache.videos.map(v => v.id));

	const cachedVideo = youtubeCache.videos.find((video) => video.id === videoId);
	if (cachedVideo) return cachedVideo;
	return null;
}

//#endregion

//#region SEARCH

export async function find(query: string): Promise<Result[]>  {

	if (query.trim() === "") return [];
	if (youtubeCache.videos.length === 0) await initApp();

	let playlistsResults = youtubeCache.playlists.filter((playlist) => 
		playlist.title.toLowerCase().includes(query.toLowerCase())
	);
	
	let videosResults = youtubeCache.videos.filter((video) => 
		video.title.toLowerCase().includes(query.toLowerCase()) ||
		video.descr.toLowerCase().includes(query.toLowerCase())
	);

	let results = [];
	results.push(...playlistsResults.map((playlist) => new Result("playlist", playlist)));
	results.push(...videosResults.map((video) => new Result("video", video)));

	console.log(`Búsqueda de '${query}': ${playlistsResults.length} listas de reproducción y ${videosResults.length} vídeos encontrados.`);

	return results;
}

// export async function find(query: string): Promise<Result[]>  {
// 	const channels = channelsConst.map((channel) => channel.id);
// 	console.log("CHANNELS", channels);
	
// 	try {
// 		const results = [];
		
// 		for (const channel of channels) {
// 			results.push(...(await findInChannel(query, channel)));
// 		}
		
// 		return results;
// 	} catch (error) {
// 		console.error(`Error en la búsqueda de '${query}':`, error);
// 		throw new Error("Error al realizar la búsqueda.");
// 	}
// }

// export async function findInChannel(query: string, channelId: string): Promise<Result[]> {
// 	const normalizedQuery = query.toLowerCase().trim();
	
// 	try {
// 		let url = `${apiUrl}search?part=snippet&q=${query}&order=date&channelId=${channelId}&key=${apiKey}`;
// 		let pageToken = undefined;
// 		let results = [];

// 		do {
// 			let cacheKey = `search_channel_${channelId}_${normalizedQuery}_${pageToken}`;
// 			let nextUrl = url + (pageToken!=undefined ? `&pageToken=${pageToken}` : "");
// 			console.log("Searching URL:", nextUrl);
// 			let data = await fetchWithCache(nextUrl, cacheKey);

// 			// console.log("Results found:", data);
// 			results.push(...data.items.map((element: any) => new Result(element)));

// 			pageToken = data.nextPageToken;
// 		} while (pageToken);
		
// 		return results;
// 	} catch (error) {
// 		console.error(`Error al buscar '${query}' en el canal ${channelId}:`, error);
// 		throw new Error("Error al buscar vídeos.");
// 	}
// }

//#endregion

//#region API YOUTUBE

export async function getChannelsAPI() : Promise<Channel[]> {
	const channelsId = channelsConst.map((channel) => channel.id);
	const url = `${apiUrl}channels?part=contentDetails,snippet,statistics&id=${channelsId.join(",")}&key=${apiKey}`;
	const cacheKey = `channels_all`;

	try {
		const data = await fetchWithCache(url, cacheKey);
		const channels = data.items.map((channel: any) => new Channel(channel));
		return channels;
	} catch (error) {
		console.error("Error al obtener los canales:", error);
		throw new Error("Error al obtener la información de los canales.");
	}
}

/**
 * Ficha de UN canal. Se usa una petición por canal para que un fallo (o la
 * ausencia del canal en la respuesta) no afecte a los demás.
 */
export async function getChannelAPI(channelId: string): Promise<Channel | null> {
	const url = `${apiUrl}channels?part=contentDetails,snippet,statistics&id=${channelId}&key=${apiKey}`;
	const cacheKey = `channel_${channelId}`;

	try {
		const data = await fetchWithCache(url, cacheKey);
		const item = data.items?.[0];
		return item ? new Channel(item) : null;
	} catch (error) {
		console.error(`Error al obtener el canal ${channelId}:`, error);
		throw new Error(`Error al obtener la información del canal ${channelId}.`);
	}
}

export async function getAllPlaylistsAPI() : Promise<Playlist[]> {
	const playlists = [];

	for (const channel of channelsConst) {
		playlists.push(...(await getPlaylistsAPI(channel.id)));
	}

	return playlists;
}

// export async function getPlaylistsAPI(channelId: string, pageToken: string = "") : Promise<Playlist[]> {
// 	let url = `${apiUrl}playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${apiKey}`;
// 	if (pageToken!="") url += `&pageToken=${pageToken}`;
	
// 	const cacheKey = `playlists_${channelId}_${pageToken}`;
	
// 	try {
// 		const data = await fetchWithCache(url, cacheKey);
		
// 		const playlists = data.items.map((playlist: any) => new Playlist(playlist));

// 		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
// 			playlists.push(...(await getPlaylistsAPI(channelId, data.nextPageToken)));
// 		}

// 		return playlists;
// 	} catch (error) {
// 		console.error(`Error al obtener listas de reproducción para el canal ${channelId}:`, error);
// 		throw new Error("Error al obtener listas de reproducción.");
// 	}
// }

export async function getPlaylistsAPI(channelId: string) : Promise<Playlist[]> {
	// Si no hay IDs, devolver array vacío
	if (channelId=="") return [];
	
	// La API de YouTube tiene un límite de 50 IDs por solicitud
	const MAX_IDS_PER_REQUEST = 50;
	const playlists : Playlist[] = [];


	let url = `${apiUrl}playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${MAX_IDS_PER_REQUEST}&key=${apiKey}`;
	let pageToken = "";

	do {
		let cacheKey = `playlists_${channelId}_${pageToken}`;
		let nextUrl = url + (pageToken!=undefined ? `&pageToken=${pageToken}` : "");
		
		try {

			let data = await fetchWithCache(nextUrl, cacheKey);

			// console.log("Results found:", data);
			if (data.items) playlists.push(...data.items.map((playlist: any) => new Playlist(playlist)));

			pageToken = data.nextPageToken;
		} catch (error) {
			console.error(`Error al obtener los playlists del canal ${channelId}:`, error);
			throw new Error(`Error al obtener los playlists del canal ${channelId}`);
		}
	} while (pageToken);

	return playlists;
}

// export async function getPlaylistVideosAPI(playlistId: string, pageToken: string = ""): Promise<Video[]> {
// 	let url = `${apiUrl}playlistItems?part=contentDetails,snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
// 	if (pageToken!="") url += `&pageToken=${pageToken}`;

// 	const cacheKey = `playlist_videos_${playlistId}_${pageToken}`;
	
// 	try {
		
// 		const data = await fetchWithCache(url, cacheKey);

// 		// console.log(data.items);

// 		const ids = data.items
// 			.sort((a: any, b: any) => a.snippet.position - b.snippet.position) // Ordenar por posición
// 			.map((item: any) => item.contentDetails.videoId);

// 		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
// 			ids.push(...(await getPlaylistVideosAPI(playlistId, data.nextPageToken)));
// 		}

// 		if (pageToken !== "") return ids; // Si es paginacion, devolver los ids


// 		// Para la solicitud principal, obtener los videos completos
// 		return await getVideosAPI(ids);

// 	} catch (error) {
// 		console.error(`Error al obtener vídeos de la playlist ${playlistId}:`, error);
// 		throw new Error("Error al obtener vídeos de la playlist.");
// 	}
// }

export async function getPlaylistVideosAPI(playlistId: string): Promise<Video[]> {
	// Si no hay IDs, devolver array vacío
	if (playlistId=="") return [];
	
	// La API de YouTube tiene un límite de 50 IDs por solicitud
	const MAX_IDS_PER_REQUEST = 50;
	const ids : string[] = [];

	let url = `${apiUrl}playlistItems?part=contentDetails,snippet&playlistId=${playlistId}&maxResults=${MAX_IDS_PER_REQUEST}&key=${apiKey}`;
	let pageToken = "";

	do {
		let cacheKey = `playlist_videos_${playlistId}_${pageToken}`;
		let nextUrl = url + (pageToken!=undefined ? `&pageToken=${pageToken}` : "");
		
		try {

			let data = await fetchWithCache(nextUrl, cacheKey);
			console.log(data.items);

			// console.log("Results found:", data);
			if (data.items) ids.push(...data.items.map((item: any) => item.contentDetails.videoId));

			pageToken = data.nextPageToken;
		} catch (error) {
			console.error(`Error al obtener vídeos de la playlist ${playlistId}:`, error);
			throw new Error("Error al obtener vídeos de la playlist.");
		}
	} while (pageToken);

	console.log("IDS", ids);

	return await getVideosAPI(ids);
}

export async function getPlaylistVideosIdAPI(playlistId: string, pageToken: string = ""): Promise<string[]> {
	let url = `${apiUrl}playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
	if (pageToken!="") url += `&pageToken=${pageToken}`;

	const cacheKey = `playlist_videos_${playlistId}_${pageToken}`;
	
	try {
		
		const data = await fetchWithCache(url, cacheKey);
		const ids = data.items.map((item: any) => item.contentDetails.videoId);

		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
			ids.push(...(await getPlaylistVideosIdAPI(playlistId, data.nextPageToken)));
		}

		return ids;

	} catch (error) {
		console.error(`Error al obtener vídeos de la playlist ${playlistId}:`, error);
		throw new Error("Error al obtener vídeos de la playlist.");
	}
}

export async function getVideosAPI(ids: string[]): Promise<Video[]> {
	// Si no hay IDs, devolver array vacío
	if (!ids || ids.length === 0) return [];
	
	// La API de YouTube tiene un límite de 50 IDs por solicitud
	const MAX_IDS_PER_REQUEST = 50;
	const allVideos: Video[] = [];
	
	// Dividir los IDs en lotes de máximo 50
	for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
		const batch = ids.slice(i, i + MAX_IDS_PER_REQUEST);
		
		// Crear un hash único para este lote de IDs
		const idsHash = batch.sort().join(",");
		const cacheKey = `videos_${idsHash}`;
		
		try {
			const url = `${apiUrl}videos?part=snippet,contentDetails&id=${batch.join(",")}&key=${apiKey}`;
			const data = await fetchWithCache(url, cacheKey);

			// console.log(`Se han obtenido ${data.items.length} vídeos del lote ${Math.floor(i / MAX_IDS_PER_REQUEST) + 1}`);
			// console.log("VIDEO DATA 0", data.items[0]);

			const videos = data.items.map((video: any) => new Video(video));
			allVideos.push(...videos);
		} catch (error) {
			console.error(`Error al obtener los vídeos del lote ${Math.floor(i / MAX_IDS_PER_REQUEST) + 1}:`, error);
			throw new Error("Error al obtener el vídeo.");
		}
	}

	// Ordenar videos
	const map = new Map( allVideos.map(video => [video.id, video]) );
	return ids.map(id => map.get(id)).filter((v): v is Video => v !== undefined);

	// // console.log(`Total de vídeos obtenidos: ${allVideos.length}`);
	// return allVideos;
}


//#endregion