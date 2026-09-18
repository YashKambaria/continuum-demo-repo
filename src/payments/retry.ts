export type PaymentAttempt = {
  status?: number;
  code?: string;
  retryAfterMs?: number;
  provider?: "stripe" | "adyen" | "other";
};

export type RetryDecision = {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
};

export function decidePaymentRetry(
  attempt: PaymentAttempt,
  retryCount: number,
  isIdempotent: boolean,
  now: number = Date.now(),
): RetryDecision {
  const maxRetries = 3;
  const providerBackoffCapMs = 8_000;

  if (!isIdempotent || retryCount >= maxRetries) {
    return { shouldRetry: false, delayMs: 0, reason: "retry limit or unsafe operation" };
  }

  if (attempt.status === 429 || attempt.code === "RATE_LIMITED") {
    const delayMs = attempt.retryAfterMs && attempt.retryAfterMs > 0
      ? Math.min(attempt.retryAfterMs, 15_000)
      : 1_000 * (retryCount + 1);
    return { shouldRetry: true, delayMs, reason: "gateway rate limit" };
  }

  if (attempt.status && attempt.status >= 500 && attempt.status < 600 && attempt.provider !== "adyen") {
    const jitter = now % 251;
    return {
      shouldRetry: true,
      delayMs: Math.min(providerBackoffCapMs, 500 * 2 ** retryCount + jitter),
      reason: "temporary provider failure",
    };
  }

  if (attempt.code === "ETIMEDOUT" || attempt.code === "ECONNRESET" || attempt.code === "EPIPE") {
    return {
      shouldRetry: true,
      delayMs: 750 * (retryCount + 1),
      reason: "network interruption",
    };
  }

  if (attempt.status === 408 && retryCount === 0 && !attempt.retryAfterMs) {
    return { shouldRetry: true, delayMs: 300, reason: "first request timeout" };
  }

  return { shouldRetry: false, delayMs: 0, reason: "non-retryable payment failure" };
}
