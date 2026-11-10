import { Editor, useEditorState } from '@tiptap/react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Quote, HelpCircle, MessagesSquare } from 'lucide-react';
import { useEditorPreferences } from '../editor/preferences';
import type { SpeechShortcut } from '../editor/direct-speech';

export default function EditorToolbar({ editor }: { editor: Editor }) {
  const shortcut = useEditorPreferences(s => s.shortcut);
  const state = useEditorState({ editor, selector: ({ editor: e }) => ({
    bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'),
    center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }),
    dialogue: !!e.storage.directSpeech?.enabled,
  }) });
  const buttons = [
    { label: 'Жирный', Icon: Bold, active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Курсив', Icon: Italic, active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Подчёркнутый', Icon: Underline, active: state.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'По левому краю', Icon: AlignLeft, active: !state.center && !state.right, run: () => editor.chain().focus().setTextAlign('left').run() },
    { label: 'По центру', Icon: AlignCenter, active: state.center, run: () => editor.chain().focus().setTextAlign('center').run() },
    { label: 'По правому краю', Icon: AlignRight, active: state.right, run: () => editor.chain().focus().setTextAlign('right').run() },
  ];
  const toggleDialogue = () => {
    const next = !state.dialogue;
    const chain = editor.chain().focus().setDialogueMode(next);
    // Formatting an already-prefixed paragraph is a no-op, not a failed command chain.
    if (next) chain.command(({ commands }) => { commands.formatDirectSpeech(); return true; });
    chain.run();
  };
  return (
    <div className="editor-toolbar sticky top-0 z-20 rounded-t-xl border-b border-stone-200 bg-white/95 px-2 py-2 backdrop-blur-sm">
      <div role="group" aria-label="Форматирование текста" className="flex flex-wrap items-center gap-1">
        {buttons.map(({ label, Icon, active, run }) => (
          <button key={label} onMouseDown={e => e.preventDefault()} onClick={run} title={label} aria-label={label} aria-pressed={active}
            className={`rounded-md p-2 transition-colors hover:bg-stone-100 ${active ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}><Icon size={17} /></button>
        ))}
        <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden="true" />
        <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().formatDirectSpeech().run()}
          title="Добавить тире в начало выбранных абзацев" className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-stone-700 hover:bg-stone-100">
          <Quote size={16} /><span>Прямая речь</span>
        </button>
        <button onMouseDown={e => e.preventDefault()} onClick={toggleDialogue} aria-pressed={state.dialogue}
          title="Продолжать реплики по Enter" className={`inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm ${state.dialogue ? 'bg-amber-100 text-amber-900' : 'text-stone-600 hover:bg-stone-100'}`}>
          <MessagesSquare size={16} /><span>Диалог</span>
        </button>
        <details className="relative ml-auto">
          <summary aria-label="Настройки прямой речи" className="cursor-pointer list-none rounded-md p-2 text-stone-500 hover:bg-stone-100"><HelpCircle size={17} /></summary>
          <div className="absolute right-0 top-10 z-30 w-72 space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-lg">
            <p>В начале абзаца наберите <kbd>--</kbd> и пробел, чтобы получить тире.</p>
            <p>В режиме диалога Enter продолжает реплику. Enter на пустой реплике завершает режим.</p>
            <label className="block space-y-1"><span>Горячая клавиша прямой речи</span>
              <select value={shortcut} onChange={e => useEditorPreferences.getState().setShortcut(e.target.value as SpeechShortcut)} className="w-full rounded border border-stone-300 bg-white p-2">
                <option value="mod-shift-enter">Ctrl / ⌘ + Shift + Enter</option>
                <option value="alt-shift-d">Alt / ⌥ + Shift + D</option>
              </select>
            </label>
          </div>
        </details>
      </div>
    </div>
  );
}
