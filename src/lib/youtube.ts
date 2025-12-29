import { Channel } from "../models/channel";
import { Playlist } from "../models/playlist";
import { Video } from "../models/video";

import { channelsConst } from "../constants/channels";
import { Result } from "../models/result";

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

export async function initApp() {
	console.log("Inicializando integración de YouTube...");

	// Pre-cargar canales
	youtubeCache.channels = await getChannelsAPI();
	console.log(`- Canales cargados: ${youtubeCache.channels.length}`);

	// Pre-cargar listas de reproducción
	youtubeCache.playlists = await getAllPlaylistsAPI();
	console.log(`- Listas de reproducción cargadas: ${youtubeCache.playlists.length}`);

	// // Pre-cargar ID vídeos de las listas de reproducción
	// for (const playlist of youtubeCache.playlists) {
	// 	playlist.videosId = (await getPlaylistVideosIdAPI(playlist.id));
	// }

	let allVideosId = [];
	// Pre-cargar TODOS los vídeos de los canales
	for (const channel of youtubeCache.channels) {
		let videosId = await getPlaylistVideosIdAPI(channel.uploadsPlaylistId || "");
		allVideosId.push(...videosId);
		console.log(`- Vídeos cargados del canal '${channel.title}': ${videosId.length}`);
	}

	youtubeCache.videos = await getVideosAPI(allVideosId);
	console.log(`- Videos cargados TOTAL: ${youtubeCache.videos.length}`);
	
	console.log("✅ Datos de YouTube precargados en caché.");
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
//   console.log("Fetching: " + url);
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
	console.log(youtubeCache.videos.map(v => v.id));

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

export async function getAllPlaylistsAPI() : Promise<Playlist[]> {
	const playlists = [];

	for (const channel of channelsConst) {
		playlists.push(...(await getPlaylistsAPI(channel.id)));
	}

	return playlists;
}

export async function getPlaylistsAPI(channelId: string, pageToken: string = "") : Promise<Playlist[]> {
	let url = `${apiUrl}playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${apiKey}`;
	if (pageToken!="") url += `&pageToken=${pageToken}`;
	
	const cacheKey = `playlists_${channelId}_${pageToken}`;
	
	try {
		const data = await fetchWithCache(url, cacheKey);
		
		const playlists = data.items.map((playlist: any) => new Playlist(playlist));

		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
			playlists.push(...(await getPlaylistsAPI(channelId, data.nextPageToken)));
		}

		return playlists;
	} catch (error) {
		console.error(`Error al obtener listas de reproducción para el canal ${channelId}:`, error);
		throw new Error("Error al obtener listas de reproducción.");
	}
}

export async function getPlaylistVideosAPI(playlistId: string, pageToken: string = ""): Promise<Video[]> {
	let url = `${apiUrl}playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
	if (pageToken!="") url += `&pageToken=${pageToken}`;

	const cacheKey = `playlist_videos_${playlistId}_${pageToken}`;
	
	try {
		
		const data = await fetchWithCache(url, cacheKey);
		const ids = data.items.map((item: any) => item.contentDetails.videoId);

		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
			ids.push(...(await getPlaylistVideosAPI(playlistId, data.nextPageToken)));
		}

		if (pageToken !== "") return ids; // Si es paginacion, devolver los ids

		// Para la solicitud principal, obtener los videos completos
		return await getVideosAPI(ids);

	} catch (error) {
		console.error(`Error al obtener vídeos de la playlist ${playlistId}:`, error);
		throw new Error("Error al obtener vídeos de la playlist.");
	}
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

	// console.log(`Total de vídeos obtenidos: ${allVideos.length}`);
	return allVideos;
}


//#endregion