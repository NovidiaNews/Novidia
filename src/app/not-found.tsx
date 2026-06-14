"use client";

import Link from "next/link";
import ImageSide from "./components/pexels/ImageSide";

export default function NotFound() {
  return (
    <div className="w-full h-screen absolute inset-0 pointer-events-none">
      <main className="relative w-full h-screen flex flex-col md:flex-row gap-6 p-4 pt-25 ">

        {/* LEFT SIDE */}
        <ImageSide />

        {/* RIGHT SIDE */}
        <div className="w-full h-full rounded-2xl bg-zinc-50 flex items-center justify-center pointer-events-auto p-2">
          <div className="w-full flex flex-col gap-8 p-24">
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