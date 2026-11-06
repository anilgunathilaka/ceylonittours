import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The Hostinger build machine reports many CPUs; one build worker per CPU ran out of memory
    // (SIGABRT while collecting page data) and opened too many database connections. Two is plenty.
    cpus: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        // Images uploaded in /admin/content (Supabase Storage public bucket)
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google account profile photos
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
