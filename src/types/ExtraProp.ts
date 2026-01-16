import type { ExtraType } from "./ExtraType";

export type ExtraProp = {
	name: ExtraType;
	isRequired?: boolean;
	options?: Array<string>;
	optionsLimit?: number;
};
