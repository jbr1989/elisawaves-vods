import { Channel } from "../models/channel";
import { Playlist } from "../models/playlist";
import { Video } from "../models/video";

// src/lib/youtube.ts
const apiUrl = "https://www.googleapis.com/youtube/v3/";
const apiKey = import.meta.env.YOUTUBE_API_KEY;
// const channelId = import.meta.env.YOUTUBE_CHANNEL_ID;

export const channelsIds = [
	{ name: "@elisawavesroleplay", id: "UCmjo9V6ptM_Cdx67X5UXJEw" },
	{ name: "@elisamotion", id: "UCsLebFG6jRTC0KUkN_bLcjw" },
	{ name: "@elisawavestv", id: "UCskFPl21j0IsryvBsq-EbDw" },
];

export async function getChannel({
	channelId = "",
	name = "",
}: { channelId?: string | undefined; name?: string | undefined } = {}) {
	if (channelId === "" && name !== "")
		channelId = channelsIds.find((channel) => channel.name === name)?.id || "";

	if (channelId === "") return null;

	const url = `${apiUrl}channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener la información del canal.");

	const data = await res.json();

	const channel = new Channel(data.items[0]);

	return channel;
}

export async function getChannels() {
	const channelsId = channelsIds.map((channel) => channel.id);

	const res = await fetch(
		`${apiUrl}channels?part=snippet,statistics&id=${channelsId.join(",")}&key=${apiKey}`,
	);

	const data = await res.json();

	const channels = data.items.map((channel) => new Channel(channel));

	console.log("CHANNELS", channels);

	return channels;
}

export async function getAllPlaylists() {
	const playlists = [];

	for (const channel of channelsIds) {
		playlists.push(...(await getPlaylists(channel.id)));
	}

	return playlists;
}

export async function getPlaylists(channelId: string) {
	const url = `${apiUrl}playlists?part=snippet&channelId=${channelId}&maxResults=25&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener listas de reproducción.");

	const data = await res.json();

	const playlists = data.items.map((playlist) => new Playlist(playlist));

	return playlists;
}

export async function getPlaylistVideos(playlistId: string) {
	const url = `${apiUrl}playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener vídeos de la playlist.");

	const data = await res.json();

	const videos = data.items.map((video) => new Video(video));

	return videos;
}
