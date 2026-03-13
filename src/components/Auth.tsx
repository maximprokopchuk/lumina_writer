import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, LogOut, User as UserIcon, Github, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  user: any;
  onSignOut: () => void;
}

export default function Auth({ user, onSignOut }: AuthProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Ошибка при входе. Проверьте настройки Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured) {
      onSignOut();
      return;
    }
    await supabase.auth.signOut();
    onSignOut();
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
      <div className="flex items-center gap-3 px-4 py-2 bg-white border border-stone-200 rounded-lg shadow-sm">
        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden border border-stone-200">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={16} className="text-stone-400" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-stone-900 truncate max-w-[120px]">
            {user.user_metadata?.full_name || user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[10px] text-stone-400 hover:text-red-500 transition-colors text-left"
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
        {isLoading ? 'Загрузка...' : 'Войти через Google'}
      </button>
    </div>
  );
}
