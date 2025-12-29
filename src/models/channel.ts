export class Channel {
	id: string;
	title: string;
	name: string;
	description: string;
	thumbnail: string;
	subscribers: number;

	uploadsPlaylistId?: string;

	constructor(channelYoutube: {
		id: string; 
		snippet: { title: string; customUrl: string; description: string; thumbnails: { high: { url: string; }; }; }; 
		statistics: { subscriberCount: number; }; 
		contentDetails: any;
	}) {
		// console.log("channelYoutube", channelYoutube);

		this.id = channelYoutube.id;
		this.title = channelYoutube.snippet.title;
		this.name = channelYoutube.snippet.customUrl;
		this.description = channelYoutube.snippet.description;
		this.thumbnail = channelYoutube.snippet.thumbnails.high.url;
		this.subscribers = channelYoutube.statistics.subscriberCount;
		this.uploadsPlaylistId = channelYoutube.contentDetails?.relatedPlaylists?.uploads;
	}
}
