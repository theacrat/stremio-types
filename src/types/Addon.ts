import type { AddonFlags } from "./AddonFlags";
import type { Manifest } from "./Manifest";

export type Addon = {
	manifest: Manifest;
	transportUrl: string;
	flags?: AddonFlags;
};
