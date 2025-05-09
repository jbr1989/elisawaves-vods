export class Playlist {
	id: string;
	title: string;
	image: string;

	channelId: string;
	channelTitle: string;

	numVideos: number;

	constructor(playlistYoutube) {
		this.id = playlistYoutube.id;
		this.title = playlistYoutube.snippet.title;
		this.image = playlistYoutube.snippet.thumbnails.medium.url;

		this.channelId = playlistYoutube.snippet.channelId;
		this.channelTitle = playlistYoutube.snippet.channelTitle;

		this.numVideos = playlistYoutube.contentDetails.itemCount;
	}
}
