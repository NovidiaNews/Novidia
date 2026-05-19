"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const QUOTES = [
    "Nie poddawaj się; każdy krok, nawet najmniejszy, zbliża cię do upragnionego celu.",
    "Trudności są szansą — ucz się z nich i idź dalej z podniesioną głową.",
    "Wytrwałość potrafi przemienić marzenia w rzeczywistość, daj sobie czas i wiarę.",
    "Zacznij tam, gdzie jesteś, z tym, co masz — ruch naprzód ma znaczenie każdego dnia.",
    "Każdy nowy dzień to przestrzeń na odważne decyzje i małe zwycięstwa, z których wyrasta wielki sukces.",
];

export default function NotFound() {
    const [image, setImage] = useState<{ src?: string; credit?: string }>({});
    const [quote, setQuote] = useState(QUOTES[0]);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/pexels?count=8");
                if (!res.ok) throw new Error("Pexels API error");
                const data = await res.json();
                const photos = data.photos || [];
                if (photos.length) {
                    setImage(photos[Math.floor(Math.random() * photos.length)]);
                }
                setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
            } catch (err) {
                console.error(err);
            }
        }
        load();
    }, []);

    return (
        <div className="w-full h-screen absolute inset-0">
            <main className="relative w-full h-screen flex flex-row gap-6 p-4 pt-25">
                <div className="w-full h-full rounded-2xl bg-zinc-50 overflow-hidden relative">
                    <div className="relative inset-0 flex flex-col items-stretch h-full w-full ">
                        <div className="z-10 flex w-full h-full flex-col justify-between items-center p-4">
                            <div className="w-full h-fit flex items-center justify-start p-4 relative">
                                <h1 className="text-sm font-medium font-montserrat text-zinc-200">{image.credit ?? "Pexels"}</h1>
                            </div>
                            <div className="w-full h-fit flex items-center justify-start p-4 relative">
                                <p className="text-4xl font-bold text-zinc-200 font-fraunces text-shadow-lg">{quote}</p>
                            </div>
                        </div>

                        <div className="z-0 absolute inset-0 w-full h-full">
                            <div className="relative w-full h-full">
                                {image.src ? (
                                    <Image src={image.src} loading="eager" alt="Image for the 404 page" fill className="object-cover" priority />
                                ) : (
                                    <div className="w-full h-full from-zinc-900 to-zinc-950" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full h-full rounded-2xl bg-zinc-50 flex items-center justify-center">
                    <div className="w-full max-w-lg p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">404</p>
                        <h1 className="mt-4 text-5xl font-bold tracking-tight text-main font-fraunces">Ta strona nie istnieje :(</h1>
                        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">Sprawdź adres URL lub wróć na stronę główną, aby kontynuować.</p>
                        <Link href="/" className="mt-10 inline-flex w-full max-w-xs items-center justify-center rounded-md bg-main px-5 py-3 text-sm font-semibold text-white transition hover:bg-lighter">
                            ← Powrót na stronę główną
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
