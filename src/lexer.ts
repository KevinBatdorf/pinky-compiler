import { keywords, type Token, tokenTypes } from "./tokens";

export class TokenError extends Error {
	line: number;
	column: number;
	constructor(message: string, line: number, column: number) {
		super(message);
		this.name = "TokenError";
		this.line = line;
		this.column = column;
	}
}
export type TokenErrorType = null | TokenError;

export const isAlpha = (char: string): boolean =>
	(char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_";
export const isDigit = (char: string): boolean =>
	(char >= "0" && char <= "9") || char === ".";
export const isAlphaNumeric = (char: string): boolean =>
	isAlpha(char) || isDigit(char);
export const isWhitespace = (char: string): boolean =>
	char === " " || char === "\t" || char === "\r";
export const isNewline = (char: string): boolean => char === "\n";
export const isEndOfFile = (char: string): boolean => char === "\0";

export const peek = (source: string, curr: number): string =>
	curr < source.length ? source[curr] : "\0";
export const lookahead = (source: string, curr: number, n: number): string =>
	curr + n < source.length ? source[curr + n] : "\0";
export const match = (source: string, curr: number, char: string): boolean =>
	peek(source, curr) === char;
export const advance = (
	source: string,
	curr: number,
	line: number,
	column: number,
): {
	line: number;
	column: number;
	current: number;
} => {
	const char = peek(source, curr);
	let nextLine = line;
	let nextColumn = column;
	if (isNewline(char)) {
		nextLine++;
		nextColumn = 1;
	} else {
		nextColumn++;
	}
	return {
		line: nextLine,
		column: nextColumn,
		current: curr + 1,
	};
};
const ESCAPE_SEQUENCES: Record<string, string> = {
	n: "\n",
	t: "\t",
	r: "\r",
	'"': '"',
	"'": "'",
	"\\": "\\",
	"0": "\0",
};
export const decodeStringLiteralSegment = (
	src: string,
	pos: { current: number },
): { char: string; advance: number } => {
	const start = pos.current;
	const ch = src[start + 1];
	if (ch === "u") {
		if (src[start + 2] === "{") {
			// Unicode escape \u{XXXXXX}
			let i = start + 3;
			let hex = "";
			while (i < src.length && src[i] !== "}") {
				if (!/[0-9a-fA-F]/.test(src[i])) break;
				hex += src[i++];
			}
			if (src[i] === "}") {
				const codePoint = Number.parseInt(hex, 16);
				if (!Number.isNaN(codePoint)) {
					return {
						char: String.fromCodePoint(codePoint),
						advance: i - start + 1,
					};
				}
			}
			// Malformed unicode: fallback to raw
			return { char: `\\u{${hex}}`, advance: i - start };
		}
		// Unicode escape \uXXXX
		const hex = src.slice(start + 2, start + 6);
		if (/^[0-9a-fA-F]{4}$/.test(hex)) {
			const codePoint = Number.parseInt(hex, 16);
			return {
				char: String.fromCharCode(codePoint),
				advance: 6,
			};
		}
		return { char: "\\u", advance: 2 };
	}
	// Simple escape: \n, \t, etc.
	return {
		char: ESCAPE_SEQUENCES[ch] ?? ch,
		advance: 2,
	};
};

/**
 * Tokenizes Pinky source code into tokens.
 */
export const tokenize = (
	src: string,
): { tokens: Token[]; error: TokenErrorType | null } => {
	const tokens: Token[] = [];
	let pos = { line: 1, column: 1, current: 0 };

	const addToken = ({
		type,
		value,
		line = pos.line,
		column = pos.column,
		start = pos.current - value.length,
		end = pos.current,
	}: Omit<Token, "line" | "column" | "start" | "end"> &
		Partial<Pick<Token, "line" | "column" | "start" | "end">>) => {
		tokens.push({ type, value, line, column, start, end });
	};
	const errorReturn = (
		message: string,
		details?: { line?: number; column?: number },
	): TokenErrorType =>
		new TokenError(
			message,
			details?.line || pos.line,
			details?.column || pos.column,
		);

	while (!isEndOfFile(peek(src, pos.current))) {
		const ch = peek(src, pos.current);
		// mark the start and column
		const start = pos.current;
		const column = pos.column;
		switch (ch) {
			case " ":
			case "\t":
			case "\r":
			case "\n":
				pos = advance(src, pos.current, pos.line, pos.column);
				break;
			case "(":
			case ")":
			case ",":
			case "+":
			case "*":
			case "^":
			case "/":
			case "%": {
				pos = advance(src, pos.current, pos.line, pos.column);
				addToken({ type: tokenTypes[ch], value: ch, start, column });
				break;
			}
			case "'":
			case '"': {
				let value = "";
				const quotePos = pos; // track for error handling
				// consume the opening quote
				pos = advance(src, pos.current, pos.line, pos.column);
				while (
					!isEndOfFile(peek(src, pos.current)) &&
					!match(src, pos.current, ch)
				) {
					// consume to the end of the line
					const char = peek(src, pos.current);
					if (char === "\\") {
						// checks for escape sequences
						const { char: decoded, advance: adv } = decodeStringLiteralSegment(
							src,
							{ current: pos.current },
						);
						value += decoded;
						for (let i = 0; i < adv; i++) {
							pos = advance(src, pos.current, pos.line, pos.column);
						}
					} else {
						value += char;
						pos = advance(src, pos.current, pos.line, pos.column);
					}
				}
				if (isEndOfFile(peek(src, pos.current))) {
					addToken({ type: "EOF", value: "" });
					return {
						tokens,
						error: errorReturn("Unterminated string literal at line", {
							line: quotePos.line,
							column: quotePos.column,
						}),
					};
				}
				// consume the closing quote
				pos = advance(src, pos.current, pos.line, pos.column);
				addToken({ type: "STRING", value, start, column });
				break;
			}
			case ">":
			case "<": {
				// handle >= and <=
				if (lookahead(src, pos.current, 1) === "=") {
					// consume the second character
					pos = advance(src, pos.current, pos.line, pos.column);
					pos = advance(src, pos.current, pos.line, pos.column);
					addToken({
						type: tokenTypes[`${ch}=`],
						value: `${ch}=`,
						start,
						column,
					});
					break;
				}
				// handle < and >
				pos = advance(src, pos.current, pos.line, pos.column);
				addToken({ type: tokenTypes[ch], value: ch, start, column });
				break;
			}
			case "~":
			case ":":
			case "=": {
				// Handle unary operator ~
				if (ch === "~" && lookahead(src, pos.current, 1) !== "=") {
					pos = advance(src, pos.current, pos.line, pos.column);
					addToken({ type: tokenTypes[ch], value: ch, start, column });
					break;
				}
				if (lookahead(src, pos.current, 1) !== "=") {
					addToken({ type: "EOF", value: "" });
					return {
						tokens,
						error: errorReturn(`Unexpected character '${ch}'`),
					};
				}
				// consume the second = character
				pos = advance(src, pos.current, pos.line, pos.column);
				pos = advance(src, pos.current, pos.line, pos.column);
				addToken({
					type: tokenTypes[`${ch}=`],
					value: `${ch}=`,
					start,
					column,
				});
				break;
			}
			case "-": {
				if (lookahead(src, pos.current, 1) !== "-") {
					pos = advance(src, pos.current, pos.line, pos.column);
					addToken({ type: "MINUS", value: ch, start, column });
					break;
				}
				// Handle comment
				let value = "";
				while (
					!isEndOfFile(peek(src, pos.current)) &&
					!match(src, pos.current, "\n")
				) {
					// consume to the end of the line
					value += peek(src, pos.current);
					pos = advance(src, pos.current, pos.line, pos.column);
				}
				addToken({ type: "COMMENT", value, start, column });
				break;
			}
			default:
				if (isDigit(ch)) {
					let value = "";
					while (
						!isEndOfFile(peek(src, pos.current)) &&
						(isDigit(peek(src, pos.current)) || match(src, pos.current, "."))
					) {
						const decimal = match(src, pos.current, ".");
						if (decimal && !isDigit(lookahead(src, pos.current, 1))) {
							addToken({ type: "EOF", value: "" });
							return {
								tokens,
								error: errorReturn("Unexpected character '.' in number"),
							};
						}
						value += peek(src, pos.current);
						pos = advance(src, pos.current, pos.line, pos.column);
					}
					addToken({ type: "NUMBER", value, start, column });
					break;
				}
				if (isAlpha(ch)) {
					let value = "";
					while (
						!isEndOfFile(peek(src, pos.current)) &&
						isAlphaNumeric(peek(src, pos.current))
					) {
						value += peek(src, pos.current);
						pos = advance(src, pos.current, pos.line, pos.column);
					}
					const type = keywords[value] || "IDENTIFIER";
					addToken({ type, value, start, column });
					break;
				}

				addToken({ type: "EOF", value: "" });
				return {
					tokens,
					error: errorReturn(`Unexpected character '${ch}'`),
				};
		}
	}
	addToken({ type: "EOF", value: "" });
	return { tokens, error: null };
};
