import { iso8601ToHumanTime } from "../utils/time";
import { Video } from "./video";
import { Playlist } from "./playlist";

export class Result{
	type: string;
	element: any;

	// constructor(searchItem: any) {

	// 	console.log("SEARCHITEM", searchItem);

	// 	this.type = searchItem.id.kind;

	// 	switch (searchItem.id.kind) {
	// 		case "youtube#video":
	// 			this.type = "video";
	// 			this.element = new Video(searchItem);
	// 			this.element.id = searchItem.id.videoId;
	// 			break;
	// 		case "youtube#playlist":
	// 			this.type = "playlist";
	// 			this.element = new Playlist(searchItem);
	// 			this.element.id = searchItem.id.playlistId;
	// 			break;
	// 	}

	// }

	constructor(type: string, element: any) {
		this.type = type;
		this.element = element; // YA es un elemento Video o Playlist
	}

}
