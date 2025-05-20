import { Channel } from "../models/channel";
import { Playlist } from "../models/playlist";
import { Video } from "../models/video";

import { channelsConst } from "../constants/channels";
import { Result } from "@/models/result";

// src/lib/youtube.ts
const apiUrl = "https://www.googleapis.com/youtube/v3/";
const apiKey = import.meta.env.YOUTUBE_API_KEY;
// const channelId = import.meta.env.YOUTUBE_CHANNEL_ID;

export async function getChannel({
	channelId = "",
	name = "",
}: { channelId?: string | undefined; name?: string | undefined } = {})  : Promise<Channel | null> {
	if (channelId === "" && name !== "")
		channelId = channelsConst.find((channel) => channel.tag === name)?.id || "";

	if (channelId === "") return null;

	const url = `${apiUrl}channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener la información del canal.");

	const data = await res.json();

	const channel = new Channel(data.items[0]);

	return channel;
}

export async function getChannels() : Promise<Channel[]> {
	const channelsId = channelsConst.map((channel) => channel.id);

	const res = await fetch(
		`${apiUrl}channels?part=snippet,statistics&id=${channelsId.join(",")}&key=${apiKey}`,
	);

	const data = await res.json();

	const channels = data.items.map((channel: any) => new Channel(channel));

	// console.log("CHANNELS", channels);

	return channels;
}

export async function getAllPlaylists() : Promise<Playlist[]> {
	const playlists = [];

	for (const channel of channelsConst) {
		playlists.push(...(await getPlaylists(channel.id)));
	}

	return playlists;
}

export async function getPlaylists(channelId: string) : Promise<Playlist[]> {
	const url = `${apiUrl}playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=25&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener listas de reproducción.");

	const data = await res.json();

	const playlists = data.items.map((playlist: any) => new Playlist(playlist));

	return playlists;
}

export async function getPlaylistVideos(playlistId: string): Promise<Video[]> {
	const url = `${apiUrl}playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener vídeos de la playlist.");

	const data = await res.json();

	//console.log("DATA", data); // TODO: eliminar este console.log una vez que se tenga el vide

	const ids = data.items.map((item: any) => item.contentDetails.videoId);
	//console.log("IDS", ids);

	return await getVideos(ids);
}

export async function getVideos(ids: string[]): Promise<Video[]> {
	const url = `${apiUrl}videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${apiKey}`;
	//console.log("URL", url);

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener el vídeo.");

	const data = await res.json();

	const videos = data.items.map((video: any) => new Video(video));

	//console.log("DATA", data); // TODO: eliminar este console.log una vez que se tenga el vide
	//console.log("CONTENTDETAILS", data.items[0].contentDetails); // TODO: eliminar este console.log una vez que se tenga el vide

	return videos;
}

export async function find(query: string): Promise<Result[]>  {

	const channels = channelsConst.map((channel) => channel.id);
	console.log("CHANNELS", channels);

	const results = [];

	for (const channel of channels) {
		results.push(...(await findInChannel(query, channel)));
	}

	return results;

}

export async function findInChannel(query: string, channelId: string): Promise<Result[]> {
	const url = `${apiUrl}search?part=snippet&q=${query}&channelId=${channelId}&key=${apiKey}`;
	//console.log("URL", url); // TODO: eliminar este console.log una vez que se tenga el vid

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al buscar vídeos.");

	const data = await res.json();

	const results = data.items.map((element: any) => new Result(element));

	console.log("RESULTS", results); // TODO: eliminar este console.log una vez que se tenga el vid

	return results;
}