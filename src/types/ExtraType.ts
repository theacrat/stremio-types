export const ExtraTypes = {
	CALENDARVIDEOSIDS: "calendarVideosIds",
	GENRE: "genre",
	LASTVIDEOSIDS: "lastVideosIds",
	SEARCH: "search",
	SKIP: "skip",
} as const;

export type ExtraType = (typeof ExtraTypes)[keyof typeof ExtraTypes];

export const isExtraType = (val: string): val is ExtraType =>
	Array.prototype.includes.call(Object.values(ExtraTypes), val);
