import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import packageJson from "eslint-plugin-package-json";
import { defineConfig } from "eslint/config";
import { fileURLToPath, URL } from "node:url";
import tseslint from "typescript-eslint";

export default defineConfig([
	includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
	js.configs.recommended,
	tseslint.configs.recommended,
	eslintConfigPrettier,
	packageJson.configs["recommended-publishable"],
	packageJson.configs.stylistic,
]);
