import { $ } from "bun";
import * as path from "path";

const REPO_URL = "https://github.com/Stremio/stremio-core";
const CLONE_DIR = "./stremio-core";
const TAG_PREFIX = "stremio-core-web-v";

const useLatest = process.argv.includes("--latest");

const packageJson = await Bun.file("./package.json").json();
const fullVersion: string = packageJson.version;
const baseVersion = fullVersion.replace(/-\d+$/, "");
const patchFile = path.resolve(`./patches/${baseVersion}.patch`);

const repoExists =
	(await $`test -d ${CLONE_DIR}/.git`.quiet().nothrow()).exitCode === 0;

if (repoExists) {
	console.log("Repository already exists, fetching and resetting...");
	await $`cd ${CLONE_DIR} && git fetch --tags`;
} else {
	console.log("Cloning repository with --filter=blob:none...");
	await $`git clone --filter=blob:none ${REPO_URL} ${CLONE_DIR}`;
}

let tag: string;

if (useLatest) {
	const result =
		await $`cd ${CLONE_DIR} && git tag -l '${TAG_PREFIX}*' --sort=-v:refname | head -n 1`
			.quiet()
			.text();
	tag = result.trim();

	if (!tag) {
		console.error(`No tags found matching ${TAG_PREFIX}*`);
		process.exit(1);
	}

	console.log(`Latest tag: ${tag}`);
} else {
	tag = `${TAG_PREFIX}${baseVersion}`;

	const patchExists = await Bun.file(patchFile).exists();
	if (!patchExists) {
		console.error(`Patch file not found: ${patchFile}`);
		process.exit(1);
	}
}

console.log(`Version: ${fullVersion}`);
console.log(`Base version: ${baseVersion}`);
console.log(`Tag: ${tag}`);
console.log(`Patch file: ${patchFile}`);

console.log(`Resetting to tag ${tag}...`);
await $`cd ${CLONE_DIR} && git reset --hard ${tag}`;

console.log(`Applying patch ${patchFile}...`);
const applyResult = await $`cd ${CLONE_DIR} && git apply ${patchFile}`
	.quiet()
	.nothrow();

if (applyResult.exitCode !== 0) {
	console.warn("\n⚠️  Patch could not be applied cleanly.");
	console.warn("Attempting three-way merge...\n");

	const threeWayResult =
		await $`cd ${CLONE_DIR} && git apply --3way ${patchFile}`.nothrow();

	if (threeWayResult.exitCode !== 0) {
		console.error("\n❌ Patch application failed with conflicts.");
		console.error("Please resolve conflicts manually in ./stremio-core");
		process.exit(1);
	}

	console.warn("\n⚠️  Patch applied with three-way merge.");
	console.warn("Check for any conflict markers in the code.");
} else {
	console.log("Patch applied successfully!");
}

console.log("Setup complete!");
