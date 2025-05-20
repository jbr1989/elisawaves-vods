export class ElementYoutube {
	id: string;
	title: string;
	thumbnail: string;

	channelId: string;
	channelTitle: string;

	constructor(elementYoutube: any) {
		this.id = elementYoutube.id;
		this.title = elementYoutube.snippet.title;
		this.thumbnail = elementYoutube.snippet.thumbnails.medium.url;

		this.channelId = elementYoutube.snippet.channelId;
		this.channelTitle = elementYoutube.snippet.channelTitle;
	}

}