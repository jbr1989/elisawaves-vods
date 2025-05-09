import { iso8601ToHumanTime } from "@/utils/time";

export class Video {
	id: string;
	title: string;
	descr: string;
	thumbnail: string;
	channelId: string;
	channelTitle: string;

	duration: string;

	constructor(videoYoutube) {
		this.id = videoYoutube.id;
		this.title = videoYoutube.snippet.title;
		this.descr = videoYoutube.snippet.description;
		this.thumbnail =
			videoYoutube.snippet.thumbnails?.medium?.url ||
			videoYoutube.snippet.thumbnails?.default?.url;
		this.channelId = videoYoutube.snippet.channelId;
		this.channelTitle = videoYoutube.snippet.channelTitle;
		this.duration = iso8601ToHumanTime(videoYoutube.contentDetails.duration);
	}

}
