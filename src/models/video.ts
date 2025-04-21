export class Video {
	id: string;
	title: string;
	thumbnail: string;
	channelId: string;

	constructor(videoYoutube) {
		this.id = videoYoutube.contentDetails.videoId;
		this.title = videoYoutube.snippet.title;
		this.thumbnail =
			videoYoutube.snippet.thumbnails?.medium?.url ||
			videoYoutube.snippet.thumbnails?.default?.url;
		this.channelId = videoYoutube.snippet.channelId;
	}
}
