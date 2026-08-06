import { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { BookCoverThumbnail } from "@/components/book-cover-thumbnail";

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
}: {
  href: string;
  coverImageUrl: string | null;
  title: string;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
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
          {meta && (
            <p className="text-sm text-muted-foreground">{meta}</p>
          )}
        </div>
        {trailing}
      </div>
    </li>
  );
}
