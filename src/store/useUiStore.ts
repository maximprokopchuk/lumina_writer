import { create } from 'zustand';

interface UiState {
  hasPendingChanges: boolean;
  localSaveError: string | null;
  cloudSaveError: string | null;
  syncNotice: string | null;
  exportError: string | null;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  isReadingMode: boolean;
  setIsReadingMode: (v: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (v: boolean) => void;
  isLibraryOpen: boolean;
  setIsLibraryOpen: (v: boolean) => void;
  isCloudSyncing: boolean;
  setIsCloudSyncing: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  hasPendingChanges: false,
  localSaveError: null,
  cloudSaveError: null,
  syncNotice: null,
  exportError: null,
  isSaving: false,
  setIsSaving: (isSaving) => set({ isSaving }),
  isExporting: false,
  setIsExporting: (isExporting) => set({ isExporting }),
  isFocusMode: false,
  setIsFocusMode: (isFocusMode) => set({ isFocusMode }),
  isReadingMode: false,
  setIsReadingMode: (isReadingMode) => set({ isReadingMode }),
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  isLibraryOpen: false,
  setIsLibraryOpen: (isLibraryOpen) => set({ isLibraryOpen }),
  isCloudSyncing: false,
  setIsCloudSyncing: (isCloudSyncing) => set({ isCloudSyncing }),
}));
