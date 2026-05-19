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

    const url = `https://api.pexels.com/v1/search?query=night&size=large&per_page=${count}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Pexels error", details: text }, { status: res.status });
    }

    const data = await res.json();
    const photos = (data.photos || []).map((p: any) => ({
      src: p.src?.landscape || p.src?.large2x || p.src?.original,
      credit: p.photographer ? `${p.photographer} - Pexels` : "Pexels",
    }));

    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
