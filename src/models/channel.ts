export class Channel {
	id: string;
	title: string;
	name: string;
	description: string;
	thumbnail: string;
	subscribers: number;

	constructor(channelYoutube) {
		console.log("channelYoutube", channelYoutube);

		this.id = channelYoutube.id;
		this.title = channelYoutube.snippet.title;
		this.name = channelYoutube.snippet.customUrl;
		this.description = channelYoutube.snippet.description;
		this.thumbnail = channelYoutube.snippet.thumbnails.high.url;
		this.subscribers = channelYoutube.statistics.subscriberCount;
	}
}
