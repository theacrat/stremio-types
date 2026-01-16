import { $, Glob } from "bun";
import { basename, dirname, resolve } from "path";

const SCRIPT_DIR = dirname(Bun.main);
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const CORE_DIR = resolve(PROJECT_ROOT, "stremio-core");
const BINDINGS_DIR = resolve(CORE_DIR, "bindings");
const TARGET_DIR = resolve(PROJECT_ROOT, "src");
const TYPES_DIR = resolve(TARGET_DIR, "types");

async function processFile(
	filePath: string,
	fileName: string,
): Promise<string | null> {
	const originalContent = await Bun.file(filePath).text();
	let content: string = originalContent;

	const lines: string[] = content.split(/\r?\n/);
	const firstLine: string = lines[0]?.trim() || "";
	if (firstLine.startsWith("//") || firstLine.startsWith("/*")) {
		lines.shift();
		if (lines[0]?.trim() === "") {
			lines.shift();
		}
	}
	content = lines.join("\n").replace(/\/\*\*[\s\S]*?\*\/\s*\n?/g, "");

	const typeRegex: RegExp = /export type (\w+)\s*=\s*(?:\|\s*)?([\s\S]*?);/g;
	content = content.replace(
		typeRegex,
		(fullMatch: string, typeName: string, body: string) => {
			const isObject = body.includes("{") || body.includes(":");
			const hasQuotes = body.includes('"') || body.includes("'");
			if (isObject || !hasQuotes) {
				return fullMatch;
			}

			const valuesArray = body
				.split("|")
				.map((v) => v.replace(/["'\r\n]/g, "").trim())
				.filter((v) => v.length > 0 && !v.includes(" ") && !v.includes(";"));

			if (!valuesArray.length) {
				return fullMatch;
			}

			const constName = `${typeName}s`;
			const objectEntries = valuesArray
				.map((v) => `  ${v.toUpperCase()}: "${v}"`)
				.join(",\n");

			return `export const ${constName} = {
${objectEntries},
} as const;

export type ${typeName} = (typeof ${constName})[keyof typeof ${constName}];

export const is${typeName} = (val: string): val is ${typeName} =>
  Array.prototype.includes.call(Object.values(${constName}), val);`;
		},
	);

	const finalOutput = content.trim() + "\n";
	const targetPath = resolve(TYPES_DIR, fileName);

	await Bun.write(targetPath, finalOutput);

	return basename(fileName, ".ts");
}

const coreExists =
	(await $`test -d ${CORE_DIR}/.git`.quiet().nothrow()).exitCode === 0;

if (!coreExists) {
	console.error("stremio-core not found. Run `bun run setup` first.");
	process.exit(1);
}

await $`rm -rf ${BINDINGS_DIR}`;
await $`cd ${CORE_DIR} && cargo test export_bindings`;

const bindingsExist =
	(await $`test -d ${BINDINGS_DIR}`.quiet().nothrow()).exitCode === 0;

if (bindingsExist) {
	await $`rm -rf ${TYPES_DIR}`;
	await $`mkdir -p ${TYPES_DIR}`;

	const glob = new Glob("*.ts");
	const files = await Array.fromAsync(glob.scan(BINDINGS_DIR));

	const exportNames = await files
		.filter((file) => file !== "index.ts")
		.reduce<Promise<string[]>>(async (accPromise, file) => {
			const acc = await accPromise;
			const name = await processFile(resolve(BINDINGS_DIR, file), file);
			return name ? [...acc, name] : acc;
		}, Promise.resolve([]));

	const indexContent = exportNames
		.sort()
		.map((name) => `export * from './types/${name}';`)
		.join("\n");

	await Bun.write(resolve(TARGET_DIR, "index.ts"), indexContent);
	console.log(`Wrote bindings into ${TYPES_DIR} and updated index.ts`);
} else {
	console.error("Couldn't generate bindings");
}
