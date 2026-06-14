import type { Metadata } from "next";
import Navbar from "./components/navigation/navbar";
import { Fraunces, Montserrat } from "next/font/google";
import "./globals.css";
import CookieModal from "./components/CookieModal";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Novidia | Twoja szkolna redakcja",
    template: "%s | Novidia",
  },
  description: "Nowoczesna platforma dziennikarska dla uczniów. Twórz, publikuj i rozwijaj swoje pasje z pomocą AI.",
  metadataBase: new URL("https://oliveos.eu"),
  applicationName: "Novidia",
  authors: [{ name: "Zespół Novidia" }],
  creator: "Novidia",
  publisher: "Novidia",

  // Metadata for OpenGraph (Social Media)
  openGraph: {
    title: "Novidia | Twoja szkolna redakcja",
    description: "Nowoczesna platforma dziennikarska dla uczniów. Twórz, publikuj i rozwijaj swoje pasje z pomocą AI.",
    url: "https://oliveos.eu",
    siteName: "Novidia",
    type: "website",
    locale: "pl_PL", // Changed to Polish
    images: [
      {
        url: "/og-image.png", // Ensure this exists in your public folder
        width: 1200,
        height: 630,
        alt: "Novidia - Platforma dla młodych twórców",
      },
    ],
  },

  // Metadata for Twitter
  twitter: {
    card: "summary_large_image",
    title: "Novidia | Twoja szkolna redakcja",
    description: "Nowoczesna platforma dziennikarska dla uczniów.",
    images: ["/twitter-image.png"],
  },

  // Icons
  icons: {
    icon: "/favicon.ico",
    apple: [
      {
        url: "/touch-icons/apple-touch-icon-iphone-60x60.png",
        sizes: "60x60",
        type: "image/png",
      },
      {
        url: "/touch-icons/apple-touch-icon-iphone-retina-120x120.png",
        sizes: "120x120",
        type: "image/png",
      },
      {
        url: "/touch-icons/apple-touch-icon-ipad-76x76.png",
        sizes: "76x76",
        type: "image/png",
      },
      {
        url: "/touch-icons/apple-touch-icon-ipad-retina-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
    ],
  },

  manifest: "/site.webmanifest",

  robots: {
    index: true,
    follow: true,
  },
};

// In Next.js 14+, viewport is exported separately
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#36316A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${montserrat.variable}`}>
      <body className="bg-zinc-100">
        <Navbar navigation={[
          { id: "1", title: "Główna", url: "/" },
          { id: "2", title: "Tematy", url: "/topics" },
          {
            id: "3",
            title: "Kategorie",
            url: "/categories",
            children: [
              { id: "3-1", title: "Sport", url: "/categories?tag=sport", icon: "sport" },
              { id: "3-2", title: "Kultura", url: "/categories?tag=culture", icon: "culture" },
              { id: "3-3", title: "Nauka", url: "/categories?tag=science", icon: "science" },
              { id: "3-4", title: "Technologia", url: "/categories?tag=technology", icon: "technology" },
              { id: "3-5", title: "Rozrywka", url: "/categories?tag=entertainment", icon: "entertainment" },
            ],
          },
        ]} />
        {children}
        <CookieModal />
      </body>
    </html>
  );
}
