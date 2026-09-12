import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_Sinhala } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";

const satoshi = localFont({
  variable: "--font-satoshi",
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
});

const notoSansSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = "https://ceylonittours.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ceylon IT Tours | Tailor-Made Sri Lanka Travel & Tour Packages",
    template: "%s | Ceylon IT Tours",
  },
  description:
    "Locally-run, tailor-made Sri Lanka tours with private drivers and 24/7 support. Cultural triangle, hill country, wildlife safaris, and southern coast itineraries built around you.",
  keywords: [
    "Sri Lanka tours",
    "Sri Lanka travel agency",
    "Sri Lanka tour packages",
    "custom Sri Lanka itinerary",
    "Sri Lanka private driver",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Ceylon IT Tours",
    title: "Ceylon IT Tours | Tailor-Made Sri Lanka Travel & Tour Packages",
    description:
      "Locally-run, tailor-made Sri Lanka tours with private drivers and 24/7 support.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ceylon IT Tours | Tailor-Made Sri Lanka Travel & Tour Packages",
    description:
      "Locally-run, tailor-made Sri Lanka tours with private drivers and 24/7 support.",
  },
  robots: { index: true, follow: true },
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;
const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} ${cormorantGaramond.variable} ${notoSansSinhala.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <AuthSessionProvider>
          <a
            href="#main-content"
            className="sr-only-focusable fixed top-3 left-3 z-[200] rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Skip to content
          </a>

          {gtmId && (
            <Script id="gtm-init" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          )}

          {gaId && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
              <Script id="ga-init" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', '${gaId}');`}
              </Script>
            </>
          )}

          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
