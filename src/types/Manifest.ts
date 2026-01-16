import type { ContentType } from "./ContentType";
import type { ManifestBehaviorHints } from "./ManifestBehaviorHints";
import type { ManifestCatalog } from "./ManifestCatalog";
import type { ManifestResource } from "./ManifestResource";

export type Manifest = {
	id: string;
	version: string;
	name: string;
	contactEmail?: string;
	description?: string;
	logo?: string;
	background?: string;
	types: Array<ContentType>;
	resources: Array<ManifestResource>;
	idPrefixes?: Array<string>;
	catalogs?: Array<ManifestCatalog>;
	addonCatalogs?: Array<ManifestCatalog>;
	behaviorHints?: ManifestBehaviorHints;
};
