import { iso8601ToHumanTime } from "@/utils/time";
import { Video } from "./video";

export class searchVideo extends Video {
	playListId: string;

	constructor(videoYoutube) {
		super(videoYoutube);

		console.log("ID", videoYoutube.id);

		this.id = videoYoutube.id.videoId;
		this.channelId = videoYoutube.id.channelId;
		this.playListId = videoYoutube.id.playlistId;
	}

}
