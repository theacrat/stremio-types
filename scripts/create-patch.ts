import { $ } from "bun";

const CORE_DIR = "./stremio-core";
const PATCHES_DIR = "./patches";

const coreExists =
	(await $`test -d ${CORE_DIR}/.git`.quiet().nothrow()).exitCode === 0;

if (!coreExists) {
	console.error("stremio-core not found. Run `bun run setup` first.");
	process.exit(1);
}

const packageJson = await Bun.file("./package.json").json();
const fullVersion: string = packageJson.version;
const baseVersion = fullVersion.replace(/-\d+$/, "");
const patchFile = `${PATCHES_DIR}/${baseVersion}.patch`;

await $`mkdir -p ${PATCHES_DIR}`;

const diff = await $`cd ${CORE_DIR} && git diff`.quiet().text();

if (!diff.trim()) {
	console.log("No changes to patch.");
	process.exit(0);
}

await Bun.write(patchFile, diff);
console.log(`Patch saved to ${patchFile}`);
