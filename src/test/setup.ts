import '@testing-library/jest-dom';
import { afterAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Node 26 exposes a native localStorage property which can shadow jsdom's storage.
const storageWindow = new JSDOM('', { url: 'http://localhost' }).window;
vi.stubGlobal('Storage', storageWindow.Storage);
vi.stubGlobal('localStorage', storageWindow.localStorage);
vi.stubGlobal('sessionStorage', storageWindow.sessionStorage);
afterAll(() => storageWindow.close());
