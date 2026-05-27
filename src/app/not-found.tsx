"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import QUOTES from "./data/quotes";

type Img = {
  src?: string;
  preview?: string;
  avgColor?: string;
  credit?: string;
};

export default function NotFound() {
  const [creditLoaded, setCreditLoaded] = useState(false);
  const [image, setImage] = useState<Img>({});
  const [quote, setQuote] = useState(QUOTES[0]);
  const [loaded, setLoaded] = useState(false);
  const loaderRef = useRef<HTMLSpanElement | null>(null);
  const quoteLoaderRef = useRef<HTMLSpanElement | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pexels?count=8", {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Pexels API error");

        const data = await res.json();
        const photos = data.photos || [];

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
  }, []);

  useEffect(() => {
    let el: HTMLElement | null = null;
    let elQuote: HTMLElement | null = null;
    let registered = false;

    async function setupDotPulse() {
      try {
        const ldrs = await import("ldrs");
        if (ldrs?.dotPulse?.register) {
          ldrs.dotPulse.register();
          registered = true;
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
          elQuote.setAttribute("size", "24"); // Slightly larger for readability alongside large text
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
      registered = false;
    };
  }, []);

  return (
    <div className="w-full h-screen absolute inset-0 pointer-events-none">
      <main className="relative w-full h-screen flex flex-col md:flex-row gap-6 p-4 pt-25 ">

        {/* LEFT SIDE */}
        <div className="w-full h-full rounded-2xl overflow-hidden relative pointer-events-auto">

          {/* COLOR BACKGROUND (instant, no flash) */}
          <div
            className="absolute inset-0 transition-colors duration-500"
            style={{ backgroundColor: image.avgColor || "#000" }}
          />

          {/* IMAGES */}
          <div className="absolute inset-0">

            {/* PREVIEW (blurred) */}
            {image.preview && (
              <Image
                src={image.preview}
                alt="Preview"
                fill
                unoptimized
                className={`object-cover scale-105 blur-xl transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"
                  }`}
              />
            )}

            {/* FULL RES */}
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
                className={`object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"
                  }`}
              />
            )}
          </div>

          {/* DARK OVERLAY (readability) */}
          <div className="absolute inset-0 z-1 bg-linear-to-t from-zinc-800 via-25% via-transparent via-75% to-zinc-800 opacity-75" />

          {/* TEXT */}
          <div className="z-10 absolute inset-0 flex flex-col justify-between p-10">
            <h1 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              {!creditLoaded ? (
                <span ref={loaderRef} />
              ) : (
                <>
                  {image.credit?.replace(" - Pexels", "") || "Pexels"} - Pexels
                </>
              )}
            </h1>

            <div className="text-4xl font-bold text-white font-fraunces! drop-shadow-xl max-w-2xl min-h-3rem flex items-center">
              {quoteLoading ? (
                <span ref={quoteLoaderRef} className="inline-flex items-center">
                </span>
              ) : (
                <p className="font-fraunces">{quote}</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full h-full rounded-2xl bg-zinc-50 flex items-center justify-center pointer-events-auto p-2">
          <div className="w-full max-w-lg flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-7xl font-bold tracking-tight text-main text-center font-fraunces">
                404
              </h1>

              <p className="text-base leading-7 text-zinc-600 text-center">
                Ta strona nie istnieje :(
              </p>
            </div>

              <Link
                href="/"
                className="w-full h-fit px-12 py-4 bg-main text-center text-zinc-50 rounded-xl font-fraunces brightness-100 hover:brightness-125 transition-all"
              >
                ← Powrót na stronę główną
              </Link>
          </div>
        </div>

      </main>
    </div>
  );
}