// This was made entirely with Claude Code. Needs to be cleaned up later.
import { $, Glob } from "bun";
import { dirname, resolve } from "path";

// Resolve paths relative to this script's location
const SCRIPT_DIR = dirname(Bun.main);
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const CORE_DIR = resolve(PROJECT_ROOT, "stremio-core");
const CONSTANTS_PATH = resolve(CORE_DIR, "src/constants.rs");
const LEGACY_TRANSPORT_PATH = resolve(
	CORE_DIR,
	"src/addon_transport/http_transport/legacy/mod.rs",
);

type Match = {
	file: string;
	line: number;
	content: string;
	context: string;
};

type FoundValue = {
	value: string;
	matches: Match[];
};

// Values that are serde test artifacts, not real ExtraProp names
const SERDE_TEST_ARTIFACTS = new Set(["ExtraProp", "OptionsLimit", "name"]);

// ============================================================================
// Utility Functions
// ============================================================================

function toPascalCase(str: string): string {
	return str
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

function createValueMap(): Map<string, FoundValue> {
	return new Map();
}

function addMatch(
	map: Map<string, FoundValue>,
	value: string,
	match: Match,
): void {
	const existing = map.get(value);
	if (existing) {
		existing.matches.push(match);
	} else {
		map.set(value, { value, matches: [match] });
	}
}

async function updateEnum(enumName: string, values: string[]): Promise<void> {
	const content = await Bun.file(CONSTANTS_PATH).text();

	const enumRegex = new RegExp(`(pub enum ${enumName}\\s*\\{)[^}]*(})`, "s");
	const match = enumRegex.exec(content);

	if (!match) {
		console.error(`Could not find ${enumName} enum in constants.rs`);
		return;
	}

	const variants = values.map((v) => `    ${toPascalCase(v)},`).join("\n");
	const newEnumContent = `${match[1]}\n${variants}\n${match[2]}`;
	const newContent = content.replace(enumRegex, newEnumContent);

	await Bun.write(CONSTANTS_PATH, newContent);
	console.log(`  Updated ${enumName} enum with ${values.length} variants`);
}

function printResults(
	title: string,
	values: FoundValue[],
	categoryFn?: (v: FoundValue) => { category: string; isMain: boolean },
): void {
	console.log();
	console.log("═".repeat(70));
	console.log(` ${title}`);
	console.log("═".repeat(70));
	console.log();

	values.forEach(({ value, matches }) => {
		const contexts = [...new Set(matches.map((m) => m.context))];

		console.log(`  📌 "${value}"`);
		console.log(`     Contexts: ${contexts.join(", ")}`);
		console.log(`     Occurrences: ${matches.length}`);

		// Show unique file locations (deduplicated)
		const uniqueLocations = matches.reduce((acc, match) => {
			const key = `${match.file}:${match.line}`;
			if (!acc.has(key)) acc.set(key, match);
			return acc;
		}, new Map<string, Match>());

		uniqueLocations.forEach((match, location) => {
			const maxLen = 60;
			const truncated =
				match.content.length > maxLen
					? match.content.substring(0, maxLen) + "..."
					: match.content;
			console.log(`     ${location}`);
			console.log(`        ${truncated}`);
		});
		console.log();
	});

	if (categoryFn) {
		const { main, other } = values.reduce(
			(acc, v) => {
				const { isMain } = categoryFn(v);
				if (isMain) {
					acc.main.push(v.value);
				} else {
					acc.other.push(v.value);
				}
				return acc;
			},
			{ main: [] as string[], other: [] as string[] },
		);

		if (main.length > 0) {
			console.log("  Primary values:");
			main.forEach((value) => console.log(`    • "${value}"`));
			console.log();
		}

		if (other.length > 0) {
			console.log("  Additional values:");
			other.forEach((value) => console.log(`    • "${value}"`));
			console.log();
		}
	}

	console.log(`  Total: ${values.length} unique values`);
}

// ============================================================================
// Content Types (meta item type field)
// ============================================================================

async function searchContentTypes(
	filePath: string,
	foundValues: Map<string, FoundValue>,
): Promise<void> {
	const content = await Bun.file(filePath).text();
	const lines = content.split("\n");
	const relativePath = filePath.replace(process.cwd() + "/", "");
	const isTest = filePath.includes("unit_tests");

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
			return;
		}

		// Look for r#type assignments: r#type: "movie".to_owned()
		const typeAssignMatches = [
			...line.matchAll(
				/r#type:\s*"([^"]+)"(?:\.to_owned\(\)|\.into\(\)|\.to_string\(\))?/g,
			),
		];
		typeAssignMatches.forEach((match) => {
			const value = match[1];
			// Content types are always lowercase
			if (/^[a-z]+$/.test(value)) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: isTest ? "test" : "assignment",
				});
			}
		});

		// Look for r#type comparisons: r#type == "series" or r#type != "movie"
		const typeCompareMatches = [
			...line.matchAll(/r#type\s*[!=]=\s*"([^"]+)"/g),
		];
		typeCompareMatches.forEach((match) => {
			const value = match[1];
			if (/^[a-z]+$/.test(value)) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "comparison",
				});
			}
		});

		// Look for HashMap<&str, i32> entries with string-to-priority tuples
		// This catches content type priority definitions like ("movie", 4)
		const priorityTupleMatches = [
			...line.matchAll(/\("([a-z]+)",\s*(?:\d+|i32::MIN)\)/g),
		];
		priorityTupleMatches.forEach((match) => {
			addMatch(foundValues, match[1], {
				file: relativePath,
				line: lineNum,
				content: trimmed,
				context: "constant",
			});
		});
	});
}

