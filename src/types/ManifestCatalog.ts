import type { ContentType } from "./ContentType";
import type { ExtraProp } from "./ExtraProp";
import type { ExtraType } from "./ExtraType";

export type ManifestCatalog = {
	id: string;
	type: ContentType;
	name?: string;
} & (
	| { extra: Array<ExtraProp> }
	| {
			extraRequired: Array<ExtraType>;
			extraSupported: Array<ExtraType>;
	  }
);
