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

/** Produces a short, safe-to-share reference for a payment operation. */
export function formatPaymentReference(requestId?: string): string {
  if (!requestId) return "Payment reference unavailable";
  return `Payment ref: ${requestId.slice(-8).toUpperCase()}`;
}
