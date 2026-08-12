import { ReactNode } from "react";
import { Eye, ThumbsUp, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BookCoverThumbnail } from "@/components/book-cover-thumbnail";

// 2800 -> "2.8K", 539 -> "539" — matches how every reading-platform list
// (this one included, per the reference layout) keeps engagement numbers
// glanceable instead of wrapping onto a second line at scale.
function formatCount(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

// The one row layout every book list in the app should use (discovery feed,
// rankings, profile, dashboard) — so the cover thumbnail (with its own
// fallback) always shows, and lists don't drift into their own bespoke
// markup. `meta`/`leading`/`trailing` cover the parts that legitimately
// differ per list (author byline vs. draft/published badge, rank number,
// stats vs. an edit action) without each page reinventing the row itself.
export function BookListItem({
  href,
  coverImageUrl,
  coverSize = "sm",
  title,
  isMature,
  meta,
  synopsis,
  leading,
  trailing,
  stats,
  rankBadge,
  saveButton,
}: {
  href: string;
  coverImageUrl: string | null;
  // "lg" for feature-style lists (rankings) where the cover carries more of
  // the row's visual weight; "sm" (default) for denser lists.
  coverSize?: "sm" | "lg";
  title: string;
  // Shown on every list surface (feed, rankings, search, profiles) — a
  // badge alone, not a filter; readers who haven't opted into anything
  // still see it, they just also know before clicking through.
  isMature?: boolean;
  meta?: ReactNode;
  // A short excerpt (already truncated by the caller) shown under meta/stats
  // — only worth the vertical space on lists using the larger cover.
  synopsis?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  // Views/likes/comments — shown wherever this is passed, not just on the
  // rankings page, as a small always-on incentive (same reasoning Wattpad's
  // own list rows use these for).
  stats?: { views: number; likes: number; comments: number };
  // "#12 in Horror" — omit this on the rankings page itself, where the
  // `leading` slot already shows the same rank as a large index number.
  rankBadge?: { rank: number; genreLabel: string };
  // A <SaveButton variant="icon" .../> — a separate slot from `trailing`
  // since it shows up on nearly every list (unlike trailing, which is
  // per-page bespoke content) and needs to sit above it, not replace it.
  saveButton?: ReactNode;
}) {
  return (
    <li
      className={`flex gap-4 p-4 ${coverSize === "lg" ? "items-start" : "items-center"}`}
    >
      {leading}
      <BookCoverThumbnail
        coverImageUrl={coverImageUrl}
        title={title}
        size={coverSize}
      />
      <div className="flex flex-1 items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={href}
              className="font-medium text-primary underline underline-offset-4 hover:text-accent"
            >
              {title}
            </Link>
            {isMature && (
              <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-destructive uppercase">
                Mature
              </span>
            )}
          </div>
          {rankBadge && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              #{rankBadge.rank} in {rankBadge.genreLabel}
            </p>
          )}
          {stats && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {formatCount(stats.views)}
                <span className="sr-only">views</span>
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                {formatCount(stats.likes)}
                <span className="sr-only">likes</span>
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {formatCount(stats.comments)}
                <span className="sr-only">comments</span>
              </span>
            </div>
          )}
          {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
          {synopsis && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {synopsis}
            </p>
          )}
        </div>
        {(saveButton || trailing) && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {saveButton}
            {trailing}
          </div>
        )}
      </div>
    </li>
  );
}
