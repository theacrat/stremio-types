export const PosterShapes = {
	SQUARE: "square",
	LANDSCAPE: "landscape",
	POSTER: "poster",
} as const;

export type PosterShape = (typeof PosterShapes)[keyof typeof PosterShapes];

export const isPosterShape = (val: string): val is PosterShape =>
	Array.prototype.includes.call(Object.values(PosterShapes), val);
