import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useTheme } from '../../context/ThemeContext';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, List, ListOrdered,
  CheckSquare, Code, Minus, Undo, Redo,
} from 'lucide-react';

/**
 * How much empty space to reserve before any text is typed.
 *
 * `tall` reserved 250px on desktop, which was fine for a page-sized writing
 * surface but meant a compact dialog spent most of its height on an empty notes
 * box — in the task editor it pushed Priority, Effort and the save button below
 * the fold. `compact` is the default because most call sites are dialogs; the
 * field still grows without limit as soon as there is content to show.
 */
type EditorSize = 'compact' | 'tall';

const MIN_HEIGHTS: Record<EditorSize, string> = {
  compact: 'min-h-[120px]',
  tall: 'min-h-[150px] md:min-h-[250px]',
};

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  size?: EditorSize;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  size = 'compact',
}: TiptapEditorProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `tiptap-content outline-none ${MIN_HEIGHTS[size]} px-4 py-3 text-sm leading-relaxed`,
      },
    },
  });

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-2 sm:p-2 rounded-lg transition-colors ${
      active
        ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
        : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`;

  const iconSize = 16;

  return (
    <div className={`tiptap-editor rounded-xl border transition-colors ${
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
    } ${className}`}>
      {/* Toolbar — one scrolling row rather than wrapping. Wrapping cost a second
          36px row in any narrow dialog, and every button stays reachable this way. */}
      <div className={`flex items-center gap-1 px-2 py-2 border-b flex-nowrap overflow-x-auto ${
        isDark ? 'border-white/10' : 'border-slate-100'
      }`}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold"
 aria-label="Bold">
          <Bold size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic"
 aria-label="Italic">
          <Italic size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive('underline'))} title="Underline"
 aria-label="Underline">
          <UnderlineIcon size={iconSize} />
        </button>

        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnCls(editor.isActive('heading', { level: 2 }))} title="Heading">
          <Heading2 size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List"
 aria-label="Bullet List">
          <List size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Numbered List"
 aria-label="Numbered List">
          <ListOrdered size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnCls(editor.isActive('taskList'))} title="Checklist"
 aria-label="Checklist">
          <CheckSquare size={iconSize} />
        </button>

        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnCls(editor.isActive('codeBlock'))} title="Code Block"
 aria-label="Code Block">
          <Code size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnCls(false)} title="Divider"
 aria-label="Divider">
          <Minus size={iconSize} />
        </button>

        {/* A `flex-1` spacer used to push these two to the right, which in a narrow
            dialog left no room for them and wrapped them onto a row of their own. A
            divider keeps them read as a separate group without costing that row. */}
        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btnCls(false)} disabled:opacity-30`} title="Undo"
 aria-label="Undo">
          <Undo size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btnCls(false)} disabled:opacity-30`} title="Redo"
 aria-label="Redo">
          <Redo size={iconSize} />
        </button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
