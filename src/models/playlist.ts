export class Playlist {
	id: string;
	title: string;
	image: string;

	constructor(playlistYoutube) {
		this.id = playlistYoutube.id;
		this.title = playlistYoutube.snippet.title;
		this.image = playlistYoutube.snippet.thumbnails.medium.url;
	}
}
