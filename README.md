# Lumina Writer — Платформа для писателей

Lumina Writer — это современное веб-приложение для написания книг и рассказов с поддержкой облачной синхронизации, экспорта в PDF/DOCX и режимом фокусировки.

## Технологический стек
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Backend/Database**: Supabase (PostgreSQL).
- **Auth**: Supabase Auth + Google OAuth.
- **Animations**: Framer Motion.

---

## 1. Настройка Google Cloud Console (для входа через Google)

1.  Перейдите в [Google Cloud Console](https://console.cloud.google.com/).
2.  Создайте новый проект.
3.  Перейдите в **APIs & Services** -> **OAuth consent screen**:
    *   Выберите тип **External**.
    *   Заполните название приложения (`Lumina Writer`) и контактные данные.
    *   **Важно**: Опубликуйте приложение (кнопка **Publish App**), чтобы вход работал для всех.
4.  Перейдите в **Credentials** -> **Create Credentials** -> **OAuth client ID**:
    *   Тип приложения: **Web application**.
    *   **Authorized JavaScript origins**: Добавьте URL вашего сайта (например, `https://your-app.vercel.app`).
    *   **Authorized redirect URIs**: Вставьте Callback URL из Supabase (см. следующий раздел).
5.  Скопируйте **Client ID** и **Client Secret**.

---

## 2. Настройка Supabase

### Аутентификация
1.  Создайте проект в [Supabase](https://supabase.com/).
2.  Перейдите в **Authentication** -> **Providers** -> **Google**:
    *   Включите провайдер.
    *   Вставьте **Client ID** и **Client Secret** из Google Cloud.
    *   Скопируйте **Callback URL** и вставьте его в настройки Google Cloud (пункт 4 выше).
3.  В **Authentication** -> **URL Configuration**:
    *   **Site URL**: URL вашего развернутого приложения (например, `https://your-app.vercel.app`).
    *   **Redirect URLs**: Добавьте `https://your-app.vercel.app/**`.

### База данных (SQL Editor)
Выполните следующий SQL-запрос в разделе **SQL Editor**, чтобы создать таблицу и настроить права доступа (RLS):

```sql
-- Создание таблицы книг
create table public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null default 'Новое произведение',
  author text default '',
  chapters jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Включение Row Level Security (RLS)
alter table public.books enable row level security;

-- Политика: пользователи могут видеть только свои книги
create policy "Users can view their own books"
  on public.books for select
  using ( auth.uid() = user_id );

-- Политика: пользователи могут создавать свои книги
create policy "Users can create their own books"
  on public.books for insert
  with check ( auth.uid() = user_id );

-- Политика: пользователи могут обновлять свои книги
create policy "Users can update their own books"
  on public.books for update
  using ( auth.uid() = user_id );

-- Политика: пользователи могут удалять свои книги
create policy "Users can delete their own books"
  on public.books for delete
  using ( auth.uid() = user_id );
```

---

## 3. Переменные окружения (.env)

Создайте файл `.env` в корне проекта (или добавьте в настройки Vercel):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 4. Развертывание на Vercel

1.  Загрузите код на GitHub.
2.  Подключите репозиторий к Vercel.
3.  Добавьте переменные окружения (`VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`) в настройках проекта на Vercel.
4.  Нажмите **Deploy**.
5.  **Не забудьте** обновить **Site URL** в Supabase и **Authorized Origins** в Google Cloud после получения финального домена от Vercel.

---

## Локальная разработка

1.  Установите зависимости: `npm install`
2.  Запустите сервер: `npm run dev`
3.  Откройте `http://localhost:3000`
