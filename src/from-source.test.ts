import { describe, expect, test } from "vitest";
import { CompilerError, compileFromSource, ParseError, TokenError } from ".";

describe("compileFromSource (discriminated union)", () => {
	test("returns valid bytes and no error for correct source", () => {
		const source = 'println "hello world"';
		const result = compileFromSource(source);

		expect(result.errorType).toBeNull();
		expect(result.error).toBeNull();
		expect(result.bytes).toBeInstanceOf(Uint8Array);
		expect(result.strings).toBeInstanceOf(Uint8Array);
	});

	test("returns TokenError for invalid token", () => {
		const source = 'println "unterminated string';
		const result = compileFromSource(source);

		expect(result.errorType).toBe("TokenError");
		expect(result.error).toBeInstanceOf(TokenError);
		expect(result.bytes).toBeNull();
		expect(result.strings).toBeNull();
	});

	test("returns ParseError for invalid syntax", () => {
		const source = "print )";
		const result = compileFromSource(source);

		expect(result.errorType).toBe("ParseError");
		expect(result.error).toBeInstanceOf(ParseError);
		expect(result.bytes).toBeNull();
		expect(result.strings).toBeNull();
	});

	test("returns CompilerError for semantic error", () => {
		const source = "print x";
		const result = compileFromSource(source);

		expect(result.errorType).toBe("CompilerError");
		expect(result.error).toBeInstanceOf(CompilerError);
		expect(result.bytes).toBeNull();
		expect(result.strings).toBeNull();
	});
});
