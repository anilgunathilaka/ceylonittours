export const DEFAULT_AUTH_REDIRECT = "/tour-packages";

/** Only allow same-origin relative paths to prevent open redirects. */
export function safeCallbackUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AUTH_REDIRECT;
  }
  return value;
}
