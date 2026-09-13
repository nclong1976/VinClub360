import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client Singleton
 * ─────────────────────────────────────────────────────────────────
 * URL + Key được đọc từ biến môi trường Vite.
 * Chỉ khởi tạo 1 lần duy nhất, export để dùng ở toàn ứng dụng.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  typeof supabaseUrl === 'string' &&
  !/your_project|your-project|example\.com|placeholder|<[^>]+>/i.test(supabaseUrl) &&
  !/xxxxxxxx|placeholder|<[^>]+>/i.test(supabaseKey)
);

if (!isSupabaseConfigured) {
  console.info(
    '[Supabase] ℹ️ Đang chạy chế độ lưu trữ cục bộ (VITE_SUPABASE_URL chưa được cấu hình hoặc đang chứa giá trị mẫu).'
  );
}

const activeUrl = isSupabaseConfigured ? supabaseUrl : 'https://supabase.local';
const activeKey = isSupabaseConfigured ? supabaseKey : 'placeholder-key';

export const supabase = createClient(activeUrl, activeKey, {
  auth: {
    // Lưu session trong localStorage để giữ đăng nhập qua các lần tải lại trang
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
    storageKey: 'vinclub_supabase_session',
  },
});

export default supabase;
