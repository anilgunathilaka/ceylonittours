/**
 * Curated, verified Unsplash placeholder photography. Swap for real Ceylon IT
 * Tours photography (via Sanity) before launch — ids here are illustrative,
 * not guaranteed to depict the exact named landmark.
 */
export function unsplash(id: string, width = 1200, height?: number) {
  const h = height ? `&h=${height}` : "";
  return `https://images.unsplash.com/photo-${id}?q=80&w=${width}${h}&auto=format&fit=crop`;
}

export const photo = {
  sigiriya: "1506905925346-21bda4d32df4",
  kandyTemple: "1519046904884-53103b34b206",
  ellaWaterfall: "1512100356356-de1b84283e18",
  galleFort: "1544551763-46a013bb70d5",
  yalaElephant: "1547970810-dc1eac37d174",
  yalaElephantAlt: "1547721064-da6cfb341d50",
  mirissaBeach: "1507525428034-b723cf961d3e",
  nuwaraEliyaTea: "1500534623283-312aade485b7",
  colomboSkyline: "1519501025264-65ba15a82390",
  trincomaleeCoast: "1470770841072-f978cf4d019e",
  anuradhapuraCountryside: "1500382017468-9049fed747ef",
  hillCountryLake: "1439066615861-d1af74d74000",
  beachSunset: "1552733407-5d5c46c3bb3b",
  scenicCoastRoad: "1465156799763-2c087c332922",
  ancientRamparts: "1493246507139-91e8fad9978e",
  heroLandscape: "1506665531195-3566af2b4dfa",
  mistyHills: "1469854523086-cc02fe5d8800",
  templeMountain: "1544735716-392fe2489ffa",
  surfBeach: "1502680390469-be75c86b636f",
  marketStreet: "1517248135467-4c7edcad34c4",
  forestWaterfall: "1433086966358-54859d0ed716",
  mountainLake: "1469474968028-56623f02e42e",
} as const;

export const avatar = {
  woman1: "1494790108377-be9c29b29330",
  man1: "1500648767791-00dcc994a43e",
  woman2: "1438761681033-6461ffad8d80",
  man2: "1472099645785-5658abf4ff4e",
  woman3: "1534528741775-53994a69daeb",
} as const;

export const blogCover = {
  mapCompass: "1488646953014-85cb44e25828",
  packingSuitcase: "1509316975850-ff9c5deb0cd9",
  sriLankanFood: "1504674900247-0877df9cc836",
} as const;
