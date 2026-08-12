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
import { GripVertical } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ChapterEditor } from "@/components/chapter-editor";
import { ChapterActionsMenu } from "@/components/chapter-actions-menu";
import { SaveWithLoading } from "@/components/save-with-loading";
import {
  updateChapter,
  deleteChapter,
  toggleChapterPublished,
  reorderChapters,
} from "@/app/[locale]/dashboard/books/[id]/chapters/actions";

type Chapter = {
  id: string;
  title: string;
  content: string | null;
  position: number;
  is_published: boolean;
};

function SortableChapterItem({
  chapter,
  bookId,
  bookIsPublished,
  locale,
}: {
  chapter: Chapter;
  bookId: string;
  bookIsPublished: boolean;
  locale: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id });

  const updateWithIds = updateChapter.bind(null, chapter.id, bookId, locale);
  const deleteWithIds = deleteChapter.bind(null, chapter.id, bookId, locale);
  const toggleWithIds = toggleChapterPublished.bind(
    null,
    chapter.id,
    bookId,
    locale,
    chapter.is_published,
  );

  return (
    <AccordionItem
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      value={chapter.id}
      className="rounded border px-4 space-between"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder "${chapter.title}" — drag, or focus and use arrow keys`}
          className="touch-none cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-1 items-center justify-between">
          <AccordionTrigger className="flex-1 hover:no-underline">
            <span className="flex items-baseline gap-2 text-left">
              <span className="text-sm text-muted-foreground">
                #{chapter.position}
              </span>
              <span className="font-medium">{chapter.title}</span>
              <span className="text-sm text-muted-foreground">
                {chapter.is_published ? "Published" : "Draft"}
              </span>
            </span>
          </AccordionTrigger>
          <div className="flex shrink-0 gap-2 text-sm">
            <ChapterActionsMenu
              chapterTitle={chapter.title}
              isPublished={chapter.is_published}
              viewLiveHref={
                chapter.is_published && bookIsPublished
                  ? `/books/${bookId}/chapters/${chapter.id}`
                  : null
              }
              onTogglePublished={toggleWithIds}
              onDelete={deleteWithIds}
            />
          </div>
        </div>
      </div>
      <AccordionContent className="space-y-2 pt-2">
        <form action={updateWithIds} className="space-y-2">
          <ChapterEditor
            draftKey={`chapter:${chapter.id}`}
            titleDefaultValue={chapter.title}
            contentDefaultValue={chapter.content ?? ""}
          />
          <SaveWithLoading />
        </form>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ChapterList({
  chapters,
  bookId,
  bookIsPublished,
  locale,
}: {
  chapters: Chapter[];
  bookId: string;
  bookIsPublished: boolean;
  locale: string;
}) {
  // Local display order, synced whenever the server sends fresh `chapters`
  // (e.g. after reorderChapters' revalidatePath lands) — kept separate from
  // the prop so a drag can update the list instantly instead of waiting on
  // a round trip. Adjusted during render (not an effect) per React's own
  // "adjusting state when a prop changes" pattern — safe here since
  // `chapters` is server-provided data, identical between SSR and
  // hydration, with no external-store divergence to worry about.
  const [items, setItems] = useState(chapters);
  const [syncedChapters, setSyncedChapters] = useState(chapters);
  if (chapters !== syncedChapters) {
    setSyncedChapters(chapters);
    setItems(chapters);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Without this, a click that starts on the grip handle (e.g. opening
      // a chapter via keyboard, or a stray click) can register as a
      // zero-distance drag — small threshold avoids that without hurting
      // real drags.
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    void reorderChapters(
      bookId,
      locale,
      reordered.map((c) => c.id),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <Accordion className="space-y-2">
          {items.map((chapter) => (
            <SortableChapterItem
              key={chapter.id}
              chapter={chapter}
              bookId={bookId}
              bookIsPublished={bookIsPublished}
              locale={locale}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}
