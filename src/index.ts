import { type CompilerError, compile } from "./compiler";
import { loadWasm } from "./compiler/exports";
import { type TokenError, tokenize } from "./lexer";
import { type ParseError, parse } from "./parser";

export { CompilerError, compile } from "./compiler";
export { loadWasm, type RunFunction } from "./compiler/exports";
export { TokenError, tokenize } from "./lexer";
export { type AST, ParseError, parse } from "./parser";
export * from "./syntax";
export type { Token } from "./tokens";

export type CompileFromSourceResult =
	| { errorType: null; error: null; bytes: Uint8Array; strings: Uint8Array }
	| { errorType: "TokenError"; error: TokenError; bytes: null; strings: null }
	| { errorType: "ParseError"; error: ParseError; bytes: null; strings: null }
	| {
			errorType: "CompilerError";
			error: CompilerError;
			bytes: null;
			strings: null;
	  };

/**
 * Compiles Pinky source code from a string.
 * This function tokenizes the source code, parses the tokens into an AST,
 * and then compiles the AST into WebAssembly binary.
 *
 * ```
 * const source = "x := 42 print(x)";
 * const { bytes } = compileFromSource(source);
 * ```
 */
export const compileFromSource = (source: string): CompileFromSourceResult => {
	const { tokens, error: tokenError } = tokenize(source);
	if (tokenError) {
		return {
			bytes: null,
			strings: null,
			errorType: "TokenError",
			error: tokenError,
		};
	}

	const { ast, error: parseError } = parse(tokens);
	if (parseError) {
		return {
			bytes: null,
			strings: null,
			errorType: "ParseError",
			error: parseError,
		};
	}

	const { bytes, meta, error: compilerError } = compile(ast);
	if (compilerError) {
		return {
			bytes: null,
			strings: null,
			errorType: "CompilerError",
			error: compilerError,
		};
	}

	return {
		bytes,
		strings: meta?.strings ?? null,
		errorType: null,
		error: compilerError,
	};
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
