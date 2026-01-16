export const ContentTypes = {
	ALL: "all",
	MOVIE: "movie",
	SERIES: "series",
	CHANNEL: "channel",
	TV: "tv",
	OTHER: "other",
} as const;

export type ContentType = (typeof ContentTypes)[keyof typeof ContentTypes];

export const isContentType = (val: string): val is ContentType =>
	Array.prototype.includes.call(Object.values(ContentTypes), val);
