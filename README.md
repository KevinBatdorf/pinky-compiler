[![Release](https://github.com/KevinBatdorf/pinky-compiler/actions/workflows/release.yml/badge.svg)](https://github.com/KevinBatdorf/pinky-compiler/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/pinky-compiler.svg)](https://www.npmjs.com/package/pinky-compiler)
[![npm downloads](https://img.shields.io/npm/dm/pinky-compiler.svg)](https://www.npmjs.com/package/pinky-compiler)

# Pinky Compiler

A fast, embeddable compiler for the Pinky scripting language.
Compile Pinky code to WebAssembly and run it anywhere JavaScript runs.

---

## Features

-  Compile Pinky source to WASM bytes
-  Run Pinky code in the browser or Node.js
-  TypeScript-first API
-  Tiny, dependency-free runtime

---

## Install

```sh
npm install pinky-compiler
```

---

## Usage

```ts
import { compileFromSource, init } from "pinky-compiler";

// 1. Compile Pinky source to WASM bytes
const source = `
  x := 5
  println "Hello, Pinky!"
  println x + 10
`;
const { bytes, error } = compileFromSource(source);

if (error) throw error;

// 2. Initialize the WASM runtime (once per app)
const { run } = await init();

// 3. Run the compiled program
const output = run(bytes);
console.log(output.join("")); // Hello, Pinky!\n15\n
```

---

## API

### `compileFromSource(source: string)`

Tokenizes, parses, and compiles Pinky source code to WASM.

-  **Returns:** `{ bytes: Uint8Array, error, meta }`

### `init()`

Initializes the WASM runtime and returns an object with a `run` function.

-  **Returns:** `Promise<{ run: (bytes: Uint8Array) => string[] }>`

### `run(bytes: Uint8Array)`

Runs the compiled WASM program and returns output as an array of strings.

---

## Advanced Usage

You can also use the lower-level building blocks:

```ts
import { tokenize, parse, compile, init } from "pinky-compiler";

const { tokens } = tokenize('println "hi"');
const { ast } = parse(tokens);
const { bytes } = compile(ast);
const { run } = await init();
run(bytes);
```

---

## Types

All major types are exported:

```ts
import type { AST, Token, CompilerErrorType, ParseErrorType, TokenErrorType, RunFunction } from "pinky-compiler";
```

Additionally, you can import the syntax types listed [here](https://github.com/KevinBatdorf/pinky-compiler/blob/main/src/index.ts).
