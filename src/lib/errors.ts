/**
 * User-facing error text. In development a short diagnostic is appended to help
 * debugging; in production only the generic message is returned (no stack traces,
 * connection strings or file paths).
 */
export function publicErrorMessage(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "development" || !(error instanceof Error)) return message;
  return `${message} (${error.message.split("\n")[0].slice(0, 200)})`;
}