async function findContentTypes(
	files: string[],
): Promise<{ values: FoundValue[] }> {
	const foundValues = createValueMap();

	await Promise.all(files.map((f) => searchContentTypes(f, foundValues)));

	const sortedValues = [...foundValues.entries()]
		.filter(([value, data]) => {
			// Must be lowercase (content types are always lowercase)
			if (!/^[a-z]+$/.test(value)) return false;
			// Must have non-test usage in r#type contexts or constant definitions
			const hasValidUsage = data.matches.some((m) => m.context !== "test");
			return hasValidUsage;
		})
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, v]) => v);

	return { values: sortedValues };
}

// ============================================================================
// Extra Types (ExtraProp.name values)
// ============================================================================

async function parseLegacyStreamProps(): Promise<Set<string>> {
	const content = await Bun.file(LEGACY_TRANSPORT_PATH).text();
	const legacyProps = new Set<string>();

	const importRegex = /use\s+crate::constants::\{[^}]*\}/gs;
	const importMatch = importRegex.exec(content);

	if (importMatch) {
		const propRegex = /(\w+_EXTRA_PROP)/g;
		let match;
		while ((match = propRegex.exec(importMatch[0])) !== null) {
			legacyProps.add(match[1]);
		}
	}

	return legacyProps;
}

async function parseExtraPropConstants(
	excludeProps: Set<string>,
): Promise<Record<string, string>> {
	const content = await Bun.file(CONSTANTS_PATH).text();
	const constants: Record<string, string> = {};

	// Match SEARCH_EXTRA_NAME style constants
	const strConstRegex =
		/pub\s+const\s+(\w+_EXTRA_NAME)\s*:\s*&str\s*=\s*"([^"]+)"/g;
	let match;
	while ((match = strConstRegex.exec(content)) !== null) {
		const [, constName, value] = match;
		if (!excludeProps.has(constName)) {
			constants[constName] = value;
		}
	}

	// Match Lazy<ExtraProp> definitions
	const lazyExtraPropRegex =
		/pub\s+static\s+(\w+_EXTRA_PROP)\s*:\s*Lazy<ExtraProp>\s*=\s*Lazy::new\(\|\|\s*ExtraProp\s*\{[^}]*name:\s*"([^"]+)"/gs;
	while ((match = lazyExtraPropRegex.exec(content)) !== null) {
		const [, constName, value] = match;
		if (!excludeProps.has(constName)) {
			constants[constName] = value;
		}
	}

	return constants;
}

async function searchExtraTypes(
	filePath: string,
	extraPropConstants: Record<string, string>,
	excludedValues: Set<string>,
	foundValues: Map<string, FoundValue>,
): Promise<void> {
	const content = await Bun.file(filePath).text();
	const lines = content.split("\n");
	const relativePath = filePath.replace(process.cwd() + "/", "");

	const state = { inExtraPropBlock: false, braceDepth: 0 };

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
			return;
		}

		if (/ExtraProp\s*\{/.test(line)) {
			state.inExtraPropBlock = true;
			state.braceDepth = 1;
		}

		if (state.inExtraPropBlock) {
			[...line].forEach((char) => {
				if (char === "{") state.braceDepth++;
				if (char === "}") state.braceDepth--;
			});
			if (state.braceDepth <= 0) {
				state.inExtraPropBlock = false;
			}

			const nameMatch = line.match(/name:\s*"([^"]+)"/);
			if (nameMatch) {
				const value = nameMatch[1];
				if (!excludedValues.has(value)) {
					addMatch(foundValues, value, {
						file: relativePath,
						line: lineNum,
						content: trimmed,
						context: filePath.includes("unit_tests") ? "test" : "assignment",
					});
				}
			}
		}

		Object.entries(extraPropConstants).forEach(([constName, value]) => {
			if (
				(line.includes("LazyLock<ExtraProp>") ||
					line.includes("Lazy<ExtraProp>")) &&
				line.includes(constName)
			) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "constant",
				});
			}

			if (
				constName.endsWith("_EXTRA_NAME") &&
				line.includes(constName) &&
				line.includes(`"${value}"`)
			) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "constant",
				});
			}

			if (
				line.includes(`${constName}.name`) &&
				!line.includes("LazyLock") &&
				!line.includes("Lazy<")
			) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "comparison",
				});
			}
		});

		const getExtraMatch = line.match(
			/get_extra(?:_first_value|_values?)?\s*\(\s*"([^"]+)"\s*\)/,
		);
		if (getExtraMatch) {
			const value = getExtraMatch[1];
			if (!excludedValues.has(value)) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "legacy",
				});
			}
		}

		const extraNameMatch = line.match(/extra_name\s*[!=]=\s*"([^"]+)"/);
		if (extraNameMatch) {
			const value = extraNameMatch[1];
			if (!excludedValues.has(value)) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "comparison",
				});
			}
		}
	});
}

