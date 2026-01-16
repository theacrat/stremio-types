import type { Stream } from "./Stream";

export type Video = {
	id: string;
	title?: string;
	released?: string;
	overview?: string;
	thumbnail?: string;
	streams?: Array<Stream>;
	trailerStreams?: Array<Stream>;
	season: number;
	episode: number;
};
