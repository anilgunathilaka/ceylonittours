export const destinationCoordinates: Record<string, { lat: number; lon: number }> = {
  sigiriya: { lat: 7.957, lon: 80.7603 },
  kandy: { lat: 7.2906, lon: 80.6337 },
  ella: { lat: 6.8667, lon: 81.0466 },
  galle: { lat: 6.0535, lon: 80.221 },
  yala: { lat: 6.372, lon: 81.5183 },
  mirissa: { lat: 5.9483, lon: 80.4589 },
  "nuwara-eliya": { lat: 6.9497, lon: 80.7891 },
  colombo: { lat: 6.9271, lon: 79.8612 },
  trincomalee: { lat: 8.5874, lon: 81.2152 },
  anuradhapura: { lat: 8.3114, lon: 80.4037 },
};

const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
};

export function describeWeatherCode(code: number) {
  return weatherCodeDescriptions[code] ?? "Unknown";
}

export interface DestinationWeather {
  tempC: number;
  description: string;
}

export async function fetchDestinationWeather(slug: string): Promise<DestinationWeather> {
  const coords = destinationCoordinates[slug];
  if (!coords) {
    throw new Error("No coordinates available for this destination");
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=Asia%2FColombo`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Weather request failed");
  }

  const data = await res.json();
  return {
    tempC: Math.round(data.current.temperature_2m),
    description: describeWeatherCode(data.current.weather_code),
  };
}
