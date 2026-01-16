import type { ContentType } from "./ContentType";
import type { ResourceType } from "./ResourceType";

export type ManifestResource =
	| ResourceType
	| {
			name: ResourceType;
			types?: Array<ContentType>;
			idPrefixes?: Array<string>;
	  };
