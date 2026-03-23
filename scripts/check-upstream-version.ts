import { appendFile } from "node:fs/promises";
import { dirname, resolve } from "path";

const SCRIPT_DIR = dirname(Bun.main);
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const PACKAGE_JSON_PATH = resolve(PROJECT_ROOT, "package.json");
const REPO_URL = "https://github.com/Stremio/stremio-core";
const TAG_PREFIX = "stremio-core-web-v";

type OutputValue = string | boolean;

function normalizeVersion(version: string): string {
	return version.replace(/-\d+$/, "");
}

function compareVersions(a: string, b: string): number {
	const aParts = a.split(".").map((part) => Number.parseInt(part, 10));
	const bParts = b.split(".").map((part) => Number.parseInt(part, 10));
	const length = Math.max(aParts.length, bParts.length);

	for (let index = 0; index < length; index += 1) {
		const aPart = aParts[index] ?? 0;
		const bPart = bParts[index] ?? 0;

		if (aPart !== bPart) {
			return aPart - bPart;
		}
	}

	return 0;
}

async function setOutput(name: string, value: OutputValue): Promise<void> {
	const serialized = String(value);
	console.log(`${name}=${serialized}`);

	const githubOutput = process.env.GITHUB_OUTPUT;
	if (!githubOutput) {
		return;
	}

	try {
		await appendFile(githubOutput, `${name}=${serialized}\n`);
	} catch (error) {
		console.error(`Failed to write ${name} to GITHUB_OUTPUT`, error);
		process.exitCode = 1;
	}
}

const packageJson = await Bun.file(PACKAGE_JSON_PATH).json();
const currentVersion = normalizeVersion(String(packageJson.version));

const refPattern = `refs/tags/${TAG_PREFIX}*`;
const lsRemote = Bun.spawn(
	["git", "ls-remote", "--tags", REPO_URL, refPattern],
	{
		stdout: "pipe",
		stderr: "pipe",
	},
);

const [refs, stderr, exitCode] = await Promise.all([
	new Response(lsRemote.stdout).text(),
	new Response(lsRemote.stderr).text(),
	lsRemote.exited,
]);

if (exitCode !== 0) {
	console.error(stderr || "git ls-remote failed");
	process.exit(exitCode);
}

const versions = refs
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean)
	.map((line) => line.split(/\s+/)[1] ?? "")
	.filter((ref) => ref.startsWith("refs/tags/") && !ref.endsWith("^{}"))
	.map((ref) => ref.replace(`refs/tags/${TAG_PREFIX}`, ""))
	.filter(Boolean)
	.sort(compareVersions);

const latestVersion = versions.at(-1);

if (!latestVersion) {
	console.error(`No upstream tags found for ${TAG_PREFIX}`);
	process.exit(1);
}

const shouldUpdate = compareVersions(latestVersion, currentVersion) > 0;

await setOutput("current_version", currentVersion);
await setOutput("latest_version", latestVersion);
await setOutput("latest_tag", `${TAG_PREFIX}${latestVersion}`);
await setOutput("should_update", shouldUpdate);
