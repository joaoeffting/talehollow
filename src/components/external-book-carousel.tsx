import Image from "next/image";
import { ExternalLink } from "lucide-react";

type ExternalBook = {
  id: string;
  cover_url: string | null;
  title: string;
  synopsis: string | null;
  buy_url: string;
};

// Read-only — visitors only ever see this, never the reorderable
// ExternalBooksManager (that's owner-only, swapped in by the page itself).
export function ExternalBookCarousel({ books }: { books: ExternalBook[] }) {
  if (books.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Published elsewhere
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {books.map((book) => (
          <a
            key={book.id}
            href={book.buy_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="w-[118px] shrink-0"
          >
            <div className="relative mb-1.5 aspect-2/3 w-[118px] overflow-hidden rounded-md shadow">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="118px"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
            <p className="line-clamp-2 text-xs leading-tight font-medium">
              {book.title}
            </p>
            {book.synopsis && (
              <p className="mb-1 line-clamp-2 text-[0.65rem] leading-tight text-muted-foreground">
                {book.synopsis}
              </p>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold text-accent-foreground">
              View on Amazon
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
