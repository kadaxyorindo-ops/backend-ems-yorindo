export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// Appends a 4-character random hex suffix to guarantee uniqueness.
// e.g. "tech-expo-2025" → "tech-expo-2025-a3f2"
export function slugifyUnique(value: string): string {
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${slugify(value)}-${suffix}`;
}