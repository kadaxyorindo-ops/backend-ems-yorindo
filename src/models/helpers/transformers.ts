/**
 * @file transformers.ts
 * @description Mongoose `set` transformer functions used to sanitize field
 * values before they are written to the database.
 *
 * How Mongoose `set` transformers work:
 *   When you define `set: lowerTrim` on a schema field, Mongoose calls that
 *   function every time a value is assigned to that field — both on document
 *   creation and on update. The return value of the function is what actually
 *   gets stored.
 *
 * Rules:
 *  - These functions must be pure (no side effects, no DB calls).
 *  - They must handle non-string input gracefully (return the value as-is).
 *  - Never throw inside a transformer — Mongoose does not catch those errors
 *    cleanly during bulk operations.
 *
 * Usage example in a schema:
 *   import { lowerTrim, safeTrim } from "@/models/helpers/transformers";
 *
 *   email: { type: String, set: lowerTrim }  // "  Hello@Email.COM " → "hello@email.com"
 *   name:  { type: String, set: safeTrim  }  // "  John Doe  "       → "John Doe"
 */

/* -------------------------------------------------------------------------
 * lowerTrim
 * -------------------------------------------------------------------------
 * Use for fields where case must never matter:
 *   - email addresses
 *   - normalized name fields (normalizedFullName, normalizedName)
 *   - any field used in case-insensitive lookups or deduplication
 * ---------------------------------------------------------------------- */

/**
 * Trims leading/trailing whitespace and converts the value to lowercase.
 * If the value is not a string (e.g. null, undefined, number), it is
 * returned unchanged — Mongoose's own type validation handles those cases.
 *
 * @param value - The raw value being assigned to the field.
 * @returns The sanitized string, or the original value if not a string.
 *
 * @example
 * lowerTrim("  Hello@Email.COM ")  // → "hello@email.com"
 * lowerTrim("  PT. MAJU  ")        // → "pt. maju"
 * lowerTrim(null)                  // → null   (passed through unchanged)
 * lowerTrim(undefined)             // → undefined (passed through unchanged)
 */
export function lowerTrim(value: unknown): string | unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

/* -------------------------------------------------------------------------
 * safeTrim
 * -------------------------------------------------------------------------
 * Use for fields where the original casing must be preserved but surrounding
 * whitespace should be cleaned up:
 *   - display names (fullName, company name, event title)
 *   - addresses, notes, free-text fields
 *   - any human-readable string that will be shown in the UI
 * ---------------------------------------------------------------------- */

/**
 * Trims leading/trailing whitespace while preserving the original casing.
 * If the value is not a string, it is returned unchanged.
 *
 * @param value - The raw value being assigned to the field.
 * @returns The trimmed string, or the original value if not a string.
 *
 * @example
 * safeTrim("  John Doe  ")   // → "John Doe"
 * safeTrim("  PT. Maju  ")   // → "PT. Maju"
 * safeTrim(null)             // → null   (passed through unchanged)
 * safeTrim(42)               // → 42     (passed through unchanged)
 */
export function safeTrim(value: unknown): string | unknown {
  return typeof value === "string" ? value.trim() : value;
}