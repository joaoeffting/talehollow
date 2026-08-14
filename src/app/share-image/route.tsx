import { ImageResponse } from "next/og";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { SITE_URL } from "@/lib/site";

// Capped well below what could visibly overflow the card — this is a
// public, unauthenticated endpoint, so it also doubles as a cheap guard
// against someone passing an enormous `text` to force a slow/huge render.
const MAX_QUOTE_LENGTH = 400;

const CARD_BG = "#fbf7f0";
const CARD_TEXT = "#1a1a1a";
const NAVY = "#1e3a5f";
const GOLD = "#c9932e";
const MUTED = "#5c5648";
const BORDER = "#e5dfd3";

function quoteFontSize(length: number) {
  if (length <= 80) return 46;
  if (length <= 150) return 38;
  if (length <= 250) return 32;
  return 26;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const rawText = searchParams.get("text");

  if (!bookId || !rawText) {
    return NextResponse.json(
      { error: "bookId and text are required" },
      { status: 400 },
    );
  }

  const text = rawText.trim().slice(0, MAX_QUOTE_LENGTH);
  if (!text) {
    return NextResponse.json({ error: "text can't be empty" }, { status: 400 });
  }

  const supabase = await createClient();
  // Same RLS the book/chapter pages already read under — an unpublished or
  // nonexistent book just 404s here instead of leaking its title/cover
  // through a share image.
  const { data: book } = await supabase
    .from("books")
    .select("title, cover_image_url, profiles!books_author_id_fkey(display_name, username)")
    .eq("id", bookId)
    .eq("is_published", true)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const authorName = book.profiles?.display_name ?? book.profiles?.username;
  const siteHost = SITE_URL.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            width={1080}
            height={1350}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", backgroundColor: NAVY }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.7))",
          }}
        />
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: CARD_BG,
              borderRadius: 24,
              padding: "56px 48px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              maxWidth: 900,
            }}
          >
            <div style={{ display: "flex", fontSize: 72, lineHeight: 1, color: GOLD }}>
              &ldquo;
            </div>
            <div
              style={{
                display: "flex",
                fontSize: quoteFontSize(text.length),
                lineHeight: 1.4,
                color: CARD_TEXT,
                marginTop: 8,
              }}
            >
              {text}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 32,
                paddingTop: 24,
                borderTop: `2px solid ${BORDER}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: NAVY }}>
                {book.title}
              </div>
              {authorName && (
                <div style={{ display: "flex", fontSize: 22, color: MUTED, marginTop: 4 }}>
                  by {authorName}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 40,
              padding: "14px 28px",
              borderRadius: 999,
              // Navy, not a generic dark pill — matches the app's own
              // primary brand color (see :root in globals.css) instead of
              // looking like a plain contrast overlay. Still guarantees
              // legibility regardless of what's behind it, same reasoning
              // as before, just styled to look like Talehollow rather than
              // an anonymous badge.
              backgroundColor: NAVY,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              fontSize: 26,
            }}
          >
            <div style={{ display: "flex", color: CARD_BG, marginRight: 8 }}>
              Read this and more at
            </div>
            <div style={{ display: "flex", fontWeight: 700, color: GOLD }}>
              {siteHost}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        // Deterministic per (bookId, text) — safe to cache at the edge/CDN
        // so repeated shares of the same quote don't re-render each time.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
