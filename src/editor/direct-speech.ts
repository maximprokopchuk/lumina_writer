import { Extension, textInputRule } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    directSpeech: {
      formatDirectSpeech: () => ReturnType;
      setDialogueMode: (enabled: boolean) => ReturnType;
    };
  }
}

export type SpeechShortcut = 'mod-shift-enter' | 'alt-shift-d';
export function isSpeechShortcut(event: KeyboardEvent, shortcut: SpeechShortcut) {
  if (shortcut === 'alt-shift-d') return event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyD';
  return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && event.key === 'Enter';
}

export const DirectSpeech = Extension.create<Record<string, never>, { enabled: boolean }>({
  name: 'directSpeech', priority: 1100,
  addStorage() { return { enabled: false }; },
  addCommands() {
    return {
      formatDirectSpeech: () => ({ tr, dispatch }) => {
        const positions: { pos: number; prefix: string }[] = [];
        const { from, to, empty, $from } = tr.selection;
        const add = (pos: number, text: string) => {
          if (/^—[ \u00a0]/.test(text)) return;
          positions.push({ pos, prefix: text.match(/^[—–-](?:[ \u00a0]+|$)/)?.[0] || '' });
        };
        if (empty && $from.parent.type.name === 'paragraph') add($from.start(), $from.parent.textContent);
        else if (!empty) tr.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name === 'paragraph' && pos + 1 < to) add(pos + 1, node.textContent);
        });
        if (!positions.length) return false;
        if (dispatch) for (const { pos, prefix } of positions.reverse()) tr.insertText('— ', pos, pos + prefix.length);
        return true;
      },
      setDialogueMode: enabled => ({ tr, dispatch }) => {
        if (dispatch) { this.storage.enabled = enabled; tr.setMeta('dialogueMode', enabled); }
        return true;
      },
    };
  },
  addInputRules() { return [textInputRule({ find: /^-- $/, replace: '— ' })]; },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state;
        const { $from } = selection;
        if (!this.storage.enabled || !selection.empty || $from.parent.type.name !== 'paragraph') return false;
        const text = $from.parent.textContent;
        if (/^—[ \u00a0]*$/.test(text)) {
          return this.editor.chain().command(({ tr }) => {
            tr.delete($from.start(), $from.end()); return true;
          }).setDialogueMode(false).run();
        }
        if (!/^—[ \u00a0]/.test(text) || $from.parentOffset < 2) return false;
        return this.editor.chain().splitBlock().command(({ tr }) => {
          const start = tr.selection.$from.start();
          if (!/^—[ \u00a0]/.test(tr.selection.$from.parent.textContent)) tr.insertText('— ', start);
          return true;
        }).run();
      },
    };
  },
});
