# Continuum Demo Repository

A deliberately small TypeScript payment module used to demonstrate Continuum's knowledge-silo detection workflow.

The `src/payments/retry.ts` module is intentionally complex, fast-changing, and mostly owned by one contributor. The `src/utils/format.ts` helper is documented and shared, serving as a low-risk comparison.

## Demo ownership signals

- `src/payments/retry.ts` intentionally represents an at-risk knowledge silo.
- `src/utils/format.ts` contains small shared presentation utilities maintained by multiple contributors.
