// src/lib/youtube.ts
const apiKey = import.meta.env.YOUTUBE_API_KEY;
const channelId = import.meta.env.YOUTUBE_CHANNEL_ID;

export async function getPlaylists() {
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
