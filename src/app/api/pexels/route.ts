import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const count = Math.min(Math.max(Number(searchParams.get("count") ?? "6"), 1), 80);
        const page = Math.floor(Math.random() * 50) + 1;

        const API_KEY = process.env.PEXELS_API_KEY;
        if (!API_KEY) {
            return NextResponse.json({ error: "Missing PEXELS_API_KEY" }, { status: 500 });
        }

        const url = `https://api.pexels.com/v1/search?query=evening%20clouds&per_page=${count}&page=${page}`;

        const res = await fetch(url, {
            headers: {
                Authorization: API_KEY,
            },
            // optional: avoid caching lower-quality CDN variants
            cache: "no-store",
        });

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json(
                { error: "Pexels error", details: text },
                { status: res.status }
            );
        }

        const data = await res.json();

interface PexelsPhoto {
    src: { original?: string; tiny?: string; small?: string };
    avg_color?: string;
    photographer?: string;
}

// ... (in the map function)
        const photos = (data.photos || []).map((p: PexelsPhoto) => ({
            src: p.src?.original,
            preview: p.src?.tiny || p.src?.small,
            avgColor: p.avg_color || "#000000",
            credit: p.photographer
                ? `${p.photographer} - Pexels`
                : "Pexels",
        }));

        return NextResponse.json({ photos });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}