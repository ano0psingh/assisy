import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TiptapViewerProps {
  content: string;
  className?: string;
  collapsible?: boolean;
  maxHeight?: number;
}

function isPlainText(content: string): boolean {
  return !content.startsWith('<');
}

function wrapPlainText(text: string): string {
  return text
    .split('\n')
    .map(line => `<p>${line || '<br>'}</p>`)
    .join('');
}

export function TiptapViewer({
  content,
  className = '',
  collapsible = false,
  maxHeight = 80,
}: TiptapViewerProps) {
  const [expanded, setExpanded] = useState(false);

  const html = isPlainText(content) ? wrapPlainText(content) : content;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
    ],
    content: html,
    editable: false,
    editorProps: {
      attributes: {
        'aria-label': 'Rich text content',
      },
    },
  });

  if (!editor || !content) return null;

  return (
    <div className={`tiptap-viewer ${className}`}>
      <div
        className={`tiptap-content max-w-[65ch] overflow-hidden text-sm leading-relaxed ${
          collapsible && !expanded ? '' : ''
        } text-[var(--ink-secondary)]`}
        style={collapsible && !expanded ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      {collapsible && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex min-h-11 items-center gap-1 text-xs font-medium text-[var(--action)] hover:text-[var(--action-hover)]"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
