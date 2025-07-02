import { compile } from "./compiler";
import { loadWasm } from "./compiler/exports";
import { tokenize } from "./lexer";
import { parse } from "./parser";

export type { CompilerErrorType } from "./compiler";
export { compile } from "./compiler";
export { loadWasm } from "./compiler/exports";
export { tokenize } from "./lexer";
export type { TokenErrorType } from "./lexer";
export type { AST, ParseErrorType } from "./parser";
export { parse } from "./parser";
export * from "./syntax";
export type { Token } from "./tokens";

/**
 * Compiles Pinky source code from a string.
 * This function tokenizes the source code, parses the tokens into an AST,
 * and then compiles the AST into WebAssembly binary.
 *
 * ```
 * const source = "x := 42 print(x)";
 * const wasmBytes = compileFromSource(source);
 * ```
 */
export const compileFromSource = (source: string) => {
	const { tokens } = tokenize(source);
	const { ast } = parse(tokens);
	return compile(ast);
};

/**
 * Initialize WASM runtime and get the run function.
 * The run function outputs an array of strings.
 *
 * ```
 *   const { run } = await init();
 *   const output = run(bytes);
 * ```
 */
export const init = async () => {
	const { run } = await loadWasm();
	return { run };
};
