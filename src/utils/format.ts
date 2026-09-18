/**
 * Formats an integer number of cents as a USD currency string for display.
 * This presentation-only helper deliberately contains no payment business rules.
 */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
