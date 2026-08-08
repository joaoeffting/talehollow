export const GENRES = [
  { value: "fantasy", label: "Fantasy" },
  { value: "science-fiction", label: "Science Fiction" },
  { value: "romance", label: "Romance" },
  { value: "mystery", label: "Mystery" },
  { value: "thriller", label: "Thriller" },
  { value: "horror", label: "Horror" },
  { value: "historical-fiction", label: "Historical Fiction" },
  { value: "literary-fiction", label: "Literary Fiction" },
  { value: "young-adult", label: "Young Adult" },
  { value: "fanfiction", label: "Fanfiction" },
  { value: "adventure", label: "Adventure" },
  { value: "drama", label: "Drama" },
  { value: "comedy", label: "Comedy" },
  { value: "poetry", label: "Poetry" },
  { value: "non-fiction", label: "Non-Fiction" },
];

export function genreLabelFor(genre: string) {
  return GENRES.find((g) => g.value === genre)?.label ?? genre;
}

export function GenreSelect({
  defaultValue,
  required,
  allowAll,
  className,
}: {
  defaultValue?: string;
  required?: boolean;
  // Makes the empty option a real, selectable "All genres" choice instead of
  // an unselectable placeholder — for filters (e.g. search) where "no genre
  // picked" is a valid, clearable state, unlike book creation/editing where
  // a genre is mandatory.
  allowAll?: boolean;
  className?: string;
}) {
  return (
    <select
      name="genre"
      required={required}
      defaultValue={defaultValue ?? ""}
      className={className}
    >
      <option value="" disabled={!allowAll}>
        {allowAll ? "All genres" : "Genre"}
      </option>
      {GENRES.map((genre) => (
        <option key={genre.value} value={genre.value}>
          {genre.label}
        </option>
      ))}
    </select>
  );
}
