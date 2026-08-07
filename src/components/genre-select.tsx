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
  className,
}: {
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <select
      name="genre"
      required={required}
      defaultValue={defaultValue ?? ""}
      className={className}
    >
      <option value="" disabled>
        Genre
      </option>
      {GENRES.map((genre) => (
        <option key={genre.value} value={genre.value}>
          {genre.label}
        </option>
      ))}
    </select>
  );
}
