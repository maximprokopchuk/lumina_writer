import { AlertCircle, Check, Cloud, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useUiStore } from '../store/useUiStore';

export default function SaveStatus() {
  const user = useAppStore(s => s.user);
  const syncing = useUiStore(s => s.isCloudSyncing);
  const pending = useUiStore(s => s.hasPendingChanges);
  const localError = useUiStore(s => s.localSaveError);
  const cloudError = useUiStore(s => s.cloudSaveError);
  const failed = !!(localError || cloudError);
  const text = localError ? 'Ошибка сохранения' : cloudError ? 'Сохранено локально'
    : syncing ? 'Синхронизация…' : pending && user ? 'Есть изменения'
      : user ? 'Синхронизировано' : 'Сохранено локально';
  const Icon = failed ? AlertCircle : syncing ? Loader2 : user ? Cloud : Check;
  return (
    <div role="status" aria-live="polite" title={localError || cloudError || text}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${failed ? 'bg-amber-50 text-amber-800' : 'text-stone-500'}`}>
      <Icon size={14} className={syncing ? 'animate-spin shrink-0' : 'shrink-0'} />
      <span className="hidden lg:inline">{text}</span>
    </div>
  );
}
