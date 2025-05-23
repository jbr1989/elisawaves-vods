import { iso8601ToHumanTime } from "@/utils/time";
import { ElementYoutube } from "./ElementYoutube";

export class Video extends ElementYoutube  {

	descr: string;
	duration: string;

	constructor(videoYoutube: { id: string; snippet: { title: string; description: string; thumbnails: { medium: { url: any; }; default: { url: any; }; }; channelId: string; channelTitle: string; }; contentDetails: { duration: any; } | undefined; }) {

		super(videoYoutube);

		this.thumbnail =
			videoYoutube.snippet.thumbnails?.medium?.url ||
			videoYoutube.snippet.thumbnails?.default?.url;


		this.descr = videoYoutube.snippet?.description || "";
		this.duration = iso8601ToHumanTime(videoYoutube.contentDetails?.duration || "PT0S");;
	}

}
