import { ElementYoutube } from "./ElementYoutube";

export class Playlist extends ElementYoutube {

	numVideos: number;

	constructor(playlistYoutube: { id: string; snippet: { title: string; thumbnails: { medium: { url: string; }; }; channelId: string; channelTitle: string; }; contentDetails: { itemCount: number; }; }) {
		super(playlistYoutube);

		this.thumbnail = playlistYoutube.snippet.thumbnails.medium.url;

		this.numVideos = playlistYoutube.contentDetails?.itemCount || 0;
	}
}