async function findExtraTypes(
	files: string[],
): Promise<{ values: FoundValue[]; constants: Record<string, string> }> {
	const foundValues = createValueMap();

	const legacyStreamProps = await parseLegacyStreamProps();
	const extraPropConstants = await parseExtraPropConstants(legacyStreamProps);

	// Build set of excluded values
	const constantsContent = await Bun.file(CONSTANTS_PATH).text();
	const excludedValues = [...legacyStreamProps].reduce((acc, propName) => {
		const valueMatch = constantsContent.match(
			new RegExp(`${propName}[^}]*name:\\s*"([^"]+)"`),
		);
		if (valueMatch) {
			acc.add(valueMatch[1]);
		}
		return acc;
	}, new Set<string>());

	await Promise.all(
		files.map((f) =>
			searchExtraTypes(f, extraPropConstants, excludedValues, foundValues),
		),
	);

	const sortedValues = [...foundValues.entries()]
		.filter(([value, data]) => {
			const isKnownConstant = Object.values(extraPropConstants).includes(value);
			const isSerdeArtifact = SERDE_TEST_ARTIFACTS.has(value);
			const hasNonTestUsage = data.matches.some(
				(m) => m.context !== "test" || !m.file.includes("serde"),
			);
			return isKnownConstant || (!isSerdeArtifact && hasNonTestUsage);
		})
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, v]) => v);

	return { values: sortedValues, constants: extraPropConstants };
}

// ============================================================================
// Resource Types (resource names)
// ============================================================================

async function parseResourceConstants(): Promise<Record<string, string>> {
	const content = await Bun.file(CONSTANTS_PATH).text();
	const constants: Record<string, string> = {};

	const constRegex =
		/pub\s+const\s+(\w+_RESOURCE_NAME)\s*:\s*&str\s*=\s*"([^"]+)"/g;
	let match;
	while ((match = constRegex.exec(content)) !== null) {
		const [, constName, value] = match;
		constants[constName] = value;
	}

	return constants;
}

async function searchResourceTypes(
	filePath: string,
	resourceConstants: Record<string, string>,
	foundValues: Map<string, FoundValue>,
): Promise<void> {
	const content = await Bun.file(filePath).text();
	const lines = content.split("\n");
	const relativePath = filePath.replace(process.cwd() + "/", "");

	lines.forEach((line, i) => {
		const lineNum = i + 1;
		const trimmed = line.trim();

		if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
			return;
		}

		Object.entries(resourceConstants).forEach(([constName, value]) => {
			if (
				line.includes(constName) &&
				line.includes(`"${value}"`) &&
				line.includes("pub const")
			) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "constant",
				});
			}

			if (
				line.includes(constName) &&
				!line.includes("pub const") &&
				!line.includes("use ")
			) {
				addMatch(foundValues, value, {
					file: relativePath,
					line: lineNum,
					content: trimmed,
					context: "comparison",
				});
			}
		});

		// Look for resource field assignments: resource: "catalog".to_owned()
		const resourceAssignMatches = [
			...line.matchAll(
				/resource:\s*"([a-z_]+)"(?:\.to_owned\(\)|\.into\(\)|\.to_string\(\))?/g,
			),
		];
		resourceAssignMatches.forEach((match) => {
			addMatch(foundValues, match[1], {
				file: relativePath,
				line: lineNum,
				content: trimmed,
				context: "assignment",
			});
		});

		const manifestResourceMatches = [
			...line.matchAll(/ManifestResource::Short\("([^"]+)"(?:\.into\(\))?\)/g),
		];
		manifestResourceMatches.forEach((match) => {
			addMatch(foundValues, match[1], {
				file: relativePath,
				line: lineNum,
				content: trimmed,
				context: "legacy",
			});
		});

		// Look for fn resource() -> &'static str on same line
		const traitResourceRegex =
			/fn\s+resource\(\)\s*->\s*&'static\s+str\s*\{\s*"([^"]+)"\s*\}/;
		const traitMatch = traitResourceRegex.exec(line);
		if (traitMatch) {
			addMatch(foundValues, traitMatch[1], {
				file: relativePath,
				line: lineNum,
				content: trimmed,
				context: "trait",
			});
		}

		// Look for standalone string literal returns (for multi-line fn resource())
		// Only match if the line is just a quoted string (return value)
		if (/^\s*"([a-z_]+)"\s*$/.test(trimmed)) {
			// Check if previous lines contain fn resource()
			const prevLines = lines.slice(Math.max(0, i - 3), i).join("\n");
			if (/fn\s+resource\(\)\s*->\s*&'static\s+str\s*\{/.test(prevLines)) {
				const valueMatch = trimmed.match(/"([a-z_]+)"/);
				if (valueMatch) {
					addMatch(foundValues, valueMatch[1], {
						file: relativePath,
						line: lineNum,
						content: trimmed,
						context: "trait",
					});
				}
			}
		}

		const pathResourceMatches = [
			...line.matchAll(/(?:path\.)?resource\s*[!=]=\s*"([^"]+)"/g),
		];
		pathResourceMatches.forEach((match) => {
			addMatch(foundValues, match[1], {
				file: relativePath,
				line: lineNum,
				content: trimmed,
				context: "comparison",
			});
		});
	});
}

