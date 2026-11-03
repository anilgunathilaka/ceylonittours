/**
 * Country from an international phone number's calling code — used for the "source markets"
 * stats (bookings don't ask for a country). Numbers without a "+" or "00" prefix are
 * treated as Sri Lankan (local format).
 */
const CODES: Record<string, string> = {
  "1": "United States / Canada",
  "7": "Russia / Kazakhstan",
  "20": "Egypt",
  "27": "South Africa",
  "30": "Greece",
  "31": "Netherlands",
  "32": "Belgium",
  "33": "France",
  "34": "Spain",
  "36": "Hungary",
  "39": "Italy",
  "40": "Romania",
  "41": "Switzerland",
  "43": "Austria",
  "44": "United Kingdom",
  "45": "Denmark",
  "46": "Sweden",
  "47": "Norway",
  "48": "Poland",
  "49": "Germany",
  "52": "Mexico",
  "55": "Brazil",
  "60": "Malaysia",
  "61": "Australia",
  "62": "Indonesia",
  "63": "Philippines",
  "64": "New Zealand",
  "65": "Singapore",
  "66": "Thailand",
  "81": "Japan",
  "82": "South Korea",
  "84": "Vietnam",
  "86": "China",
  "90": "Turkey",
  "91": "India",
  "92": "Pakistan",
  "94": "Sri Lanka",
  "351": "Portugal",
  "353": "Ireland",
  "358": "Finland",
  "420": "Czechia",
  "852": "Hong Kong",
  "880": "Bangladesh",
  "886": "Taiwan",
  "960": "Maldives",
  "966": "Saudi Arabia",
  "971": "United Arab Emirates",
  "972": "Israel",
  "974": "Qatar",
  "977": "Nepal",
};

export function countryFromPhone(phone?: string | null) {
  if (!phone) return undefined;
  const compact = phone.replace(/[\s()-]/g, "");
  const international = compact.startsWith("+") ? compact.slice(1) : compact.startsWith("00") ? compact.slice(2) : null;
  if (international === null) return compact.startsWith("0") ? "Sri Lanka" : undefined;
  // Longest calling code first (codes are 1–3 digits)
  for (const length of [3, 2, 1]) {
    const country = CODES[international.slice(0, length)];
    if (country) return country;
  }
  return undefined;
}
