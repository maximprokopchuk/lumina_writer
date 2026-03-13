import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, LogOut, User as UserIcon, Github, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="flex items-center gap-2 px-2 py-1 bg-stone-50 border border-stone-200 rounded-md">
        <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden border border-stone-300">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon size={14} className="text-stone-500" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stone-700 truncate max-w-[100px] leading-tight">
            {user.user_metadata?.full_name || user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-[9px] text-stone-400 hover:text-red-500 transition-colors text-left leading-tight"
          >
            Выйти
          </button>
        </div>
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
