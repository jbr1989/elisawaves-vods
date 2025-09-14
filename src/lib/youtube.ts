import { Channel } from "../models/channel";
import { Playlist } from "../models/playlist";
import { Video } from "../models/video";

import { channelsConst } from "../constants/channels";
import { Result } from "@/models/result";

// src/lib/youtube.ts
const apiUrl = "https://www.googleapis.com/youtube/v3/";
const apiKey = import.meta.env.YOUTUBE_API_KEY;

// Sistema de caché para reducir llamadas a la API
type CacheEntry = {
  data: any;
  timestamp: number;
};

const cache: Record<string, CacheEntry> = {};
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

export async function getChannel({
	channelId = "",
	name = "",
}: { channelId?: string | undefined; name?: string | undefined } = {})  : Promise<Channel | null> {
	if (channelId === "" && name !== "")
		channelId = channelsConst.find((channel) => channel.tag === name)?.id || "";

	if (channelId === "") return null;

	const url = `${apiUrl}channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
	const cacheKey = `channel_${channelId}`;

	try {
		const data = await fetchWithCache(url, cacheKey);
		return new Channel(data.items[0]);
	} catch (error) {
		console.error(`Error al obtener el canal ${channelId}:`, error);
		throw new Error("Error al obtener la información del canal.");
	}
}

export async function getChannels() : Promise<Channel[]> {
	const channelsId = channelsConst.map((channel) => channel.id);
	const url = `${apiUrl}channels?part=snippet,statistics&id=${channelsId.join(",")}&key=${apiKey}`;
	const cacheKey = `channels_all`;

	try {
		const data = await fetchWithCache(url, cacheKey);
		return data.items.map((channel: any) => new Channel(channel));
	} catch (error) {
		console.error("Error al obtener los canales:", error);
		throw new Error("Error al obtener la información de los canales.");
	}
}

export async function getAllPlaylists() : Promise<Playlist[]> {
	const playlists = [];

	for (const channel of channelsConst) {
		playlists.push(...(await getPlaylists(channel.id)));
	}

	return playlists;
}

export async function getPlaylists(channelId: string, pageToken: string = "") : Promise<Playlist[]> {
	let url = `${apiUrl}playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${apiKey}`;
	if (pageToken!="") url += `&pageToken=${pageToken}`;
	
	const cacheKey = `playlists_${channelId}_${pageToken}`;
	
	try {
		const data = await fetchWithCache(url, cacheKey);
		
		const playlists = data.items.map((playlist: any) => new Playlist(playlist));

		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
			playlists.push(...(await getPlaylists(channelId, data.nextPageToken)));
		}

		return playlists;
	} catch (error) {
		console.error(`Error al obtener listas de reproducción para el canal ${channelId}:`, error);
		throw new Error("Error al obtener listas de reproducción.");
	}
}

export async function getPlaylistVideos(playlistId: string, pageToken: string = ""): Promise<Video[]> {
	let url = `${apiUrl}playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
	if (pageToken!="") url += `&pageToken=${pageToken}`;

	const cacheKey = `playlist_videos_${playlistId}_${pageToken}`;
	
	try {
		
		const data = await fetchWithCache(url, cacheKey);
		const ids = data.items.map((item: any) => item.contentDetails.videoId);

		if (data.nextPageToken) { // Si hay más páginas, llamar recursivamente a la función
			ids.push(...(await getPlaylistVideos(playlistId, data.nextPageToken)));
		}

		if (pageToken !== "") return ids; // Si es paginacion, devolver los ids

		// Para la solicitud principal, obtener los videos completos
		return await getVideos(ids);

	} catch (error) {
		console.error(`Error al obtener vídeos de la playlist ${playlistId}:`, error);
		throw new Error("Error al obtener vídeos de la playlist.");
	}
}

export async function getVideos(ids: string[]): Promise<Video[]> {
	// Si no hay IDs, devolver array vacío
	if (!ids || ids.length === 0) return [];
	
	// Crear un hash único para este conjunto de IDs
	const idsHash = ids.sort().join(",");
	const cacheKey = `videos_${idsHash}`;
	
	try {
		
		const url = `${apiUrl}videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${apiKey}`;
		const data = await fetchWithCache(url, cacheKey);

		// if (!data.ok) throw new Error("Error al obtener el vídeo.");

		// console.log("VIDEOS", data);
		// console.log("SNIPPET", data.items[0].snippet);
		// console.log("CONTENTDETAILS", data.items[0].contentDetails);
		
		const videos = data.items.map((video: any) => new Video(video));

		//console.log("DATA", data); // TODO: eliminar este console.log una vez que se tenga el vide
		//console.log("CONTENTDETAILS", data.items[0].contentDetails); // TODO: eliminar este console.log una vez que se tenga el vide

		return videos;
	} catch (error) {
		console.error("Error al obtener los vídeos:", error);
		throw new Error("Error al obtener el vídeo.");
	}
}

export async function find(query: string): Promise<Result[]>  {
	const channels = channelsConst.map((channel) => channel.id);
	console.log("CHANNELS", channels);
	
	try {
		const results = [];
		
		for (const channel of channels) {
			results.push(...(await findInChannel(query, channel)));
		}
		
		return results;
	} catch (error) {
		console.error(`Error en la búsqueda de '${query}':`, error);
		throw new Error("Error al realizar la búsqueda.");
	}
}

export async function findInChannel(query: string, channelId: string): Promise<Result[]> {
	const normalizedQuery = query.toLowerCase().trim();
	const cacheKey = `search_channel_${channelId}_${normalizedQuery}`;
	
	try {
		
		const url = `${apiUrl}search?part=snippet&q=${query}&channelId=${channelId}&key=${apiKey}`;
		const data = await fetchWithCache(url, cacheKey);
		
		const results = data.items.map((element: any) => new Result(element));
		
		return results;
	} catch (error) {
		console.error(`Error al buscar '${query}' en el canal ${channelId}:`, error);
		throw new Error("Error al buscar vídeos.");
	}
}