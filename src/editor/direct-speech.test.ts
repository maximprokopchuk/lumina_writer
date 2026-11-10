import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import { DirectSpeech, isSpeechShortcut } from './direct-speech';

let editor: Editor;
function create(content: string) {
  editor = new Editor({ extensions: [StarterKit, DirectSpeech], content });
  return editor;
}
afterEach(() => editor?.destroy());
const enter = () => editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

describe('direct speech', () => {
  it('prefixes every selected paragraph, preserves marks and text, and undoes as one action', () => {
    create('<p><strong>Первая</strong> реплика</p><p>Вторая реплика</p>');
    const initial = editor.getHTML();
    editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
    editor.commands.formatDirectSpeech();
    expect(editor.getHTML()).toBe('<p><strong>— Первая</strong> реплика</p><p>— Вторая реплика</p>');
    editor.commands.undo();
    expect(editor.getHTML()).toBe(initial);
  });
  it('prefixes the paragraph at the caret without inserting in the middle or duplicating a dash', () => {
    create('<p>Текст реплики</p>');
    editor.commands.setTextSelection(6);
    editor.commands.formatDirectSpeech(); editor.commands.formatDirectSpeech();
    expect(editor.getText()).toBe('— Текст реплики');
    expect(editor.state.selection.from).toBe(8);
  });
  it('does not modify the next paragraph when selection ends at its start', () => {
    create('<p>Один</p><p>Два</p>');
    editor.commands.setTextSelection({ from: 1, to: 7 });
    editor.commands.formatDirectSpeech();
    expect(editor.getHTML()).toBe('<p>— Один</p><p>Два</p>');
  });
  it('continues dialogue with Enter and exits on an empty reply', () => {
    create('<p>— Привет</p>');
    editor.commands.setDialogueMode(true); editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    enter();
    expect(editor.getHTML()).toBe('<p>— Привет</p><p>— </p>');
    enter();
    expect(editor.getHTML()).toBe('<p>— Привет</p><p></p>');
    expect(editor.storage.directSpeech.enabled).toBe(false);
  });
  it('leaves ordinary Enter and Shift+Enter unchanged outside dialogue mode', () => {
    create('<p>Обычный текст</p>'); editor.commands.setTextSelection(editor.state.doc.content.size - 1); enter();
    expect(editor.getHTML()).toBe('<p>Обычный текст</p><p></p>');
  });
  it('replaces -- and space only at the beginning of a paragraph', () => {
    create('<p>--</p>'); editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const { from, to } = editor.state.selection;
    editor.view.someProp('handleTextInput', handler => handler(editor.view, from, to, ' ', () => editor.state.tr));
    expect(editor.getText()).toBe('— ');
  });
  it('keeps Shift+Enter as a line break inside a dialogue paragraph', () => {
    create('<p>— Реплика</p>'); editor.commands.setDialogueMode(true);
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.getHTML()).toContain('<br>');
  });
  it('formats a long chapter without dropping paragraphs', () => {
    const count = 1500;
    create(Array.from({ length: count }, (_, index) => `<p>Абзац ${index} — длинная история.</p>`).join(''));
    editor.commands.selectAll(); editor.commands.formatDirectSpeech();
    expect(editor.state.doc.childCount).toBe(count);
    expect(editor.state.doc.firstChild?.textContent).toBe('— Абзац 0 — длинная история.');
    expect(editor.state.doc.lastChild?.textContent).toBe(`— Абзац ${count - 1} — длинная история.`);
    editor.commands.undo();
    expect(editor.state.doc.firstChild?.textContent).toBe('Абзац 0 — длинная история.');
  });
  it('recognizes configurable shortcuts on both keyboard modifier conventions', () => {
    expect(isSpeechShortcut(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, shiftKey: true }), 'mod-shift-enter')).toBe(true);
    expect(isSpeechShortcut(new KeyboardEvent('keydown', { code: 'KeyD', altKey: true, shiftKey: true }), 'alt-shift-d')).toBe(true);
    expect(isSpeechShortcut(new KeyboardEvent('keydown', { key: 'Enter' }), 'mod-shift-enter')).toBe(false);
  });
});
