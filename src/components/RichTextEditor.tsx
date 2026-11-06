'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
}

/** Latvian labels, four steps — matches the "font size can be changed" ask exactly, nothing more. */
const FONT_SIZES = [
  { label: 'Mazs', value: '12px' },
  { label: 'Parasts', value: '14px' },
  { label: 'Liels', value: '18px' },
  { label: 'Ļoti liels', value: '22px' },
];

/**
 * Ambient size for text that has no explicit per-span override — one tier up
 * from the scale above ('Parasts' → 'Liels'), so a freshly-typed document
 * reads larger by default rather than needing every line hand-sized.
 */
const DEFAULT_FONT_SIZE = '18px';

/**
 * Bold/italic/font-size only. Every other StarterKit extension (headings,
 * lists, code, links, …) is switched off so pasted-in formatting is
 * normalized away rather than smuggled through — see
 * specs/feature-document-templates.md §7.1.
 */
export default function RichTextEditor({ value, onChange, onBlur, readOnly = false }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      TextStyleKit.configure({
        backgroundColor: false,
        color: false,
        fontFamily: false,
        lineHeight: false,
      }),
    ],
    content: value,
    // Without this, ProseMirror's HTML parser collapses runs of spaces and
    // strips leading/trailing whitespace the way a browser renders them —
    // so an indented line typed here survives on screen (contenteditable
    // preserves it visually) but is silently lost the next time this
    // template is reopened and re-parsed from its saved HTML.
    parseOptions: { preserveWhitespace: 'full' },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class:
          'min-h-[16rem] max-w-none border border-gray-300 rounded-b px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 whitespace-pre-wrap',
        style: `font-size: ${DEFAULT_FONT_SIZE}`,
      },
    },
  });

  // `content` only seeds the editor at creation; the data this wraps (a
  // template or a statement) often arrives from an async fetch after first
  // mount, so an external `value` change has to be pushed in explicitly.
  // Skipped while the editor is focused so the doctor's own typing is never
  // overwritten by its own onUpdate round trip.
  useEffect(() => {
    if (!editor) return;
    if (!editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value, {
        emitUpdate: false,
        parseOptions: { preserveWhitespace: 'full' },
      });
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="min-h-[16rem] border border-gray-300 rounded animate-pulse bg-gray-50" />;
  }

  const currentFontSize = editor.getAttributes('textStyle').fontSize as string | undefined;

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center gap-1 border border-b-0 border-gray-300 rounded-t bg-gray-50 px-2 py-1">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Treknraksts (Ctrl+B)"
          >
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Slīpraksts (Ctrl+I)"
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <div className="w-px self-stretch bg-gray-300 mx-1" />
          <select
            value={currentFontSize ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) editor.chain().focus().setFontSize(v).run();
              else editor.chain().focus().unsetFontSize().run();
            }}
            className="text-sm border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Burtu izmērs</option>
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded flex items-center justify-center text-sm transition ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
