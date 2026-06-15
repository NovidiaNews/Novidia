"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import QUOTES from "../../data/quotes";

type Img = {
  src?: string;
  preview?: string;
  avgColor?: string;
  credit?: string;
};

export default function PexelsBackdrop() {
  const [creditLoaded, setCreditLoaded] = useState(false);
  const [image, setImage] = useState<Img>({});
  const [quote, setQuote] = useState(QUOTES[0]);
  const [loaded, setLoaded] = useState(false);
  const loaderRef = useRef<HTMLSpanElement | null>(null);
  const quoteLoaderRef = useRef<HTMLSpanElement | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch("/api/pexels?count=8", {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Pexels API error");

        const data = await res.json();
        const photos = data.photos || [];

        if (!isMounted) return;

        if (photos.length) {
          const selected = photos[Math.floor(Math.random() * photos.length)];
          setImage(selected);
        }

        setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
        setQuoteLoading(false);
      } catch (err) {
        console.error(err);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let el: HTMLElement | null = null;
    let elQuote: HTMLElement | null = null;

    async function setupDotPulse() {
      try {
        const ldrs = await import("ldrs");
        if (ldrs?.dotPulse?.register) {
          ldrs.dotPulse.register();
        }

        if (loaderRef.current) {
          el = document.createElement("l-dot-pulse");
          el.setAttribute("size", "20");
          el.setAttribute("speed", "1.3");
          el.setAttribute("color", "white");
          loaderRef.current.appendChild(el);
        }

        if (quoteLoaderRef.current) {
          elQuote = document.createElement("l-dot-pulse");
          elQuote.setAttribute("size", "24");
          elQuote.setAttribute("speed", "1.3");
          elQuote.setAttribute("color", "white");
          quoteLoaderRef.current.appendChild(elQuote);
        }
      } catch (err) {
        console.warn("ldrs dotPulse load failed", err);
      }
    }

    setupDotPulse();

    return () => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (elQuote && elQuote.parentNode) elQuote.parentNode.removeChild(elQuote);
    };
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden relative pointer-events-auto hidden md:block">
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ backgroundColor: image.avgColor || "#000" }}
      />

      <div className="absolute inset-0">
        {image.preview && (
          <Image
            src={image.preview}
            alt="Preview"
            fill
            unoptimized
            className={`object-cover scale-105 blur-xl transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}
          />
        )}

        {image.src && (
          <Image
            src={image.src}
            alt="Background"
            fill
            priority
            unoptimized
            onLoad={() => {
              setLoaded(true);
              setCreditLoaded(true);
            }}
            className={`object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}
      </div>

      <div className="absolute inset-0 z-1 bg-gradient-to-t from-zinc-800/90 via-transparent to-zinc-800/90 opacity-75" />

      <div className="z-10 absolute inset-0 flex flex-col justify-between p-10">
        <h1 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          {!creditLoaded ? (
            <span ref={loaderRef} />
          ) : (
            <>{image.credit?.replace(" - Pexels", "") || "Pexels"} - Pexels</>
          )}
        </h1>

        <div className="text-4xl font-bold text-white font-fraunces! drop-shadow-xl max-w-2xl min-h-3rem flex items-center">
          {quoteLoading ? (
            <span ref={quoteLoaderRef} className="inline-flex items-center" />
          ) : (
            <p className="font-fraunces">{quote}</p>
          )}
        </div>
      </div>
    </div>
  );
}
