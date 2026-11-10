import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { memo, useEffect, useRef } from 'react';
import { DirectSpeech, isSpeechShortcut } from '../editor/direct-speech';
import { useEditorPreferences } from '../editor/preferences';
import EditorToolbar from './EditorToolbar';

interface EditorProps { content: string; documentKey: string; onChange: (content: string) => void }
interface Position { from: number; to: number; scrollTop: number }

function Editor({ content, documentKey, onChange }: EditorProps) {
  const lastContent = useRef(content);
  const position = useRef<Position>({ from: 1, to: 1, scrollTop: 0 });
  const restoring = useRef(false);
  const storageKey = `lumina:position:${documentKey}`;
  const editor = useEditor({
    extensions: [StarterKit, Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Начните писать свою историю…' }), DirectSpeech],
    content,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      lastContent.current = html;
      onChange(html);
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (!restoring.current) {
        position.current = { ...position.current, from: current.state.selection.from, to: current.state.selection.to };
        try { sessionStorage.setItem(storageKey, JSON.stringify(position.current)); } catch { /* Optional navigation state. */ }
      }
    },
    editorProps: {
      attributes: { class: 'focus:outline-none min-h-[70vh] font-serif text-[17px] md:text-[18px] leading-[1.85]', 'aria-label': 'Текст главы', role: 'textbox', 'aria-multiline': 'true' },
      handleKeyDown: (view, event) => {
        if (!isSpeechShortcut(event, useEditorPreferences.getState().shortcut)) return false;
        event.preventDefault();
        editor?.commands.formatDirectSpeech();
        return true;
      },
    },
  });
  useEffect(() => {
    if (!editor || content === lastContent.current) return;
    const selection = editor.state.selection;
    const main = editor.view.dom.closest('main'); const scroll = main?.scrollTop;
    restoring.current = true;
    editor.commands.setContent(content, false);
    const end = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: Math.min(selection.from, end), to: Math.min(selection.to, end) });
    lastContent.current = content;
    restoring.current = false;
    if (main && scroll !== undefined) main.scrollTop = scroll;
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    const main = editor.view.dom.closest('main');
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Position | null;
      if (saved && [saved.from, saved.to, saved.scrollTop].every(Number.isFinite)) {
        position.current = saved;
        restoring.current = true;
        const end = editor.state.doc.content.size;
        editor.commands.setTextSelection({ from: Math.max(1, Math.min(saved.from, end)), to: Math.max(1, Math.min(saved.to, end)) });
        restoring.current = false;
      }
    } catch { /* A missing or malformed bookmark must never prevent opening a chapter. */ }
    const frame = requestAnimationFrame(() => { if (main) main.scrollTop = position.current.scrollTop; });
    let timer: ReturnType<typeof setTimeout>;
    const persist = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(position.current)); } catch { /* Optional. */ } };
    const scroll = () => {
      if (main) position.current.scrollTop = main.scrollTop;
      clearTimeout(timer); timer = setTimeout(persist, 150);
    };
    main?.addEventListener('scroll', scroll, { passive: true });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); persist(); main?.removeEventListener('scroll', scroll); };
  }, [editor, storageKey]);

  if (!editor) return null;
  return (
    <div className="editor-shell flex w-full flex-col rounded-xl border border-stone-200 bg-white shadow-sm">
      <EditorToolbar editor={editor} />
      <div className="px-5 py-8 md:px-12 md:py-10"><EditorContent editor={editor} /></div>
    </div>
  );
}
export default memo(Editor);
