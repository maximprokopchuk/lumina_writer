import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useDialog } from './useDialog';

function Dialog() {
  const ref = useRef<HTMLDivElement>(null); useDialog(ref);
  return <div ref={ref}><button>Первый</button><button>Последний</button></div>;
}
it('keeps Tab inside the dialog and restores focus to its opener', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const opener = document.createElement('button'); document.body.appendChild(opener); opener.focus();
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  try {
    await act(async () => root.render(<Dialog />));
    const [first, last] = [...container.querySelectorAll('button')];
    expect(document.activeElement).toBe(first);
    last.focus(); last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    await act(async () => root.unmount());
    expect(document.activeElement).toBe(opener);
  } finally { container.remove(); opener.remove(); }
});
