import { ElementYoutube } from "./ElementYoutube";

export class Playlist extends ElementYoutube {

	numVideos: number;
	description: string;
	videosId: string[] = [];

	constructor(playlistYoutube: any) {
		super(playlistYoutube);

		this.thumbnail = playlistYoutube.snippet.thumbnails?.medium?.url || playlistYoutube.snippet.thumbnails?.default?.url;

		this.description = playlistYoutube.snippet?.description || "";
		this.numVideos = playlistYoutube.contentDetails?.itemCount || 0;
	}
}
