export const ResourceTypes = {
	ADDON_CATALOG: "addon_catalog",
	CATALOG: "catalog",
	META: "meta",
	STREAM: "stream",
	SUBTITLES: "subtitles",
} as const;

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes];

export const isResourceType = (val: string): val is ResourceType =>
	Array.prototype.includes.call(Object.values(ResourceTypes), val);
