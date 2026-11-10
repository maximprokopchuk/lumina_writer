import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Editor as TiptapEditor } from '@tiptap/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Editor from './Editor';

let root: Root;
let host: HTMLElement;
let current: TiptapEditor;
const content = '<p>Первая реплика</p><p>Вторая реплика</p>';
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sessionStorage.clear();
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
  host = document.createElement('main'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
async function mount(onChange = vi.fn(), documentKey = 'test') {
  await act(async () => root.render(<Editor key={documentKey} documentKey={documentKey} content={content} onChange={onChange} />));
  current = (host.querySelector('.ProseMirror') as HTMLElement & { editor: TiptapEditor }).editor;
  return onChange;
}

it('formats selected text through the toolbar and keeps the toolbar in the sticky container', async () => {
  const change = await mount();
  expect(host.querySelector('.editor-toolbar')?.classList.contains('sticky')).toBe(true);
  act(() => current.commands.selectAll());
  const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Прямая речь')!;
  await act(async () => button.click());
  expect(current.getText()).toContain('— Первая реплика');
  expect(current.getText()).toContain('— Вторая реплика');
  expect(change).toHaveBeenCalledOnce();
});

it('does not serialize the entire chapter again when React receives the emitted HTML', async () => {
  const change = await mount();
  const serialize = vi.spyOn(current, 'getHTML');
  act(() => current.commands.insertContent('Новое '));
  const emitted = change.mock.calls[0][0];
  await act(async () => root.render(<Editor key="test" documentKey="test" content={emitted} onChange={change} />));
  expect(serialize).toHaveBeenCalledOnce();
});

it('restores the selection when returning to a chapter', async () => {
  await mount();
  act(() => current.commands.setTextSelection(8));
  await mount(vi.fn(), 'other');
  await mount();
  expect(current.state.selection.from).toBe(8);
});

it('runs the keyboard command and enables dialogue through the actual toolbar', async () => {
  await mount();
  act(() => current.commands.setTextSelection(4));
  act(() => current.view.dom.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
  })));
  expect(current.state.doc.firstChild?.textContent).toBe('— Первая реплика');
  const dialogue = [...host.querySelectorAll('button')].find(b => b.textContent === 'Диалог')!;
  await act(async () => dialogue.click());
  expect(current.storage.directSpeech.enabled).toBe(true);
  expect(dialogue.getAttribute('aria-pressed')).toBe('true');
});
