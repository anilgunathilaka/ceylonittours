import { avatar, unsplash } from "@/lib/images";
import type { Testimonial } from "@/types";

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Emily Harrison",
    country: "United Kingdom",
    countryFlag: "🇬🇧",
    avatar: {
      url: unsplash(avatar.woman1, 200, 200),
      alt: "Portrait of Emily Harrison",
      width: 200,
      height: 200,
    },
    quote:
      "Every single detail was handled — our driver felt like an old friend by day three. Sigiriya at sunrise alone was worth the trip.",
    rating: 5,
    tripName: "Grand Ceylon Discovery",
  },
  {
    id: "t2",
    name: "Daniel Kim",
    country: "United States",
    countryFlag: "🇺🇸",
    avatar: {
      url: unsplash(avatar.man1, 200, 200),
      alt: "Portrait of Daniel Kim",
      width: 200,
      height: 200,
    },
    quote:
      "The custom itinerary was exactly what we wanted — no rushed stops, just enough time in each place. Yala's leopards were the highlight.",
    rating: 5,
    tripName: "Yala Wildlife Safari Adventure",
  },
  {
    id: "t3",
    name: "Sofia Bergmann",
    country: "Germany",
    countryFlag: "🇩🇪",
    avatar: {
      url: unsplash(avatar.woman2, 200, 200),
      alt: "Portrait of Sofia Bergmann",
      width: 200,
      height: 200,
    },
    quote:
      "Best organised trip we've ever booked. Communication was fast, the private driver was fantastic, and the tea trails were breathtaking.",
    rating: 5,
    tripName: "Hill Country Tea Trails",
  },
  {
    id: "t4",
    name: "James O'Connor",
    country: "Australia",
    countryFlag: "🇦🇺",
    avatar: {
      url: unsplash(avatar.man2, 200, 200),
      alt: "Portrait of James O'Connor",
      width: 200,
      height: 200,
    },
    quote:
      "From the airport pickup to the final goodbye, everything felt effortless. Galle Fort at golden hour is unforgettable.",
    rating: 4.9,
    tripName: "Southern Coast Beach Escape",
  },
  {
    id: "t5",
    name: "Amélie Rousseau",
    country: "Canada",
    countryFlag: "🇨🇦",
    avatar: {
      url: unsplash(avatar.woman3, 200, 200),
      alt: "Portrait of Amélie Rousseau",
      width: 200,
      height: 200,
    },
    quote:
      "We asked for a slower-paced honeymoon and they delivered perfectly — private villas, quiet beaches, and thoughtful little surprises.",
    rating: 5,
    tripName: "Ayurveda & Wellness Retreat",
  },
];
