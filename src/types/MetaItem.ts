import type { Link } from "./Link";
import type { MetaItemBehaviorHints } from "./MetaItemBehaviorHints";
import type { PosterShape } from "./PosterShape";
import type { Stream } from "./Stream";
import type { Trailer } from "./Trailer";
import type { Video } from "./Video";

export type MetaItem = {
	videos?: Array<Video>;
	id: string;
	type: string;
	name?: string;
	poster?: string | null;
	background?: string | null;
	logo?: string | null;
	description?: string;
	releaseInfo?: string;
	runtime?: string;
	released?: string;
	posterShape?: PosterShape;
	imdbRating?: string;
	genres?: Array<string>;
	links?: Array<Link>;
	trailers?: Array<Trailer>;
	trailerStreams?: Array<Stream>;
	behaviorHints?: MetaItemBehaviorHints;
};
