"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import { CoverInput } from "@/components/cover-input";
import { SaveWithLoading } from "@/components/save-with-loading";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  createExternalBook,
  updateExternalBook,
  deleteExternalBook,
  reorderExternalBooks,
} from "@/app/[locale]/u/[username]/external-books-actions";

type ExternalBook = {
  id: string;
  cover_url: string | null;
  title: string;
  synopsis: string | null;
  buy_url: string;
};

// Caps how many an author can stack up here — this is meant to stay a
// highlight reel next to the free chapters, not grow into its own separate
// storefront wall.
const MAX_BOOKS = 6;

function BookForm({
  book,
  action,
  onDone,
}: {
  book?: ExternalBook;
  action: (formData: FormData) => void;
  onDone: () => void;
}) {
  return (
    <form
      action={(formData) => {
        action(formData);
        onDone();
      }}
      className="space-y-2 rounded border p-3"
    >
      <CoverInput
        name="cover"
        initialUrl={book?.cover_url ?? undefined}
        previewClassName="h-20 w-14 shrink-0 rounded border object-cover"
      />
      <input
        name="title"
        defaultValue={book?.title}
        required
        placeholder="Book title"
        className="w-full rounded border p-2 text-sm"
      />
      <textarea
        name="synopsis"
        defaultValue={book?.synopsis ?? ""}
        placeholder="A short synopsis (optional)"
        rows={2}
        className="w-full rounded border p-2 text-sm"
      />
      <input
        name="buy_url"
        type="url"
        defaultValue={book?.buy_url}
        required
        placeholder="https://amazon.com/dp/..."
        className="w-full rounded border p-2 text-sm"
      />
      <div className="flex gap-2">
        <SaveWithLoading label={book ? "Save changes" : "Add book"} />
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SortableBookRow({
  book,
  username,
  locale,
}: {
  book: ExternalBook;
  username: string;
  locale: string;
}) {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: book.id });

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
      >
        <BookForm
          book={book}
          action={updateExternalBook.bind(null, book.id, username, locale)}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="mb-2 flex items-start gap-2 rounded border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder "${book.title}"`}
        className="mt-1 shrink-0 cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="relative h-[63px] w-[42px] shrink-0 overflow-hidden rounded bg-muted">
        {book.cover_url && (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover"
            sizes="42px"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{book.title}</p>
        {book.synopsis && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {book.synopsis}
          </p>
        )}
        <p className="truncate text-xs text-primary">{book.buy_url}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit "${book.title}"`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form
          action={deleteExternalBook.bind(null, book.id, username, locale)}
        >
          <ConfirmSubmitButton
            confirmMessage={`Remove "${book.title}"? This can't be undone.`}
            ariaLabel={`Remove "${book.title}"`}
            className="text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}

export function ExternalBooksManager({
  books,
  username,
  locale,
}: {
  books: ExternalBook[];
  username: string;
  locale: string;
}) {
  const [items, setItems] = useState(books);
  const [syncedBooks, setSyncedBooks] = useState(books);
  if (books !== syncedBooks) {
    setSyncedBooks(books);
    setItems(books);
  }

  const [addingOpen, setAddingOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((b) => b.id === active.id);
    const newIndex = items.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    void reorderExternalBooks(
      username,
      locale,
      reordered.map((b) => b.id),
    );
  }

  return (
    <div className="mb-6">
      <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Published elsewhere
      </p>
      <p className="mb-2 text-xs text-muted-foreground">
        Cover, synopsis, and a buy link for books you sell outside Talehollow.
        Drag to reorder.
      </p>

      <DndContext
        id="external-books"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((book) => (
            <SortableBookRow
              key={book.id}
              book={book}
              username={username}
              locale={locale}
            />
          ))}
        </SortableContext>
      </DndContext>

      {items.length === 0 && !addingOpen && (
        <p className="mb-2 text-sm text-muted-foreground">
          Nothing here yet — add a book you sell elsewhere.
        </p>
      )}

      {addingOpen ? (
        <BookForm
          action={createExternalBook.bind(null, username, locale)}
          onDone={() => setAddingOpen(false)}
        />
      ) : (
        items.length < MAX_BOOKS && (
          <button
            type="button"
            onClick={() => setAddingOpen(true)}
            className="flex items-center gap-1 text-sm text-primary underline underline-offset-4"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add a book
          </button>
        )
      )}
    </div>
  );
}
