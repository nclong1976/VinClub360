import { supabase, isSupabaseConfigured } from './supabase';
import { base44 } from '@/api/base44Client';

/**
 * supabaseAuth — Bộ helper Auth toàn diện cho VinClub
 * ─────────────────────────────────────────────────────────────────
 * Bao gồm: signUp, signIn, signOut, getUser, onAuthStateChange,
 * updateProfile, resetPassword, updatePassword
 */

/**
 * Đăng ký tài khoản mới
 * @param {string} email
 * @param {string} password
 * @param {object} metadata - { full_name, phone, role, ... }
 */
export async function signUp(email, password, metadata = {}) {
  if (!isSupabaseConfigured) {
    const res = await base44.auth.register({
      email,
      password,
      name: metadata.full_name || metadata.name || 'Hội viên VinClub',
      full_name: metadata.full_name || metadata.name || 'Hội viên VinClub',
      phone: metadata.phone || '',
      role: metadata.role || 'user',
      referral_code: metadata.referral_code || '',
    });
    return {
      user: {
        id: res.user.id,
        email: res.user.email,
        user_metadata: {
          ...metadata,
          name: res.user.name,
          full_name: res.user.full_name,
          role: res.user.role,
        },
      },
      session: {
        access_token: res.access_token,
        user: {
          id: res.user.id,
          email: res.user.email,
          user_metadata: metadata,
        },
      },
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name || metadata.name || '',
          phone: metadata.phone || '',
          membership_tier: metadata.membership_tier || 'Member',
          vip_level: metadata.vip_level || 'VIP 0',
          avatar_url: metadata.avatar_url || '',
          ...metadata,
        },
      },
    });

    if (error) throw error;
    return data;
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('fetch failed')) {
      // Fallback offline
      const res = await base44.auth.register({
        email,
        password,
        name: metadata.full_name || metadata.name || 'Hội viên VinClub',
        full_name: metadata.full_name || metadata.name || 'Hội viên VinClub',
        phone: metadata.phone || '',
        role: metadata.role || 'user',
        referral_code: metadata.referral_code || '',
      });
      return {
        user: {
          id: res.user.id,
          email: res.user.email,
          user_metadata: metadata,
        },
        session: {
          access_token: res.access_token,
          user: {
            id: res.user.id,
            email: res.user.email,
            user_metadata: metadata,
          },
        },
      };
    }
    throw err;
  }
}

/**
 * Đăng nhập bằng email + password
 * @param {string} email
 * @param {string} password
 */
export async function signIn(email, password) {
  if (!isSupabaseConfigured) {
    const res = await base44.auth.loginViaEmailPassword(email, password);
    return {
      session: {
        access_token: res.access_token,
        user: {
          id: res.user.id,
          email: res.user.email,
          user_metadata: {
            name: res.user.name,
            full_name: res.user.full_name,
            role: res.user.role,
            balance: res.user.balance,
            identifier: res.user.identifier,
            phone: res.user.phone,
          },
        },
      },
      user: {
        id: res.user.id,
        email: res.user.email,
        user_metadata: {
          name: res.user.name,
          full_name: res.user.full_name,
          role: res.user.role,
          balance: res.user.balance,
          identifier: res.user.identifier,
          phone: res.user.phone,
        },
      },
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('fetch failed')) {
      const res = await base44.auth.loginViaEmailPassword(email, password);
      return {
        session: {
          access_token: res.access_token,
          user: {
            id: res.user.id,
            email: res.user.email,
            user_metadata: {
              name: res.user.name,
              full_name: res.user.full_name,
              role: res.user.role,
              balance: res.user.balance,
            },
          },
        },
        user: {
          id: res.user.id,
          email: res.user.email,
          user_metadata: {
            name: res.user.name,
            full_name: res.user.full_name,
            role: res.user.role,
            balance: res.user.balance,
          },
        },
      };
    }
    throw err;
  }
}

/**
 * Đăng xuất
 */
export async function signOut() {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('[SupabaseAuth] signOut error:', error.message);
  } catch (e) {
    console.warn('[SupabaseAuth] signOut exception:', e);
  }
}

/**
 * Lấy user đang đăng nhập hiện tại (từ session cache)
 */
export async function getUser() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Lấy session hiện tại
 */
export async function getSession() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Lắng nghe thay đổi trạng thái auth (đăng nhập / đăng xuất / token refresh)
 * @param {function} callback - (event, session) => void
 * @returns unsubscribe function
 */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) return () => {};
  try {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return data?.subscription?.unsubscribe || (() => {});
  } catch {
    return () => {};
  }
}

/**
 * Cập nhật thông tin profile user
 * @param {object} updates - { full_name, phone, avatar_url, ... }
 */
export async function updateProfile(updates) {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  });
  if (error) throw error;
  return data;
}

/**
 * Gửi email đặt lại mật khẩu
 * @param {string} email
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

/**
 * Cập nhật mật khẩu mới (sau khi nhận link reset)
 * @param {string} newPassword
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

/**
 * Chuyển đổi Supabase user object → định dạng VinClub user
 * để tương thích với toàn bộ UI hiện tại
 * @param {object} supaUser - Supabase User object
 * @param {object} extraData - dữ liệu bổ sung từ Supabase
 */
export function mapSupabaseUser(supaUser, extraData = {}) {
  if (!supaUser) return null;
  const meta = supaUser.user_metadata || {};
  return {
    id: supaUser.id,
    email: supaUser.email,
    identifier: meta.identifier || supaUser.email,
    full_name: meta.full_name || meta.name || supaUser.email?.split('@')[0] || 'Hội viên VinClub',
    name: meta.full_name || meta.name || supaUser.email?.split('@')[0] || 'Hội viên VinClub',
    phone: meta.phone || '',
    role: meta.role || 'user',
    is_super_admin: !!meta.is_super_admin,
    balance: Number(meta.balance || 0),
    total_deposited: Number(meta.total_deposited || 0),
    membership_tier: meta.membership_tier || 'Member',
    vip_level: meta.vip_level || 'VIP 0',
    is_locked: !!meta.is_locked,
    avatar: meta.avatar_url || meta.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    avatar_url: meta.avatar_url || meta.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    bank_name: meta.bank_name || '',
    account_number: meta.account_number || '',
    account_holder: meta.account_holder || '',
    created_at: supaUser.created_at || new Date().toISOString(),
    supabase_id: supaUser.id,
    ...extraData,
  };
}
