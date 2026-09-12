/**
 * Demo availability generator — deterministic per destination + date so it looks
 * stable across reloads. There is no real booking/inventory backend yet; swap this
 * for a real lookup once one exists.
 */
function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isDateAvailable(destinationSlug: string, isoDate: string) {
  const hash = hashString(`${destinationSlug}:${isoDate}`);
  // Roughly 1 in 4 days shows as unavailable.
  return hash % 4 !== 0;
}
