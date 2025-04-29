export class Video {
	id: string;
	title: string;
	descr: string;
	thumbnail: string;
	channelId: string;
	channelTitle: string;

	constructor(videoYoutube) {
		this.id = videoYoutube.contentDetails.videoId;
		this.title = videoYoutube.snippet.title;
		this.descr = videoYoutube.snippet.description;
		this.thumbnail =
			videoYoutube.snippet.thumbnails?.medium?.url ||
			videoYoutube.snippet.thumbnails?.default?.url;
		this.channelId = videoYoutube.snippet.channelId;
		this.channelTitle = videoYoutube.snippet.channelTitle;
	}
}
