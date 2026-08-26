/** Seeded fixture references — see docs/e2e-test-data.md. Generated unique per test run where the entity must be new (e.g. standard codes), reused where the entity is a stable seed (e.g. department names). */

export function uniqueStandardCode(): string {
  return `E2E-${Date.now()}-${Math.floor(Math.random() * 10_000)}`
}

// The UI defaults to Arabic locale, and department <select> options render
// the locale-resolved `name` accessor (Arabic first) — not the English name.
export const DEPARTMENTS = {
  a: 'تقنية المعلومات', // Information Technology
  b: 'الموارد البشرية', // Human Resources
} as const

export const PERSPECTIVE = 'المنظور التجريبي E2E'
export const AXIS = 'المحور التجريبي E2E'
