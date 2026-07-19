"use client";

import { useRef } from "react";
import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
} from "lucide-react";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 ${active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  // Subscribing via useEditorState (rather than reading editor.isActive(...)
  // straight in the JSX) is what makes the pressed states re-render — Tiptap
  // mutates its document outside React, so nothing here would otherwise
  // update as the selection/marks change.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      strike: editor?.isActive("strike") ?? false,
      heading2: editor?.isActive("heading", { level: 2 }) ?? false,
      heading3: editor?.isActive("heading", { level: 3 }) ?? false,
      bulletList: editor?.isActive("bulletList") ?? false,
      orderedList: editor?.isActive("orderedList") ?? false,
      blockquote: editor?.isActive("blockquote") ?? false,
      code: editor?.isActive("code") ?? false,
    }),
  }) ?? {
    // useEditorState's return type is unioned with `null` whenever the
    // `editor` option's type includes null (regardless of what the selector
    // itself returns) — the selector above never actually produces null.
    bold: false,
    italic: false,
    strike: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    code: false,
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 border-b p-1.5">
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={state.heading2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state.heading3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // StarterKit bundles the common building blocks (bold, italic, headings,
  // lists, etc.) so you're not assembling a rich-text editor extension by
  // extension for a v1.
  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultValue ?? "",
    immediatelyRender: false, // avoids a hydration mismatch on first render in the App Router
    // `EditorContent`'s className lands on a wrapper div, not on the actual
    // .ProseMirror contenteditable element (see the .ProseMirror rule in
    // globals.css) — editorProps.attributes is the supported way to put a
    // class on editor.view.dom itself, which is what `prose` needs to apply
    // to for headings/lists/blockquotes to render with any distinguishing
    // style at all (Tailwind's Preflight strips their default appearance).
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none",
      },
    },
    // Tiptap owns its document state internally — it doesn't touch the
    // hidden <input> below on its own, and it never re-renders this
    // component to give React a chance to either. Without this, the hidden
    // input keeps whatever value it had at mount forever, so every save
    // silently persists the chapter's *old* content no matter what was
    // typed. Writing straight to the ref on every keystroke keeps the form
    // in sync without a setState (and the re-render that would trigger).
    onUpdate: ({ editor }) => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = editor.getHTML();
      }
    },
  });

  return (
    <div className="rounded border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {/* Tiptap manages its own internal document state — it isn't a plain
          <textarea>, so a surrounding <form> has nothing to submit unless we
          mirror the current HTML into a hidden field the form actually owns.
          `defaultValue` (uncontrolled), not `value` — a controlled `value`
          would fight the manual writes above on every re-render. */}
      <input
        ref={hiddenInputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}
