import { useState } from 'react';
import { User as UserIcon, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';

export default function Auth() {
  const user = useAppStore(s => s.user);
  const { signOut, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Ошибка при входе. Проверьте настройки Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-xs">
        <AlertCircle size={14} />
        <span>Настройте Supabase для входа</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 border border-stone-200 rounded-md">
        <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden border border-stone-300">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={14} className="text-stone-500" />
          )}
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="text-[11px] font-medium text-stone-700 truncate max-w-[100px] leading-tight">
            {user.user_metadata?.full_name || user.email}
          </span>
          <button
            onClick={signOut}
            className="text-[9px] text-stone-400 hover:text-red-500 transition-colors text-left leading-tight cursor-pointer"
          >
            Выйти
          </button>
        </div>
        <button
          onClick={signOut}
          className="sm:hidden text-[9px] text-stone-400 hover:text-red-500 transition-colors cursor-pointer leading-none"
          title="Выйти"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-md text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-95 disabled:opacity-50"
    >
      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3 h-3" />
      {isLoading ? '...' : 'Войти'}
    </button>
  );
}
