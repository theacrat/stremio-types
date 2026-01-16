export const ContentTypes = {
	ALL: "all",
	CHANNEL: "channel",
	MOVIE: "movie",
	OTHER: "other",
	SERIES: "series",
	TV: "tv",
} as const;

export type ContentType = (typeof ContentTypes)[keyof typeof ContentTypes];

export const isContentType = (val: string): val is ContentType =>
	Array.prototype.includes.call(Object.values(ContentTypes), val);
