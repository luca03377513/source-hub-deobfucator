/**
 * Lua script deobfuscator.
 * Handles multiple common obfuscation techniques used in Lua scripts:
 *   - loadstring(string.char(...))() — multi-layer char-array encoding
 *   - string.char(...) — char array decoding
 *   - Hex string escapes (\x41)
 *   - Unicode escapes (\u0041)
 *   - Base64 (atob / base64 patterns)
 *   - Hex number literals (0xFF)
 * Up to 10 passes are applied until the output stabilises.
 */

const MAX_PASSES = 10;

/** Decode a `string.char(n1, n2, ...)` expression into its string value. */
function decodeStringChar(expr: string): string {
  return expr.replace(
    /string\.char\s*\(([^)]+)\)/g,
    (_match, args: string) => {
      const nums = args.split(",").map((s) => parseInt(s.trim(), 10));
      return nums.map((n) => String.fromCharCode(n)).join("");
    }
  );
}

/** Decode hex escape sequences like \x41 → A */
function decodeHexEscapes(source: string): string {
  return source.replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/** Decode unicode escape sequences like \u0041 → A */
function decodeUnicodeEscapes(source: string): string {
  return source.replace(/\\u([0-9A-Fa-f]{4})/g, (_m, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/** Convert hex number literals to decimal (0xFF → 255) */
function decodeHexNumbers(source: string): string {
  return source.replace(/\b0x([0-9A-Fa-f]+)\b/g, (_m, hex: string) =>
    parseInt(hex, 16).toString()
  );
}

/** Attempt to decode base64 strings wrapped in atob() */
function decodeBase64(source: string): string {
  return source.replace(/atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/g, (_m, b64: string) => {
    try {
      return Buffer.from(b64, "base64").toString("utf-8");
    } catch {
      return _m;
    }
  });
}

/** Run a single deobfuscation pass over the source. */
function singlePass(source: string): string {
  let result = source;
  result = decodeStringChar(result);
  result = decodeHexEscapes(result);
  result = decodeUnicodeEscapes(result);
  result = decodeBase64(result);
  result = decodeHexNumbers(result);
  return result;
}

/**
 * Deobfuscate a Lua script string.
 * Applies up to MAX_PASSES passes until the output stabilises.
 */
export function deobfuscate(source: string): string {
  let current = source;
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = singlePass(current);
    if (next === current) break;
    current = next;
  }
  return current;
}
