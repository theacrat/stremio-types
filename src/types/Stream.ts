import type { ArchiveUrl } from "./ArchiveUrl";
import type { StreamBehaviorHints } from "./StreamBehaviorHints";
import type { Subtitles } from "./Subtitles";

export type Stream = {
	name?: string;
	description?: string;
	thumbnail?: string;
	subtitles?: Array<Subtitles>;
	behaviorHints?: StreamBehaviorHints;
} & (
	| { url: string }
	| { ytId: string }
	| {
			rarUrls: Array<ArchiveUrl>;
			fileIdx?: number;
			fileMustInclude?: Array<string>;
	  }
	| {
			zipUrls: Array<ArchiveUrl>;
			fileIdx?: number;
			fileMustInclude?: Array<string>;
	  }
	| {
			"7zipUrls": Array<ArchiveUrl>;
			fileIdx?: number;
			fileMustInclude?: Array<string>;
	  }
	| {
			tgzUrls: Array<ArchiveUrl>;
			fileIdx?: number;
			fileMustInclude?: Array<string>;
	  }
	| {
			tarUrls: Array<ArchiveUrl>;
			fileIdx?: number;
			fileMustInclude?: Array<string>;
	  }
	| { nzbUrl: string; servers?: Array<string> }
	| {
			infoHash: string;
			fileIdx?: number;
			announce?: Array<string>;
			fileMustInclude?: Array<string>;
	  }
	| { playerFrameUrl: string }
	| {
			externalUrl?: string;
			androidTvUrl?: string;
			tizenUrl?: string;
			webosUrl?: string;
	  }
);
