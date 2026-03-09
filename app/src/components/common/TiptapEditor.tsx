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

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
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
        class: 'tiptap-content outline-none min-h-[120px] px-4 py-3 text-sm leading-relaxed',
      },
    },
  });

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-2 sm:p-1.5 rounded-lg transition-colors ${
      active
        ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
        : isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
    }`;

  const iconSize = 16;

  return (
    <div className={`tiptap-editor rounded-xl border transition-colors ${
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
    } ${className}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-0.5 px-2 py-1.5 border-b flex-wrap ${
        isDark ? 'border-white/10' : 'border-slate-100'
      }`}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnCls(editor.isActive('bold'))} title="Bold">
          <Bold size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnCls(editor.isActive('italic'))} title="Italic">
          <Italic size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnCls(editor.isActive('underline'))} title="Underline">
          <UnderlineIcon size={iconSize} />
        </button>

        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnCls(editor.isActive('heading', { level: 2 }))} title="Heading">
          <Heading2 size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnCls(editor.isActive('bulletList'))} title="Bullet List">
          <List size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnCls(editor.isActive('orderedList'))} title="Numbered List">
          <ListOrdered size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btnCls(editor.isActive('taskList'))} title="Checklist">
          <CheckSquare size={iconSize} />
        </button>

        <div className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={btnCls(editor.isActive('codeBlock'))} title="Code Block">
          <Code size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnCls(false)} title="Divider">
          <Minus size={iconSize} />
        </button>

        <div className="flex-1" />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={`${btnCls(false)} disabled:opacity-30`} title="Undo">
          <Undo size={iconSize} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={`${btnCls(false)} disabled:opacity-30`} title="Redo">
          <Redo size={iconSize} />
        </button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
