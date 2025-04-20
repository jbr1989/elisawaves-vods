// src/lib/youtube.ts
const apiKey = import.meta.env.YOUTUBE_API_KEY;
// const channelId = import.meta.env.YOUTUBE_CHANNEL_ID;

export const channels = {
	UCmjo9V6ptM_Cdx67X5UXJEw: "Elisa Waves",
	UCsLebFG6jRTC0KUkN_bLcjw: "Elisa Motion",
	"UCskFPl21j0IsryvBsq-EbDw": "Elisa Waves TV",
};

export async function getChannel(channelId: string) {
	const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener la información del canal.");

	const data = await res.json();

	return data.items[0];
}

export async function getChannels() {
	const channelsId = Object.keys(channels);

	const res = await fetch(
		`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelsId.join(",")}&key=${import.meta.env.YOUTUBE_API_KEY}`,
	);

	const data = await res.json();

	const channelInfo = data.items.map((channel) => ({
		id: channel.id,
		title: channel.snippet.title,
		description: channel.snippet.description,
		thumbnail: channel.snippet.thumbnails.high.url,
		subscribers: channel.statistics.subscriberCount,
	}));

	console.log("CHANNELS", channelInfo);

	return channelInfo;
}

export async function getAllPlaylists() {
	const playlists = [];

	for (const channelId in channels) {
		playlists.push(...(await getPlaylists(channelId)));
	}

	return playlists;
}

export async function getPlaylists(channelId: string) {
	const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=25&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener listas de reproducción.");

	const data = await res.json();
	return data.items;
}

export async function getPlaylistVideos(playlistId: string) {
	const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error("Error al obtener vídeos de la playlist.");

	const data = await res.json();
	return data.items;
}
