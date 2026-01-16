export const ExtraTypes = {
	SEARCH: "search",
	GENRE: "genre",
	SKIP: "skip",
	LASTVIDEOSIDS: "lastVideosIds",
	CALENDARVIDEOSIDS: "calendarVideosIds",
} as const;

export type ExtraType = (typeof ExtraTypes)[keyof typeof ExtraTypes];

export const isExtraType = (val: string): val is ExtraType =>
	Array.prototype.includes.call(Object.values(ExtraTypes), val);
