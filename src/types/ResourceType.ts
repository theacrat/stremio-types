export const ResourceTypes = {
	CATALOG: "catalog",
	META: "meta",
	STREAM: "stream",
	SUBTITLES: "subtitles",
	ADDON_CATALOG: "addon_catalog",
} as const;

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes];

export const isResourceType = (val: string): val is ResourceType =>
	Array.prototype.includes.call(Object.values(ResourceTypes), val);
