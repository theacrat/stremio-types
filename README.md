# stremio-types

TypeScript definitions for the stremio-core Rust project.

Auto-generated using ts-rs and various scripts.

## Installation

Using Bun:

```bash
bun add stremio-types
```

Using npm:

```bash
npm i stremio-types
```

## Usage

### Basic Types

```ts
import type { MetaItem } from "stremio-types";

const item: MetaItem = {
	// Full autocompletion and type safety
};
```

### Type Guards and Constants

Every string union from the Rust core is transformed into a const array with an associated Type Guard.

```ts
import { ExtraTypes, isExtraType } from "stremio-types";

// Access the list of valid values
console.log(ExtraTypes);

// Validate an unknown string
const input = "search";
if (isExtraType(input)) {
	// 'input' is now narrowed to ExtraType
	console.log(`System is ${input}`);
}
```

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://rustup.rs/) (for building stremio-core)

### Setup

Clone the stremio-core repository and apply the patch:

```bash
bun run setup
```

To test against the latest stremio-core upstream tag:

```bash
bun run setup --latest
```

### Building

Generate types and build the package:

```bash
bun run build
```

This will:

1. Run cargo tests to export TypeScript bindings from stremio-core
2. Process and clean up the generated types
3. Build the distribution files
4. Save any changes as a patch file

# License

See [LICENSE](./LICENCE)

```
SPDX-License-Identifier: MIT
```
