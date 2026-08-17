import { useState, useRef, useEffect, useCallback } from 'react';
import {
  List,
  CheckSquare,
  Heading2,
  Minus,
  AlignLeft,
} from 'lucide-react';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  showToolbar?: boolean;
  showWordCount?: boolean;
  className?: string;
  autoFocus?: boolean;
}

type FormatAction = 'bullet' | 'checklist' | 'heading' | 'divider' | 'numbered';

export function NotesEditor({
  value,
  onChange,
  placeholder = 'Start typing your notes...\n\nTip: Type "- " for bullets, "[] " for checklists',
  minRows = 5,
  maxRows = 20,
  showToolbar = true,
  showWordCount = true,
  className = '',
  autoFocus = false,
}: NotesEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const lineHeight = 24;
  const paddingY = 24;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minH = minRows * lineHeight + paddingY;
    const maxH = maxRows * lineHeight + paddingY;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.max(minH, Math.min(scrollH, maxH))}px`;
  }, [minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const getLineInfo = () => {
    const el = textareaRef.current;
    if (!el) return { lineStart: 0, lineEnd: 0, lineText: '', cursorInLine: 0 };
    const pos = el.selectionStart;
    const text = el.value;
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    let lineEnd = text.indexOf('\n', pos);
    if (lineEnd === -1) lineEnd = text.length;
    return {
      lineStart,
      lineEnd,
      lineText: text.slice(lineStart, lineEnd),
      cursorInLine: pos - lineStart,
    };
  };

  const insertAtCursor = (before: string, after = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.slice(start, end);
    const newText = text.slice(0, start) + before + selected + after + text.slice(end);
    onChange(newText);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = start + before.length + selected.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const insertAtLineStart = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { lineStart, lineText } = getLineInfo();
    const text = el.value;
    const stripped = lineText.replace(/^(\s*)([-*•]\s?|\d+\.\s?|\[[ x]\]\s?|#{1,3}\s?)?/, '$1');
    const indent = lineText.match(/^(\s*)/)?.[1] || '';
    const newLine = indent + prefix + stripped;
    const newText = text.slice(0, lineStart) + newLine + text.slice(lineStart + lineText.length);
    onChange(newText);
    requestAnimationFrame(() => {
      el.focus();
      const newPos = lineStart + indent.length + prefix.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const handleFormat = (action: FormatAction) => {
    switch (action) {
      case 'bullet':
        insertAtLineStart('- ');
        break;
      case 'numbered': {
        const { lineStart } = getLineInfo();
        const text = textareaRef.current?.value || '';
        const linesBefore = text.slice(0, lineStart).split('\n');
        let num = 1;
        for (let i = linesBefore.length - 2; i >= 0; i--) {
          const match = linesBefore[i].match(/^\s*(\d+)\.\s/);
          if (match) { num = parseInt(match[1]) + 1; break; }
          if (linesBefore[i].trim() === '') break;
        }
        insertAtLineStart(`${num}. `);
        break;
      }
      case 'checklist':
        insertAtLineStart('[ ] ');
        break;
      case 'heading':
        insertAtLineStart('## ');
        break;
      case 'divider':
        insertAtCursor('\n---\n');
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Tab / Shift+Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = el.value;

      if (start === end) {
        if (e.shiftKey) {
          const { lineStart, lineText } = getLineInfo();
          if (lineText.startsWith('  ')) {
            const newText = text.slice(0, lineStart) + lineText.slice(2) + text.slice(lineStart + lineText.length);
            onChange(newText);
            requestAnimationFrame(() => {
              el.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, start - 2));
            });
          }
        } else {
          const newText = text.slice(0, start) + '  ' + text.slice(end);
          onChange(newText);
          requestAnimationFrame(() => {
            el.setSelectionRange(start + 2, start + 2);
          });
        }
      }
      return;
    }

    // Enter key: auto-continue lists
    if (e.key === 'Enter') {
      const { lineText } = getLineInfo();
      const indent = lineText.match(/^(\s*)/)?.[1] || '';

      // Bullet list continuation
      const bulletMatch = lineText.match(/^(\s*)([-*•])\s/);
      if (bulletMatch) {
        const content = lineText.replace(/^(\s*)([-*•])\s/, '');
        if (content.trim() === '') {
          // Empty bullet — remove it and stop list
          e.preventDefault();
          const { lineStart, lineEnd } = getLineInfo();
          const text = el.value;
          const newText = text.slice(0, lineStart) + '\n' + text.slice(lineEnd);
          onChange(newText);
          requestAnimationFrame(() => {
            el.setSelectionRange(lineStart + 1, lineStart + 1);
          });
          return;
        }
        e.preventDefault();
        insertAtCursor(`\n${indent}${bulletMatch[2]} `);
        return;
      }

      // Numbered list continuation
      const numMatch = lineText.match(/^(\s*)(\d+)\.\s/);
      if (numMatch) {
        const content = lineText.replace(/^(\s*)\d+\.\s/, '');
        if (content.trim() === '') {
          e.preventDefault();
          const { lineStart, lineEnd } = getLineInfo();
          const text = el.value;
          const newText = text.slice(0, lineStart) + '\n' + text.slice(lineEnd);
          onChange(newText);
          requestAnimationFrame(() => {
            el.setSelectionRange(lineStart + 1, lineStart + 1);
          });
          return;
        }
        e.preventDefault();
        const nextNum = parseInt(numMatch[2]) + 1;
        insertAtCursor(`\n${indent}${nextNum}. `);
        return;
      }

      // Checklist continuation
      const checkMatch = lineText.match(/^(\s*)\[[ x]\]\s/);
      if (checkMatch) {
        const content = lineText.replace(/^(\s*)\[[ x]\]\s/, '');
        if (content.trim() === '') {
          e.preventDefault();
          const { lineStart, lineEnd } = getLineInfo();
          const text = el.value;
          const newText = text.slice(0, lineStart) + '\n' + text.slice(lineEnd);
          onChange(newText);
          requestAnimationFrame(() => {
            el.setSelectionRange(lineStart + 1, lineStart + 1);
          });
          return;
        }
        e.preventDefault();
        insertAtCursor(`\n${indent}[ ] `);
        return;
      }
    }

    // Toggle checkbox on click-like behavior: Ctrl/Cmd+Enter toggles current line checkbox
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const { lineStart, lineText } = getLineInfo();
      const text = el.value;
      let newLine = lineText;
      if (lineText.includes('[ ]')) {
        newLine = lineText.replace('[ ]', '[x]');
      } else if (lineText.includes('[x]')) {
        newLine = lineText.replace('[x]', '[ ]');
      }
      if (newLine !== lineText) {
        const newText = text.slice(0, lineStart) + newLine + text.slice(lineStart + lineText.length);
        onChange(newText);
      }
    }
  };

  // Render preview-style lines for checklists
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const toolbarButtons: { action: FormatAction; icon: typeof List; label: string }[] = [
    { action: 'bullet', icon: List, label: 'Bullet list' },
    { action: 'numbered', icon: AlignLeft, label: 'Numbered list' },
    { action: 'checklist', icon: CheckSquare, label: 'Checklist' },
    { action: 'heading', icon: Heading2, label: 'Heading' },
    { action: 'divider', icon: Minus, label: 'Divider' },
  ];

  return (
    <div className={`notes-editor-wrapper ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div
          className={`flex items-center gap-1 px-3 py-2 rounded-t-xl border border-b-0 transition-colors ${
            isFocused
              ? 'border-violet-300 bg-violet-50/50 dark:border-violet-500/50 dark:bg-violet-500/5'
              : 'border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]'
          }`}
        >
          {toolbarButtons.map(({ action, icon: Icon, label }) => (
            <button
              key={action}
              type="button"
              onClick={() => handleFormat(action)}
              title={label}
              aria-label={label}
              className={`p-3 sm:p-2 rounded-lg transition-colors ${
                'text-slate-400 hover:text-violet-600 hover:bg-violet-50 active:bg-violet-100 dark:text-gray-500 dark:hover:text-violet-400 dark:hover:bg-violet-500/10 dark:active:bg-violet-500/20'
              }`}
            >
              <Icon size={18} className="sm:w-[15px] sm:h-[15px]" />
            </button>
          ))}

          <div className={`mx-1 sm:mx-2 w-px h-4 bg-slate-200 dark:bg-white/10`} />

          <span className={`text-xs tracking-wider uppercase font-medium hidden sm:inline text-slate-400 dark:text-gray-600`}>
            Markdown
          </span>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`notes-editor-textarea w-full px-4 py-3 transition-colors resize-none leading-6 text-sm ${
          showToolbar ? 'rounded-b-xl border border-t-0' : 'rounded-xl border'
        } ${
          isFocused
            ? 'border-violet-300 bg-white dark:border-violet-500/50 dark:bg-white/[0.03]'
            : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5'
        } text-slate-800 placeholder-slate-400 dark:text-white dark:placeholder-gray-600`}
        style={{
          minHeight: `${minRows * lineHeight + paddingY}px`,
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
          fontSize: '16px',
          lineHeight: '26px',
          tabSize: 2,
        }}
      />

      {/* Footer: word count & shortcuts hint */}
      {showWordCount && (
        <div className={`flex items-center justify-between px-3 py-2 text-slate-400 dark:text-gray-600`}>
          <div className="flex items-center gap-3">
            <span className="text-xs">
              {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount} chars
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <kbd className={`text-xs px-1 py-1 rounded bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500`}>Tab</kbd>
            <span className="text-xs">indent</span>
            <kbd className={`text-xs px-1 py-1 rounded bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-gray-500`}>⌘↵</kbd>
            <span className="text-xs">toggle check</span>
          </div>
        </div>
      )}
    </div>
  );
}
