import type { StreamProxyHeaders } from "./StreamProxyHeaders";

export type StreamBehaviorHints = {
	notWebReady?: boolean;
	bingeGroup?: string;
	countryWhitelist?: Array<string>;
	proxyHeaders?: StreamProxyHeaders;
	filename?: string;
	videoHash?: string;
	videoSize?: bigint;
};
