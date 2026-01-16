import { $ } from "bun";
import { dirname, resolve } from "path";

const SCRIPT_DIR = dirname(Bun.main);
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const CORE_DIR = resolve(PROJECT_ROOT, "stremio-core");
const PATCHES_DIR = resolve(PROJECT_ROOT, "patches");
const TAG_PREFIX = "stremio-core-web-v";

const coreExists =
	(await $`test -d ${CORE_DIR}/.git`.quiet().nothrow()).exitCode === 0;

if (!coreExists) {
	console.error("stremio-core not found. Run `bun run setup` first.");
	process.exit(1);
}

const tagResult = await $`cd ${CORE_DIR} && git describe --tags --abbrev=0`
	.quiet()
	.nothrow();

if (tagResult.exitCode !== 0) {
	console.error("Could not determine version from stremio-core tag.");
	process.exit(1);
}

const tag = tagResult.text().trim();
const baseVersion = tag.replace(TAG_PREFIX, "");
const patchFile = `${PATCHES_DIR}/${baseVersion}.patch`;

const packageJsonPath = resolve(PROJECT_ROOT, "package.json");
const packageJson = await Bun.file(packageJsonPath).json();
const currentVersion: string = packageJson.version;

if (currentVersion !== baseVersion) {
	packageJson.version = baseVersion;
	await Bun.write(
		packageJsonPath,
		JSON.stringify(packageJson, null, "\t") + "\n",
	);
	console.log(
		`Updated package.json version: ${currentVersion} -> ${baseVersion}`,
	);
}

await $`mkdir -p ${PATCHES_DIR}`;

const diff = await $`cd ${CORE_DIR} && git diff HEAD -- . ':!Cargo.lock'`
	.quiet()
	.text();

if (!diff.trim()) {
	console.log("No changes to patch.");
	process.exit(0);
}

await Bun.write(patchFile, diff);
console.log(`Patch saved to ${patchFile}`);