async function findResourceTypes(
	files: string[],
): Promise<{ values: FoundValue[]; constants: Record<string, string> }> {
	const foundValues = createValueMap();
	const resourceConstants = await parseResourceConstants();

	await Promise.all(
		files.map((f) => searchResourceTypes(f, resourceConstants, foundValues)),
	);

	const sortedValues = [...foundValues.entries()]
		.filter(([value, data]) => {
			// Must be lowercase with optional underscores (resource names use snake_case)
			if (!/^[a-z_]+$/.test(value)) return false;
			// Exclude serde test artifacts (values that only appear in serde test files)
			const hasNonSerdeTestUsage = data.matches.some(
				(m) => !m.file.includes("serde"),
			);
			return hasNonSerdeTestUsage;
		})
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, v]) => v);

	return { values: sortedValues, constants: resourceConstants };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	const coreExists =
		(await $`test -d ${CORE_DIR}/.git`.quiet().nothrow()).exitCode === 0;

	if (!coreExists) {
		console.error("stremio-core not found. Run `bun run setup` first.");
		process.exit(1);
	}

	const glob = new Glob("**/*.rs");
	const files = (await Array.fromAsync(glob.scan(CORE_DIR))).map(
		(file) => `${CORE_DIR}/${file}`,
	);
	console.log(`Scanning ${files.length} Rust files in ${CORE_DIR}...\n`);

	// Find all types
	const [contentTypeResult, extraTypeResult, resourceTypeResult] =
		await Promise.all([
			findContentTypes(files),
			findExtraTypes(files),
			findResourceTypes(files),
		]);

	// Print results
	printResults(
		"CONTENT TYPES (meta item type field)",
		contentTypeResult.values,
	);

	printResults(
		"EXTRA TYPES (ExtraProp.name values)",
		extraTypeResult.values,
		(v) => ({
			category: Object.values(extraTypeResult.constants).includes(v.value)
				? "Constants"
				: "Legacy",
			isMain: Object.values(extraTypeResult.constants).includes(v.value),
		}),
	);

	printResults(
		"RESOURCE TYPES (resource names)",
		resourceTypeResult.values,
		(v) => ({
			category: Object.values(resourceTypeResult.constants).includes(v.value)
				? "Constants"
				: "Additional",
			isMain: Object.values(resourceTypeResult.constants).includes(v.value),
		}),
	);

	// JSON output
	console.log();
	console.log("═".repeat(70));
	console.log(" JSON OUTPUT");
	console.log("═".repeat(70));
	console.log();
	console.log(
		JSON.stringify(
			{
				contentTypes: contentTypeResult.values.map((v) => v.value),
				extraTypes: extraTypeResult.values.map((v) => v.value),
				resourceTypes: resourceTypeResult.values.map((v) => v.value),
			},
			null,
			2,
		),
	);

	// Update enums
	console.log();
	console.log("═".repeat(70));
	console.log(" UPDATING ENUMS IN constants.rs");
	console.log("═".repeat(70));
	console.log();

	await updateEnum(
		"ContentType",
		contentTypeResult.values.map((v) => v.value),
	);
	await updateEnum(
		"ExtraType",
		extraTypeResult.values.map((v) => v.value),
	);
	await updateEnum(
		"ResourceType",
		resourceTypeResult.values.map((v) => v.value),
	);
}

main().catch(console.error);
