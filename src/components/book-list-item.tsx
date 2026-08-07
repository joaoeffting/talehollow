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
  title,
  meta,
  leading,
  trailing,
  stats,
  rankBadge,
}: {
  href: string;
  coverImageUrl: string | null;
  title: string;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  // Views/likes/comments — shown wherever this is passed, not just on the
  // rankings page, as a small always-on incentive (same reasoning Wattpad's
  // own list rows use these for).
  stats?: { views: number; likes: number; comments: number };
  // "#12 in Horror" — omit this on the rankings page itself, where the
  // `leading` slot already shows the same rank as a large index number.
  rankBadge?: { rank: number; genreLabel: string };
}) {
  return (
    <li className="flex items-center gap-4 p-4">
      {leading}
      <BookCoverThumbnail coverImageUrl={coverImageUrl} title={title} />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div>
          <Link
            href={href}
            className="font-medium text-primary underline underline-offset-4 hover:text-accent"
          >
            {title}
          </Link>
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
        </div>
        {trailing}
      </div>
    </li>
  );
}
