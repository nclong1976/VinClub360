import { supabase, isSupabaseConfigured } from './supabase';

export { isSupabaseConfigured };

/**
 * supabaseDb — Module truy vấn & thao tác cơ sở dữ liệu Supabase Database (PostgreSQL)
 * Hỗ trợ các bảng: users, wallet_transactions, notifications, messages, investment_projects
 * Có cơ chế tự động fallback mượt mà.
 */

// ==========================================
// 1. USERS OPERATIONS
// ==========================================

export function getLocalFallbackUsers() {
  const users = [];
  try {
    const rawReg = localStorage.getItem('base44_registered_users');
    if (rawReg) {
      const parsed = JSON.parse(rawReg);
      if (Array.isArray(parsed)) users.push(...parsed);
    }
  } catch (e) {}

  try {
    const rawEnt = localStorage.getItem('base44_entity_User');
    if (rawEnt) {
      const parsed = JSON.parse(rawEnt);
      if (Array.isArray(parsed)) users.push(...parsed);
    }
  } catch (e) {}

  try {
    const rawLocal = localStorage.getItem('base44_local_user');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && (parsed.id || parsed.email)) users.push(parsed);
    }
  } catch (e) {}

  // Fallback to standard demo users if no users exist in storage yet
  if (users.length === 0) {
    users.push(
      {
        id: 'u_demo1',
        identifier: '0901234567',
        email: 'user1@vinclub.com',
        username: 'user1',
        phone: '0901234567',
        name: 'NGUYỄN VĂN A',
        full_name: 'NGUYỄN VĂN A',
        role: 'user',
        balance: 50000000,
        total_deposited: 50000000,
        membership_tier: 'Gold',
        vip_level: 'VIP 2',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        id: 'u_nclong',
        identifier: 'nclong1976@gmail.com',
        email: 'nclong1976@gmail.com',
        username: 'nclong',
        phone: '0912345678',
        name: 'Nguyen Cao Long',
        full_name: 'Nguyen Cao Long',
        role: 'admin',
        balance: 50000000,
        total_deposited: 50000000,
        membership_tier: 'Diamond',
        vip_level: 'VIP 5',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      }
    );
  }

  // Deduplicate by ID and Email
  const map = new Map();
  users.forEach((u) => {
    if (u && (u.id || u.email)) {
      const k = u.id || u.email;
      if (!map.has(k)) {
        map.set(k, u);
      } else {
        map.set(k, { ...map.get(k), ...u });
      }
    }
  });

  return Array.from(map.values());
}

export async function getSupabaseUser(id) {
  if (!id) return null;
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn(`[SupabaseDb] getSupabaseUser exception:`, e);
    }
  }

  // Fallback to local
  const localList = getLocalFallbackUsers();
  return localList.find((u) => u.id === id || u.email === id) || null;
}

export async function listSupabaseUsers() {
  let supaUsers = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        supaUsers = data;
      } else if (error) {
        console.warn(`[SupabaseDb] listSupabaseUsers error:`, error.message);
      }
    } catch (e) {
      console.warn(`[SupabaseDb] listSupabaseUsers exception:`, e);
    }
  }

  // Always merge with local registered/cached users
  const localUsers = getLocalFallbackUsers();
  const mergedMap = new Map();

  // Populate local users first
  localUsers.forEach((u) => {
    if (u && (u.id || u.email)) {
      const key = u.id || u.email;
      mergedMap.set(key, u);
    }
  });

  // Supabase users override/extend local users
  supaUsers.forEach((u) => {
    if (u && (u.id || u.email)) {
      const key = u.id || u.email;
      const existing = mergedMap.get(key) || {};
      mergedMap.set(key, { ...existing, ...u });
    }
  });

  return Array.from(mergedMap.values());
}

export async function upsertSupabaseUser(user) {
  if (!user || (!user.id && !user.email)) return null;
  const uid = user.id || 'u_' + (user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : Date.now());

  const payload = {
    id: uid,
    email: user.email || '',
    identifier: user.identifier || user.email || '',
    name: user.name || user.full_name || 'Hội viên VinClub',
    full_name: user.full_name || user.name || 'Hội viên VinClub',
    phone: user.phone || '',
    role: user.role || 'user',
    balance: Number(user.balance || 0),
    total_deposited: Number(user.total_deposited || 0),
    membership_tier: user.membership_tier || 'Member',
    vip_level: user.vip_level || 'VIP 0',
    is_locked: !!user.is_locked,
    daily_interest_enabled: !!user.daily_interest_enabled,
    avatar_url: user.avatar_url || user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    bank_name: user.bank_name || '',
    account_number: user.account_number || '',
    account_holder: user.account_holder || '',
    referral_code: user.referral_code || '',
    last_active: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    return payload;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] upsertSupabaseUser error:`, error.message);
      return payload;
    }
    return data || payload;
  } catch (e) {
    console.warn(`[SupabaseDb] upsertSupabaseUser exception:`, e);
    return payload;
  }
}

/**
 * Cộng/trừ số dư NGUYÊN TỬ qua hàm Postgres increment_user_balance (xem
 * supabase_schema.sql). Postgres khóa dòng trong lúc UPDATE nên 2 lệnh
 * gọi gần như đồng thời (khác thiết bị, hoặc admin + user cùng lúc) luôn
 * cộng dồn đúng - không còn kiểu "đọc số dư cũ rồi ghi đè" khiến lệnh sau
 * xoá mất kết quả của lệnh trước.
 * @returns {Promise<{balance: number, total_deposited: number} | null>}
 *   Số dư THẬT sau khi cộng/trừ (đọc trực tiếp từ kết quả UPDATE), null
 *   nếu RPC lỗi (ví dụ chưa chạy migration supabase_schema.sql mới nhất).
 */
export async function incrementUserBalance(userId, delta, totalDepositedDelta = 0) {
  if (!userId) return null;
  const numDelta = Math.trunc(Number(delta) || 0);
  const numDepositDelta = Math.trunc(Number(totalDepositedDelta) || 0);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('increment_user_balance', {
        p_user_id: userId,
        p_delta: numDelta,
        p_total_deposited_delta: numDepositDelta,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          return {
            balance: Number(row.balance || 0),
            total_deposited: Number(row.total_deposited || 0),
            balance_version: Number(row.balance_version || 0),
          };
        }
      } else if (error) {
        console.warn('[SupabaseDb] incrementUserBalance RPC error:', error.message);
      }
    } catch (e) {
      console.warn('[SupabaseDb] incrementUserBalance RPC exception:', e);
    }

    // Direct table update fallback on Supabase
    try {
      const { data: supaUser } = await supabase
        .from('users')
        .select('balance, total_deposited, balance_version')
        .eq('id', userId)
        .maybeSingle();

      if (supaUser) {
        const newBal = Math.max(0, (Number(supaUser.balance) || 0) + numDelta);
        const newDep = Math.max(0, (Number(supaUser.total_deposited) || 0) + numDepositDelta);
        const newVer = (Number(supaUser.balance_version) || 0) + 1;

        const { data: updated, error: upErr } = await supabase
          .from('users')
          .update({
            balance: newBal,
            total_deposited: newDep,
            balance_version: newVer,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .maybeSingle();

        if (!upErr && updated) {
          return {
            balance: Number(updated.balance || 0),
            total_deposited: Number(updated.total_deposited || 0),
            balance_version: Number(updated.balance_version || 0),
          };
        }
      }
    } catch (e) {
      console.warn('[SupabaseDb] incrementUserBalance direct update exception:', e);
    }
  }

  return null;
}

/**
 * Đặt balance/total_deposited về giá trị TUYỆT ĐỐI qua hàm Postgres
 * set_user_balance_absolute hoặc fallback cập nhật trực tiếp.
 * @returns {Promise<{balance: number, total_deposited: number, balance_version: number} | null>}
 */
export async function setUserBalanceAbsolute(userId, balance, totalDeposited) {
  if (!userId) return null;
  const numBal = Math.trunc(Number(balance) || 0);
  const numDep = Math.trunc(Number(totalDeposited) || 0);

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('set_user_balance_absolute', {
        p_user_id: userId,
        p_balance: numBal,
        p_total_deposited: numDep,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          return {
            balance: Number(row.balance || 0),
            total_deposited: Number(row.total_deposited || 0),
            balance_version: Number(row.balance_version || 0),
          };
        }
      } else if (error) {
        console.warn('[SupabaseDb] setUserBalanceAbsolute RPC error:', error.message);
      }
    } catch (e) {
      console.warn('[SupabaseDb] setUserBalanceAbsolute RPC exception:', e);
    }

    // Direct table update fallback on Supabase
    try {
      const { data: supaUser } = await supabase
        .from('users')
        .select('balance_version')
        .eq('id', userId)
        .maybeSingle();

      const newVer = ((Number(supaUser?.balance_version) || 0) + 1);
      const { data: updated, error: upErr } = await supabase
        .from('users')
        .update({
          balance: numBal,
          total_deposited: numDep,
          balance_version: newVer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (!upErr && updated) {
        return {
          balance: Number(updated.balance || 0),
          total_deposited: Number(updated.total_deposited || 0),
          balance_version: Number(updated.balance_version || 0),
        };
      }
    } catch (e) {
      console.warn('[SupabaseDb] setUserBalanceAbsolute direct update exception:', e);
    }
  }

  return {
    balance: numBal,
    total_deposited: numDep,
    balance_version: Date.now(),
  };
}

/**
 * Nạp tiền từ ví chính vào 1 mục tiêu tiết kiệm - nguyên tử 100% (trừ ví +
 * cộng mục tiêu trong CÙNG 1 transaction Postgres, tự chuyển active/completed).
 * KHÔNG dùng increment_user_balance() cho vế trừ ví vì RPC đó vẫn đủ (self
 * debit luôn được phép), nhưng viết gộp ở đây để đảm bảo tính nguyên tử thật
 * sự thay vì 2 lệnh rời rạc phía client (tránh trạng thái nửa vời nếu 1 vế
 * lỗi giữa chừng). Trả về bản ghi mục tiêu mới nhất, hoặc null nếu lỗi (số
 * dư không đủ, tài khoản khoá, không sở hữu mục tiêu...).
 */
export async function contributeToSavingsGoal(goalId, amount) {
  if (!goalId) return null;
  try {
    const { data, error } = await supabase.rpc('contribute_to_savings_goal', {
      p_goal_id: goalId,
      p_amount: Math.trunc(Number(amount) || 0),
    });
    if (error) {
      console.warn('[SupabaseDb] contributeToSavingsGoal error:', error.message);
      return null;
    }
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.warn('[SupabaseDb] contributeToSavingsGoal exception:', e);
    return null;
  }
}

/**
 * Rút tiền từ 1 mục tiêu tiết kiệm về lại ví chính - nguyên tử 100%. Tiền
 * không hề được "tạo mới": chỉ chuyển từ savings_goals.current_amount (đã
 * thuộc về chính user này) sang users.balance của CHÍNH họ, nên bỏ qua được
 * giới hạn "user thường không tự cộng dương vào ví" của increment_user_balance()
 * - RPC riêng này tự xác thực bằng quyền sở hữu mục tiêu (WHERE user_id =
 * auth.uid()) thay vì is_admin().
 */
export async function withdrawFromSavingsGoal(goalId, amount) {
  if (!goalId) return null;
  try {
    const { data, error } = await supabase.rpc('withdraw_from_savings_goal', {
      p_goal_id: goalId,
      p_amount: Math.trunc(Number(amount) || 0),
    });
    if (error) {
      console.warn('[SupabaseDb] withdrawFromSavingsGoal error:', error.message);
      return null;
    }
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.warn('[SupabaseDb] withdrawFromSavingsGoal exception:', e);
    return null;
  }
}

/**
 * Xoá 1 mục tiêu tiết kiệm - nếu còn tiền đang tiết kiệm (current_amount > 0)
 * thì tự hoàn về ví chính TRƯỚC khi xoá, cùng 1 transaction nguyên tử (không
 * thể xảy ra trường hợp xoá xong mà tiền "biến mất" do bước hoàn tiền lỗi
 * giữa chừng). Trả về true nếu thành công, false/null nếu lỗi (không sở hữu...).
 */
export async function deleteSavingsGoalWithRefund(goalId) {
  if (!goalId) return null;
  try {
    const { data, error } = await supabase.rpc('delete_savings_goal', { p_goal_id: goalId });
    if (error) {
      console.warn('[SupabaseDb] deleteSavingsGoalWithRefund error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[SupabaseDb] deleteSavingsGoalWithRefund exception:', e);
    return null;
  }
}

/**
 * Admin duyệt/từ chối 1 lệnh nạp/rút tiền qua RPC process_wallet_transaction()
 * hoặc fallback đầy đủ (cộng/trừ số dư, gửi thông báo, tin nhắn CSKH, audit log).
 */
export async function processWalletTransaction(txId, action, reason = null) {
  if (!txId || !['approve', 'reject'].includes(action)) return null;

  let rpcSuccess = false;
  let rpcData = null;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_tx_id: txId,
        p_action: action,
        p_reason: reason,
      });

      if (!error && data) {
        rpcSuccess = true;
        rpcData = Array.isArray(data) ? data[0] : data;
      } else if (error) {
        console.warn('[SupabaseDb] processWalletTransaction RPC error:', error.message);
      }
    } catch (e) {
      console.warn('[SupabaseDb] processWalletTransaction RPC exception:', e);
    }
  }

  // Khi RPC thành công trên Postgres
  if (rpcSuccess && rpcData) {
    window.dispatchEvent(new Event('vinclub:balance_updated'));
    return rpcData;
  }

  // ── FALLBACK HOÀN CHỈNH (khi chưa cấu hình Supabase hoặc RPC không khả dụng) ──
  try {
    console.info('[SupabaseDb] Executing fallback for processWalletTransaction:', { txId, action, reason });

    // 1. Tìm thông tin giao dịch
    let tx = null;
    if (isSupabaseConfigured) {
      try {
        const { data: supaTx } = await supabase
          .from('wallet_transactions')
          .select('*')
          .or(`id.eq.${txId},code.eq.${txId}`)
          .maybeSingle();
        if (supaTx) tx = supaTx;
      } catch (e) {}
    }

    if (!tx) {
      const rawWts = localStorage.getItem('base44_entity_WalletTransaction');
      if (rawWts) {
        try {
          const list = JSON.parse(rawWts);
          tx = list.find((t) => t.id === txId || t.code === txId);
        } catch (e) {}
      }
    }

    if (!tx) {
      tx = { id: txId, amount: 0, user_id: '', type: 'deposit' };
    }

    const isDeposit = tx.type === 'deposit';
    const isWithdraw = tx.type === 'withdraw';
    const amount = Math.abs(Number(tx.amount || 0));
    const userId = tx.user_id;
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    const finalReason = action === 'reject' ? (reason || 'Từ chối bởi Quản trị viên') : null;

    const updatedTx = {
      ...tx,
      status: newStatus,
      rejection_reason: finalReason,
      updated_at: new Date().toISOString(),
      approved_at: action === 'approve' ? new Date().toISOString() : null,
      rejected_at: action === 'reject' ? new Date().toISOString() : null,
    };

    // Cập nhật bảng Supabase nếu có
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('wallet_transactions')
          .update({
            status: newStatus,
            rejection_reason: finalReason,
            updated_at: new Date().toISOString(),
            approved_at: action === 'approve' ? new Date().toISOString() : null,
            rejected_at: action === 'reject' ? new Date().toISOString() : null,
          })
          .or(`id.eq.${tx.id},code.eq.${tx.code || tx.id}`);
      } catch (e) {}
    }

    // Cập nhật localStorage base44_entity_WalletTransaction
    try {
      const rawWts = localStorage.getItem('base44_entity_WalletTransaction');
      let list = rawWts ? JSON.parse(rawWts) : [];
      const idx = list.findIndex((t) => t.id === tx.id || t.code === tx.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updatedTx };
      } else {
        list.unshift(updatedTx);
      }
      localStorage.setItem('base44_entity_WalletTransaction', JSON.stringify(list));
    } catch (e) {}

    // Cập nhật số dư người dùng
    if (userId && amount > 0) {
      // 1. Update trong registered users list
      const rawReg = localStorage.getItem('base44_registered_users');
      let regUsers = rawReg ? JSON.parse(rawReg) : [];
      let currentUser = regUsers.find((u) => u.id === userId || u.email === userId);

      // 2. Update trong entity User
      const rawEnt = localStorage.getItem('base44_entity_User');
      let entUsers = rawEnt ? JSON.parse(rawEnt) : [];
      let entUser = entUsers.find((u) => u.id === userId || u.email === userId);

      // 3. Update trong local active user
      const rawLocal = localStorage.getItem('base44_local_user');
      let localUser = rawLocal ? JSON.parse(rawLocal) : null;
      const isCurrentActive = localUser && (localUser.id === userId || localUser.email === userId);

      const currentBalance = Number(
        (currentUser && currentUser.balance) ??
        (entUser && entUser.balance) ??
        (isCurrentActive ? localUser.balance : 0)
      ) || 0;

      const currentDeposited = Number(
        (currentUser && currentUser.total_deposited) ??
        (entUser && entUser.total_deposited) ??
        (isCurrentActive ? localUser.total_deposited : 0)
      ) || 0;

      let nextBalance = currentBalance;
      let nextDeposited = currentDeposited;

      if (action === 'approve') {
        if (isDeposit) {
          nextBalance = currentBalance + amount;
          nextDeposited = currentDeposited + amount;
        }
        // Withdrawal: đã trừ trước đó khi tạo yêu cầu, không cần trừ lại
      } else if (action === 'reject') {
        if (isWithdraw) {
          // Hoàn lại tiền rút bị từ chối
          nextBalance = currentBalance + amount;
        }
      }

      // Lưu lại số dư mới
      if (regUsers.length > 0) {
        regUsers = regUsers.map((u) => (u.id === userId || u.email === userId ? { ...u, balance: nextBalance, total_deposited: nextDeposited } : u));
        localStorage.setItem('base44_registered_users', JSON.stringify(regUsers));
      }

      if (entUsers.length > 0) {
        entUsers = entUsers.map((u) => (u.id === userId || u.email === userId ? { ...u, balance: nextBalance, total_deposited: nextDeposited } : u));
        localStorage.setItem('base44_entity_User', JSON.stringify(entUsers));
      }

      if (isCurrentActive) {
        localUser = { ...localUser, balance: nextBalance, total_deposited: nextDeposited };
        localStorage.setItem('base44_local_user', JSON.stringify(localUser));
      }

      // Ghi Supabase nếu có
      if (isSupabaseConfigured) {
        try {
          await supabase.from('users').update({ balance: nextBalance, total_deposited: nextDeposited }).eq('id', userId);
        } catch (e) {}
      }
    }

    // Tạo thông báo chuông cho người dùng
    try {
      const notifTitle = action === 'approve'
        ? (isDeposit ? 'Nạp tiền thành công' : 'Rút tiền thành công')
        : (isDeposit ? 'Yêu cầu nạp tiền bị từ chối' : 'Yêu cầu rút tiền bị từ chối');

      const notifContent = action === 'approve'
        ? (isDeposit
            ? `Yêu cầu góp vốn / nạp tiền ${amount.toLocaleString('vi-VN')} VNĐ (Mã GD: ${tx.code || tx.id}) đã được Admin phê duyệt thành công vào ví VinClub của Quý khách.`
            : `Lệnh rút tiền ${amount.toLocaleString('vi-VN')} VNĐ (Mã GD: ${tx.code || tx.id}) đã được Admin phê duyệt thành công. Tiền sẽ về tài khoản ngân hàng của Quý khách trong ít phút.`)
        : `Yêu cầu ${isDeposit ? 'nạp' : 'rút'} tiền ${amount.toLocaleString('vi-VN')} VNĐ (Mã GD: ${tx.code || tx.id}) đã bị từ chối. Lý do: ${finalReason}.`;

      const notifPayload = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: notifTitle,
        content: notifContent,
        type: isDeposit ? 'deposit' : 'withdraw',
        user_id: userId,
        is_read: false,
        created_date: new Date().toISOString(),
      };

      const rawNotifs = localStorage.getItem('base44_entity_Notification');
      let notifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      notifs.unshift(notifPayload);
      localStorage.setItem('base44_entity_Notification', JSON.stringify(notifs));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('notifications').insert(notifPayload);
        } catch (e) {}
      }
    } catch (e) {}

    // Tạo tin nhắn CSKH trong hội thoại
    if (userId) {
      try {
        const msgText = action === 'approve'
          ? `[Thông báo giao dịch]\n\nKính gửi Quý khách, yêu cầu ${isDeposit ? 'nạp tiền' : 'rút tiền'} số tiền ${amount.toLocaleString('vi-VN')} VNĐ (Mã GD: ${tx.code || tx.id}) đã được Admin phê duyệt thành công.`
          : `[Thông báo giao dịch]\n\nKính gửi Quý khách, yêu cầu ${isDeposit ? 'nạp tiền' : 'rút tiền'} (Mã GD: ${tx.code || tx.id}) đã bị từ chối.\nLý do: ${finalReason}.`;

        const msgPayload = {
          id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          sender: 'support',
          conversation_id: userId,
          user_id: userId,
          text: msgText,
          content: msgText,
          created_date: new Date().toISOString(),
        };

        const rawMsgs = localStorage.getItem('base44_entity_Message');
        let msgs = rawMsgs ? JSON.parse(rawMsgs) : [];
        msgs.push(msgPayload);
        localStorage.setItem('base44_entity_Message', JSON.stringify(msgs));

        if (isSupabaseConfigured) {
          try {
            await supabase.from('messages').insert(msgPayload);
          } catch (e) {}
        }
      } catch (e) {}
    }

    // Tạo Audit Log
    try {
      const auditPayload = {
        id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        action: action === 'approve' ? (isDeposit ? 'APPROVE_DEPOSIT' : 'APPROVE_WITHDRAWAL') : (isDeposit ? 'REJECT_DEPOSIT' : 'REJECT_WITHDRAWAL'),
        target_id: tx.id,
        user_id: userId,
        amount: amount,
        notes: finalReason || (action === 'approve' ? 'Phê duyệt thành công' : 'Từ chối giao dịch'),
        created_date: new Date().toISOString(),
      };
      const rawLogs = localStorage.getItem('base44_entity_AuditLog');
      let logs = rawLogs ? JSON.parse(rawLogs) : [];
      logs.unshift(auditPayload);
      localStorage.setItem('base44_entity_AuditLog', JSON.stringify(logs));
    } catch (e) {}

    // Bắn sự kiện cập nhật số dư cho toàn bộ giao diện
    window.dispatchEvent(new Event('vinclub:balance_updated'));

    return updatedTx;
  } catch (fallbackErr) {
    console.error('[SupabaseDb] processWalletTransaction fallback error:', fallbackErr);
    return { success: true, id: txId, status: action === 'approve' ? 'completed' : 'rejected' };
  }
}

/**
 * Chia bài + tính điểm + tính tiền thắng cho Tiger Baccarat/Baccarat Long
 * Hổ HOÀN TOÀN trên server (RPC resolve_tiger_baccarat_round). Client
 * KHÔNG còn tự tính kết quả/tiền thắng - chỉ gửi số tiền cược theo từng ô
 * và nhận về kết quả ĐÃ CHỐT (đã cộng tiền nguyên tử) để hiển thị hiệu ứng.
 * Trả về null nếu RPC lỗi - bên gọi phải tự xử lý (không được coi là "huề
 * cược", vì tiền cược đã bị trừ từ bước đặt cược riêng trước đó).
 */
/**
 * Đăng ký + trừ tiền cược Tiger Baccarat/Baccarat Long Hổ HOÀN TOÀN trên
 * server (RPC place_tiger_baccarat_bet) - trả về round_id để gọi
 * resolveTigerBaccaratRound(roundId) sau đó. Server lưu lại CHÍNH XÁC số
 * tiền đã trừ cho từng ô, resolve chỉ đọc lại giá trị đã lưu này chứ không
 * còn nhận số tiền cược trực tiếp từ client nữa (trước đây client tự gửi
 * số tiền cược sang thẳng resolve_tiger_baccarat_round mà không hề kiểm tra
 * có khớp với số tiền THẬT đã bị trừ hay không - ai đó gọi thẳng RPC qua
 * devtools với số cược khống có thể tự cộng tiền thắng mà không mất 1 đồng
 * nào). Trả về null nếu RPC lỗi (vd. số dư không đủ, tài khoản bị khoá).
 */
export async function placeTigerBaccaratBet(gameSlug, bets) {
  try {
    const { data, error } = await supabase.rpc('place_tiger_baccarat_bet', {
      p_game_slug: gameSlug,
      p_bets: bets || {},
    });
    if (error) {
      console.warn('[SupabaseDb] placeTigerBaccaratBet error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] placeTigerBaccaratBet exception:', e);
    return null;
  }
}

/**
 * Chia bài + tính điểm + tính tiền thắng cho Tiger Baccarat/Baccarat Long
 * Hổ HOÀN TOÀN trên server (RPC resolve_tiger_baccarat_round), đọc lại
 * ĐÚNG số tiền cược đã đăng ký qua placeTigerBaccaratBet(roundId) ở trên -
 * không còn nhận bets trực tiếp từ client. Trả về null nếu RPC lỗi.
 */
export async function resolveTigerBaccaratRound(roundId) {
  try {
    const { data, error } = await supabase.rpc('resolve_tiger_baccarat_round', {
      p_round_id: roundId,
    });
    if (error) {
      console.warn('[SupabaseDb] resolveTigerBaccaratRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] resolveTigerBaccaratRound exception:', e);
    return null;
  }
}

/** Hoàn tiền 1 vòng cược của CHÍNH mình bị bỏ dở quá lâu (đóng tab giữa
 * chừng) - đọc số tiền đã cược từ server (casino_rounds), KHÔNG tin số tiền
 * từ localStorage như cơ chế reconcileStalePendingBets() cũ. */
export async function reconcileMyStaleCasinoRound(gameSlug) {
  try {
    const { data, error } = await supabase.rpc('reconcile_my_stale_casino_round', {
      p_game_slug: gameSlug,
    });
    if (error) {
      console.warn('[SupabaseDb] reconcileMyStaleCasinoRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] reconcileMyStaleCasinoRound exception:', e);
    return null;
  }
}

/** Bài Cào: cược + chia bài + tính thắng thua HOÀN TOÀN trên server trong 1
 * lần gọi duy nhất (không có bước quyết định nào giữa "cược" và "mở bài"
 * nên không cần lưu trạng thái vòng cược). */
export async function playBaicaoRound(betAmount) {
  try {
    const { data, error } = await supabase.rpc('play_baicao_round', {
      p_bet_amount: Math.trunc(Number(betAmount) || 0),
    });
    if (error) {
      console.warn('[SupabaseDb] playBaicaoRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] playBaicaoRound exception:', e);
    return null;
  }
}

/** Xì Tố Ba Lá: bắt đầu 1 vòng mới (cược + chia bài) trên server. */
export async function startXiToBaLaRound(betAmount) {
  try {
    const { data, error } = await supabase.rpc('start_xitobala_round', {
      p_bet_amount: Math.trunc(Number(betAmount) || 0),
    });
    if (error) {
      console.warn('[SupabaseDb] startXiToBaLaRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] startXiToBaLaRound exception:', e);
    return null;
  }
}

/** Xì Tố Ba Lá: tăng cược thêm 50.000 VNĐ vào pot của vòng đang chơi. */
export async function raiseXiToBaLaRound(roundId) {
  try {
    const { data, error } = await supabase.rpc('raise_xitobala_round', {
      p_round_id: roundId,
    });
    if (error) {
      console.warn('[SupabaseDb] raiseXiToBaLaRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] raiseXiToBaLaRound exception:', e);
    return null;
  }
}

/** Xì Tố Ba Lá: mở bài + tính thắng thua + cộng tiền (nếu thắng) trên server. */
export async function revealXiToBaLaRound(roundId) {
  try {
    const { data, error } = await supabase.rpc('reveal_xitobala_round', {
      p_round_id: roundId,
    });
    if (error) {
      console.warn('[SupabaseDb] revealXiToBaLaRound error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] revealXiToBaLaRound exception:', e);
    return null;
  }
}

/** Vòng Quay May Mắn: quay 1 lượt trên server - server tự xác thực số lượt
 * còn lại (dựa trên tiền nạp thật trong ngày) và tự chọn phần thưởng, cộng
 * tiền nguyên tử nếu trúng. */
export async function spinLuckyWheel() {
  try {
    const { data, error } = await supabase.rpc('spin_lucky_wheel');
    if (error) {
      console.warn('[SupabaseDb] spinLuckyWheel error:', error.message);
      return { error: error.message };
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] spinLuckyWheel exception:', e);
    return { error: e?.message || 'exception' };
  }
}

/**
 * Trả gốc + lãi khi 1 khoản đầu tư đáo hạn - HOÀN TOÀN trên server (RPC
 * resolve_project_maturity_payout): tự xác thực đã đủ hạn bằng đồng hồ
 * server, tự chống trả trùng (khoá dòng FOR UPDATE), cộng tiền + ghi lịch
 * sử ví trong CÙNG 1 transaction nguyên tử. Trả về:
 *   { paid: true, payout_amount, balance, balance_version } nếu đã trả
 *   { paid: false, reason: 'not_matured'|'already_paid'|'not_found'|'zero_payout' } nếu chưa
 *   null nếu lỗi RPC (mất mạng...) - bên gọi tự thử lại ở chu kỳ rà soát sau.
 */
export async function resolveProjectMaturityPayout(txId) {
  if (!txId) return null;
  try {
    const { data, error } = await supabase.rpc('resolve_project_maturity_payout', {
      p_tx_id: txId,
    });
    if (error) {
      console.warn('[SupabaseDb] resolveProjectMaturityPayout error:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.warn('[SupabaseDb] resolveProjectMaturityPayout exception:', e);
    return null;
  }
}

/** Đọc cấu hình ép kết quả/tỷ lệ THẬT (nguồn sự thật cho RPC resolve ở
 * trên) - chỉ Admin đọc được (RLS casino_secure_config_select_admin). */
export async function getCasinoSecureConfig(gameSlug) {
  try {
    const { data, error } = await supabase
      .from('casino_secure_config')
      .select('*')
      .eq('game_slug', gameSlug)
      .maybeSingle();
    if (error) {
      console.warn('[SupabaseDb] getCasinoSecureConfig error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[SupabaseDb] getCasinoSecureConfig exception:', e);
    return null;
  }
}

export async function updateCasinoSecureConfig(gameSlug, patch) {
  try {
    const { data, error } = await supabase
      .from('casino_secure_config')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('game_slug', gameSlug)
      .select()
      .maybeSingle();
    if (error) {
      console.warn('[SupabaseDb] updateCasinoSecureConfig error:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[SupabaseDb] updateCasinoSecureConfig exception:', e);
    return null;
  }
}

/** Cấu hình bảo trì/hiển thị casino (banner bảo trì, tỷ lệ hiển thị...) -
 * KHÔNG phải casino_secure_config (bảng đó chỉ Admin đọc được, dùng để
 * tính tiền thắng thật). Bảng này mọi user đã đăng nhập đọc được. */
export async function getCasinoMaintenanceConfig() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('casino_maintenance_config')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();
    if (error) {
      console.warn('[SupabaseDb] getCasinoMaintenanceConfig error:', error.message);
      return null;
    }
    return data?.config || null;
  } catch (e) {
    console.warn('[SupabaseDb] getCasinoMaintenanceConfig exception:', e);
    return null;
  }
}

export async function saveCasinoMaintenanceConfig(config) {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('casino_maintenance_config')
      .upsert({ id: 'default', config, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('[SupabaseDb] saveCasinoMaintenanceConfig error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[SupabaseDb] saveCasinoMaintenanceConfig exception:', e);
    return false;
  }
}

export function subscribeCasinoMaintenanceConfig(callback) {
  if (!isSupabaseConfigured) return () => {};
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName('public:casino_maintenance_config'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casino_maintenance_config', filter: `id=eq.default` },
        (payload) => {
          if (typeof callback === 'function') callback(payload?.new?.config || null);
        }
      )
  );
}

/** Cấu hình bảo trì TOÀN BỘ trang chủ (khác casino_maintenance_config -
 * bảng đó chỉ chặn riêng các phòng game). Cùng mẫu: 1 dòng duy nhất, mọi
 * user đã đăng nhập đọc được, chỉ Admin ghi được. */
export async function getAppMaintenanceConfig() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('app_maintenance_config')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();
    if (error) {
      console.warn('[SupabaseDb] getAppMaintenanceConfig error:', error.message);
      return null;
    }
    return data?.config || null;
  } catch (e) {
    console.warn('[SupabaseDb] getAppMaintenanceConfig exception:', e);
    return null;
  }
}

export async function saveAppMaintenanceConfig(config) {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('app_maintenance_config')
      .upsert({ id: 'default', config, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('[SupabaseDb] saveAppMaintenanceConfig error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[SupabaseDb] saveAppMaintenanceConfig exception:', e);
    return false;
  }
}

export function subscribeAppMaintenanceConfig(callback) {
  if (!isSupabaseConfigured) return () => {};
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName('public:app_maintenance_config'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_maintenance_config', filter: `id=eq.default` },
        (payload) => {
          if (typeof callback === 'function') callback(payload?.new?.config || null);
        }
      )
  );
}

/**
 * Kiểm tra xem một tên tài khoản/định danh (username, số điện thoại, hoặc
 * email) đã tồn tại trên hệ thống (bảng users Supabase - nguồn dữ liệu
 * chung, dùng chung cho mọi thiết bị) hay chưa, để chặn đăng ký trùng lặp.
 */
export async function isIdentifierTaken(identifier) {
  const clean = (identifier || '').trim();
  if (!clean || !isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .or(`identifier.eq.${clean},email.eq.${clean},phone.eq.${clean}`)
      .limit(1);

    if (error) {
      console.warn('[SupabaseDb] isIdentifierTaken error:', error.message);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.warn('[SupabaseDb] isIdentifierTaken exception:', e);
    return false;
  }
}

/** Kiểm tra mã giới thiệu qua RPC server (validate_referral_code) thay vì so
 * sánh cứng trong mã nguồn trình duyệt - xem migration
 * add_validate_referral_code_rpc để biết lý do. */
export async function isReferralCodeValid(code) {
  const clean = (code || '').trim().toUpperCase();
  if (!clean) return false;
  if (!isSupabaseConfigured) {
    return ['E-CUV', 'VINCLUB', 'VIP', 'ADMIN', 'VIN88'].includes(clean);
  }
  try {
    const { data, error } = await supabase.rpc('validate_referral_code', { p_code: clean });
    if (error) {
      console.warn('[SupabaseDb] isReferralCodeValid error:', error.message);
      return ['E-CUV', 'VINCLUB', 'VIP', 'ADMIN', 'VIN88'].includes(clean);
    }
    return data === true;
  } catch (e) {
    console.warn('[SupabaseDb] isReferralCodeValid exception:', e);
    return ['E-CUV', 'VINCLUB', 'VIP', 'ADMIN', 'VIN88'].includes(clean);
  }
}

export async function updateSupabaseUser(id, updates) {
  if (!id || !updates) return null;

  // Cập nhật local storage
  try {
    const rawReg = localStorage.getItem('base44_registered_users');
    if (rawReg) {
      let regList = JSON.parse(rawReg);
      regList = regList.map((u) => (u.id === id || u.email === id ? { ...u, ...updates, last_active: new Date().toISOString() } : u));
      localStorage.setItem('base44_registered_users', JSON.stringify(regList));
    }

    const rawEnt = localStorage.getItem('base44_entity_User');
    if (rawEnt) {
      let entList = JSON.parse(rawEnt);
      entList = entList.map((u) => (u.id === id || u.email === id ? { ...u, ...updates, last_active: new Date().toISOString() } : u));
      localStorage.setItem('base44_entity_User', JSON.stringify(entList));
    }

    const rawLocal = localStorage.getItem('base44_local_user');
    if (rawLocal) {
      const local = JSON.parse(rawLocal);
      if (local && (local.id === id || local.email === id)) {
        localStorage.setItem('base44_local_user', JSON.stringify({ ...local, ...updates, last_active: new Date().toISOString() }));
      }
    }
  } catch (e) {}

  if (!isSupabaseConfigured) return { id, ...updates };

  try {
    const cleanUpdates = {
      ...updates,
      last_active: new Date().toISOString(),
    };
    // Ensure numerical balance
    if (cleanUpdates.balance !== undefined) {
      cleanUpdates.balance = Number(cleanUpdates.balance);
    }
    if (cleanUpdates.total_deposited !== undefined) {
      cleanUpdates.total_deposited = Number(cleanUpdates.total_deposited);
    }

    const { data, error } = await supabase
      .from('users')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] updateSupabaseUser error:`, error.message);
      return { id, ...updates };
    }
    return data || { id, ...updates };
  } catch (e) {
    console.warn(`[SupabaseDb] updateSupabaseUser exception:`, e);
    return { id, ...updates };
  }
}

export async function deleteSupabaseUser(id) {
  if (!id) return false;

  // Xóa khỏi local storage
  try {
    const rawReg = localStorage.getItem('base44_registered_users');
    if (rawReg) {
      let regList = JSON.parse(rawReg);
      regList = regList.filter((u) => u.id !== id && u.email !== id);
      localStorage.setItem('base44_registered_users', JSON.stringify(regList));
    }

    const rawEnt = localStorage.getItem('base44_entity_User');
    if (rawEnt) {
      let entList = JSON.parse(rawEnt);
      entList = entList.filter((u) => u.id !== id && u.email !== id);
      localStorage.setItem('base44_entity_User', JSON.stringify(entList));
    }
  } catch (e) {}

  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn(`[SupabaseDb] deleteSupabaseUser error:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[SupabaseDb] deleteSupabaseUser exception:`, e);
    return false;
  }
}

// ==========================================
// 2. WALLET TRANSACTIONS OPERATIONS
// ==========================================

export async function listSupabaseWalletTransactions(filter = {}, sort = '-created_date', limit = 500) {
  let supaList = [];
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('wallet_transactions').select('*');

      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }
      if (filter.type) {
        query = query.eq('type', filter.type);
      }
      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      const isDesc = sort.startsWith('-');
      const sortField = isDesc ? sort.slice(1) : sort;
      query = query.order(sortField || 'created_date', { ascending: !isDesc });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        supaList = data;
      }
    } catch (e) {
      console.warn(`[SupabaseDb] listSupabaseWalletTransactions exception:`, e);
    }
  }

  // Đọc thêm từ localStorage fallback
  let localList = [];
  try {
    const raw = localStorage.getItem('base44_entity_WalletTransaction');
    if (raw) {
      localList = JSON.parse(raw) || [];
    }
  } catch (e) {}

  // Lọc local list nếu có filter
  if (localList.length > 0) {
    if (filter.user_id) localList = localList.filter((t) => t.user_id === filter.user_id);
    if (filter.type) localList = localList.filter((t) => t.type === filter.type);
    if (filter.status) localList = localList.filter((t) => t.status === filter.status);
  }

  // Merge danh sách và dedupe
  const mergedMap = new Map();
  localList.forEach((t) => {
    if (t && (t.id || t.code)) mergedMap.set(t.id || t.code, t);
  });
  supaList.forEach((t) => {
    if (t && (t.id || t.code)) {
      const key = t.id || t.code;
      mergedMap.set(key, { ...(mergedMap.get(key) || {}), ...t });
    }
  });

  let result = Array.from(mergedMap.values());
  const isDesc = sort.startsWith('-');
  const sortField = isDesc ? sort.slice(1) : sort;
  result.sort((a, b) => {
    const valA = new Date(a[sortField] || a.created_date || 0).getTime();
    const valB = new Date(b[sortField] || b.created_date || 0).getTime();
    return isDesc ? valB - valA : valA - valB;
  });

  if (limit && result.length > limit) {
    result = result.slice(0, limit);
  }

  return result;
}

export async function createSupabaseWalletTransaction(tx) {
  if (!tx) return null;
  const newTx = {
    id: tx.id || 'wt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    user_id: tx.user_id || '',
    type: tx.type || 'deposit',
    amount: Number(tx.amount || 0),
    status: tx.status || 'completed',
    code: tx.code || 'VCW' + Date.now().toString().slice(-8),
    description: tx.description || '',
    bank_name: tx.bank_name || '',
    account_number: tx.account_number || '',
    account_holder: tx.account_holder || '',
    rejection_reason: tx.rejection_reason || null,
    approved_at: tx.approved_at || null,
    approved_by: tx.approved_by || null,
    rejected_at: tx.rejected_at || null,
    rejected_by: tx.rejected_by || null,
    category: tx.category || null,
    note: tx.note || null,
    created_date: tx.created_date || new Date().toISOString(),
  };

  if (!isSupabaseConfigured) return newTx;

  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([newTx])
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] createSupabaseWalletTransaction error:`, error.message);
      return newTx;
    }
    return data || newTx;
  } catch (e) {
    console.warn(`[SupabaseDb] createSupabaseWalletTransaction exception:`, e);
    return newTx;
  }
}

export async function updateSupabaseWalletTransaction(id, updates) {
  if (!id || !updates) return null;
  if (!isSupabaseConfigured) return { id, ...updates };
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] updateSupabaseWalletTransaction error:`, error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[SupabaseDb] updateSupabaseWalletTransaction exception:`, e);
    return null;
  }
}

export async function deleteSupabaseWalletTransaction(id) {
  if (!id) return false;
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase.from('wallet_transactions').delete().eq('id', id);
    if (error) {
      console.warn(`[SupabaseDb] deleteSupabaseWalletTransaction error:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[SupabaseDb] deleteSupabaseWalletTransaction exception:`, e);
    return false;
  }
}

// ==========================================
// 3. REALTIME SUBSCRIPTION FOR SUPABASE
// ==========================================
// supabase-js định danh channel theo TÊN (topic) - gọi .channel() 2 lần với
// cùng 1 tên sẽ trả về/khớp lại đúng channel đã subscribe() trước đó, và
// .on() thêm vào một channel ĐÃ subscribe() sẽ ném lỗi "cannot add
// postgres_changes callbacks... after subscribe()". Nhiều nơi độc lập cùng
// gọi các hàm subscribe dưới đây (vd. AuthContext.jsx chạy nền toàn app +
// UsersTab.jsx của Admin) nên mỗi lần gọi phải tạo 1 tên channel RIÊNG,
// không dùng chung 1 tên cố định.
let channelSeq = 0;
const nextChannelName = (prefix) => `${prefix}:${Date.now()}:${++channelSeq}`;

// Tự động kết nối lại 1 kênh Realtime khi bị đóng/lỗi (CLOSED/CHANNEL_ERROR/
// TIMED_OUT). Trước đây mỗi hàm subscribeSupabase*() dưới đây chỉ gọi
// .subscribe() một lần duy nhất, không theo dõi trạng thái kênh sau đó - nếu
// kết nối WebSocket Realtime bị ngắt (khoá màn hình điện thoại, đổi mạng
// wifi/4G, tab bị trình duyệt tạm dừng ở nền...), kênh rơi vào CLOSED/
// CHANNEL_ERROR và không có gì tự nối lại: người dùng/admin ngừng nhận tin
// nhắn CSKH và mọi cập nhật realtime khác cho tới khi tự tải lại trang - đúng
// lớp lỗi "đường truyền/kết nối" đã gặp. Cùng mẫu với subscribeWithAutoReconnect()
// đã thêm ở server.ts (PR #45) cho luồng forward Telegram, áp dụng lại ở đây
// cho phía trình duyệt. buildChannel() phải tạo VÀ gắn .on(...) cho 1 channel
// MỚI mỗi lần gọi (chưa .subscribe()) - hàm này tự gọi .subscribe() và theo
// dõi trạng thái.
// onStatusChange (tuỳ chọn) - gọi lại mỗi lần trạng thái kênh đổi, dùng để
// hiện banner "Đang kết nối lại..." phía UI (Support.jsx) mà không chặn
// luồng chính - tham số tuỳ chọn nên mọi nơi gọi cũ (5 hàm subscribeSupabase*
// còn lại) không truyền vẫn chạy y hệt trước giờ.
function subscribeChannelWithAutoReconnect(buildChannel, onStatusChange) {
  if (!isSupabaseConfigured) {
    return () => {};
  }
  let channel = null;
  let retryTimer = null;
  let attempt = 0;
  let stopped = false;

  const connect = () => {
    let isTornDown = false;
    channel = buildChannel().subscribe((status) => {
      if (stopped || isTornDown) return;
      if (typeof onStatusChange === 'function') {
        try { onStatusChange(status); } catch (e) {}
      }
      if (status === 'SUBSCRIBED') {
        attempt = 0;
        return;
      }
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isTornDown = true;
        const dead = channel;
        channel = null;
        if (dead) {
          try {
            Promise.resolve(supabase.removeChannel(dead)).catch(() => {});
          } catch (e) {}
        }
        const delay = Math.min(30000, 1000 * 2 ** attempt);
        attempt += 1;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(connect, delay);
      }
    });
  };

  connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    if (channel) {
      try {
        Promise.resolve(supabase.removeChannel(channel)).catch(() => {});
      } catch (e) {}
    }
  };
}

export function subscribeSupabaseUsersTable(callback) {
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName('public:users'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
  );
}

// Kênh realtime lọc theo đúng 1 user_id - dùng cho AuthContext để nhận cập
// nhật balance/total_deposited/balance_version của chính phiên đăng nhập,
// thay cho subscribeUserFromRTDB (RTDB không còn là nguồn số dư đáng tin).
export function subscribeSupabaseUserRow(userId, callback) {
  if (!userId) return () => {};
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName(`public:users:id=eq.${userId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
  );
}

export function subscribeSupabaseWalletTransactionsTable(callback) {
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName('public:wallet_transactions'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions' },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
  );
}

// Kênh realtime lọc theo đúng 1 user_id cho wallet_transactions - dùng cho
// useWithdrawalSync (theo dõi trạng thái rút tiền của chính người dùng) thay
// vì phải nhận TOÀN BỘ thay đổi bảng (subscribeSupabaseWalletTransactionsTable
// ở trên) rồi tự lọc user_id ở client.
export function subscribeSupabaseWalletTransactionsForUser(userId, callback) {
  if (!userId) return () => {};
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName(`public:wallet_transactions:user_id=eq.${userId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
  );
}

// ==========================================
// 4. WRITE-THROUGH BỀN VỮNG CHO CÁC THỰC THỂ CÒN LẠI
// ==========================================
// Message, Notification, Project, BankAccount, Signature, Transaction,
// AuditLog trước đây chỉ tồn tại trong localStorage + Firebase (mất dữ
// liệu vĩnh viễn nếu người dùng/Admin xóa cache trình duyệt hoặc đổi
// thiết bị). Các hàm dưới đây ghi (write-through) mọi thay đổi của các
// thực thể này xuống Postgres như một lớp lưu trữ bền vững bổ sung -
// KHÔNG thay thế luồng đọc/localStorage hiện có, chỉ cộng thêm một bản
// sao đáng tin cậy ở phía sau. Lỗi ghi Supabase ở đây luôn được nuốt
// (catch) và không bao giờ chặn luồng chính của ứng dụng.

const ENTITY_TABLE_MAP = {
  Message: 'messages',
  Notification: 'notifications',
  Project: 'investment_projects',
  BankAccount: 'bank_accounts',
  Signature: 'signatures',
  Transaction: 'transactions',
  AuditLog: 'audit_logs',
  News: 'news',
  SavingsGoal: 'savings_goals',
  SupportConversation: 'support_conversations',
};

// Whitelist cột thật của từng bảng - field nào không nằm trong danh sách
// này sẽ được gom vào cột JSONB "extra" thay vì làm hỏng câu lệnh upsert
// với lỗi "column does not exist" khi phía client gửi field lạ/mới.
const ENTITY_COLUMNS = {
  Message: ['id', 'user_id', 'sender', 'content', 'attachments', 'conversation_id', 'delivered_at', 'read_at', 'topic', 'created_date'],
  Notification: ['id', 'user_id', 'title', 'content', 'image', 'type', 'is_read', 'created_date'],
  Project: ['id', 'title', 'name', 'category', 'location', 'image', 'price_per_m2', 'price_str', 'rate', 'annual_yield', 'area', 'progress', 'min_amount', 'duration', 'total_term_interest_rate', 'term_duration_minutes', 'scale', 'is_active', 'description', 'created_date', 'stock_symbol', 'daily_change_percent', 'legal_status', 'growth_history', 'monthly_transactions', 'tag', 'scheduled_open_at', 'scheduled_close_at'],
  BankAccount: ['id', 'user_id', 'bank_name', 'bank_code', 'account_number', 'account_holder', 'is_default', 'created_date'],
  Signature: ['id', 'user_id', 'type', 'content', 'label', 'created_date'],
  Transaction: ['id', 'user_id', 'user_email', 'user_name', 'project_id', 'project_name', 'project_title', 'category', 'amount', 'shares', 'method', 'rate', 'duration_days', 'profit', 'total', 'status', 'payout_status', 'contract_status', 'signature_type', 'signature_content', 'note', 'created_date'],
  AuditLog: ['id', 'action', 'tx_code', 'amount', 'user_id', 'user_name', 'admin_email', 'notes', 'created_date'],
  News: ['id', 'title', 'excerpt', 'category', 'author', 'image', 'featured', 'tags', 'sections', 'date', 'time', 'views', 'created_date', 'sort_order'],
  SavingsGoal: ['id', 'user_id', 'title', 'icon', 'color', 'target_amount', 'current_amount', 'target_date', 'status', 'created_date', 'completed_at'],
  SupportConversation: ['id', 'status', 'priority', 'assigned_admin_id', 'assigned_admin_name', 'topic', 'updated_at', 'created_date'],
};

// Cột kiểu timestamptz thật (không phải text) - Postgres từ chối chuỗi rỗng
// "" cho kiểu này ("invalid input syntax for type timestamp with time zone"),
// trong khi UI (nút "Hủy hẹn giờ" trong ProjectsTab.jsx, và projectScheduler.js
// tự xoá hẹn giờ sau khi đã áp dụng) đều gửi lên đúng chuỗi rỗng để biểu thị
// "không hẹn giờ" - phải đổi thành null trước khi ghi.
const TIMESTAMPTZ_FIELDS = new Set(['scheduled_open_at', 'scheduled_close_at']);

/** Tách một object thành {cột thật theo whitelist..., extra: {phần còn lại}} */
function shapeRowForTable(entityName, row) {
  const columns = ENTITY_COLUMNS[entityName] || [];
  const shaped = {};
  const extra = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (columns.includes(key)) {
      shaped[key] = (TIMESTAMPTZ_FIELDS.has(key) && value === '') ? null : value;
    } else {
      extra[key] = value;
    }
  });
  if (Object.keys(extra).length > 0) shaped.extra = extra;
  return shaped;
}

async function genericUpsertEntity(entityName, row) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table || !row || !row.id) return null;
  if (!isSupabaseConfigured) return row;
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(shapeRowForTable(entityName, row), { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] upsert ${entityName} error:`, error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[SupabaseDb] upsert ${entityName} exception:`, e);
    return null;
  }
}

/**
 * UPDATE thật (WHERE id = ...) - KHÁC genericUpsertEntity() (INSERT ... ON
 * CONFLICT DO UPDATE). Chỉ dùng cho update() vì .update() theo đúng ngữ
 * nghĩa của nó luôn thao tác trên 1 dòng ĐÃ TỒN TẠI - khi base44Client.js
 * (LocalEntityClient.update()) không tìm thấy bản ghi trong cache cục bộ,
 * nó gửi lên đây 1 patch THIẾU field (chỉ {id, ...field-vừa-đổi}, xem ghi
 * chú trong update()). Với upsert, Postgres vẫn phải dựng thử 1 dòng INSERT
 * đầy đủ trước khi xét ON CONFLICT, nên patch thiếu cột NOT NULL (vd
 * messages.conversation_id) sẽ bị từ chối (23502) NGAY CẢ KHI dòng đó đã
 * tồn tại thật và lẽ ra chỉ cần UPDATE - lỗi thực tế đã xảy ra khi admin
 * đánh dấu "đã đọc" 1 tin nhắn chưa có trong cache cục bộ của thiết bị đó.
 * UPDATE thật không có vấn đề này: chỉ SET đúng các cột có trong patch, các
 * cột NOT NULL khác giữ nguyên giá trị đã có sẵn trên dòng.
 */
async function genericUpdateEntity(entityName, id, row) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table || !id) return null;
  if (!isSupabaseConfigured) return { id, ...row };
  try {
    const { data, error } = await supabase
      .from(table)
      .update(shapeRowForTable(entityName, row))
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn(`[SupabaseDb] update ${entityName} error:`, error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[SupabaseDb] update ${entityName} exception:`, e);
    return null;
  }
}

async function genericDeleteEntity(entityName, id) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table || !id) return false;
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.warn(`[SupabaseDb] delete ${entityName} error:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[SupabaseDb] delete ${entityName} exception:`, e);
    return false;
  }
}

// LƯU Ý: hàm này NÉM LỖI (throw) thay vì nuốt lỗi + trả về [] như phần lớn
// hàm khác trong file - đây là hàm ĐỌC duy nhất được base44Client.js dùng
// làm nguồn sự thật (xem fetchFromSupabase), cần phân biệt được "bảng rỗng
// thật" với "truy vấn lỗi" (vd. RLS policy trên project lỗi đệ quy), nếu
// không phân biệt được, 1 bảng đang lỗi truy vấn sẽ trông giống hệt "đã bị
// xóa hết", xóa sạch luôn dữ liệu cache cục bộ đang có. listSupabaseEntity()
// hiện không có nơi gọi nào khác ngoài base44Client.js nên đổi hành vi ở đây
// an toàn, không ảnh hưởng chỗ khác.
// "messages" là bảng DÙNG CHUNG với 1 tính năng khác hoàn toàn không liên
// quan (thread_id/sender_id/body/ai_summary...) - base44.entities.Message
// (CSKH) không bao giờ đọc/ghi các cột đó (xem ENTITY_COLUMNS.Message ở
// trên, đã rà lại toàn bộ nơi gọi base44.entities.Message trong src/ để
// xác nhận). "support_conversations" cũng có vài cột không nơi nào trong
// src/ đọc tới (priority, last_message_at, last_message_preview,
// unread_count_admin - có thể phục vụ 1 tính năng dashboard chưa nối UI).
// Trước đây genericListEntity()/fetchMessagesPage() đều select('*'), nghĩa
// là MỌI lượt tải tin nhắn/hội thoại CSKH (mount lần đầu + poll fallback
// 8-20s ở CẢ Support.jsx lẫn MessagesTab.jsx) đều kéo thêm các cột không
// dùng tới - tốn băng thông vô ích trên 1 bảng vốn đã nặng vì cột
// "attachments" lưu ảnh base64. Chỉ 2 entity đã rà soát kỹ này được projection
// - CHỦ Ý dùng allowlist tường minh thay vì "mọi entity có trong
// ENTITY_COLUMNS" để không lỡ cắt mất field mà 1 entity khác (Project,
// Transaction...) đang đọc nhưng chưa được kiểm chứng ở đây.
const READ_PROJECTED_ENTITIES = new Set(['Message', 'SupportConversation']);

function selectColumnsFor(entityName) {
  const columns = ENTITY_COLUMNS[entityName];
  return READ_PROJECTED_ENTITIES.has(entityName) && columns?.length > 0 ? columns.join(',') : '*';
}

async function genericListEntity(entityName, filter = {}, sort = '-created_date', limit = 500) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table || !isSupabaseConfigured) return [];
  let query = supabase.from(table).select(selectColumnsFor(entityName));
  Object.entries(filter || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) query = query.eq(key, value);
  });
  const isDesc = sort.startsWith('-');
  const sortField = isDesc ? sort.slice(1) : sort;
  query = query.order(sortField || 'created_date', { ascending: !isDesc });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.warn(`[SupabaseDb] list ${entityName} error:`, error.message);
    throw new Error(error.message);
  }
  return data || [];
}

/** Ghi (tạo mới hoặc cập nhật) một bản ghi của entityName xuống Postgres. */
export function upsertSupabaseEntity(entityName, row) {
  return genericUpsertEntity(entityName, row);
}

/** UPDATE thật 1 bản ghi ĐÃ TỒN TẠI của entityName - xem ghi chú genericUpdateEntity(). */
export function updateSupabaseEntityById(entityName, id, row) {
  return genericUpdateEntity(entityName, id, row);
}

/** Xóa một bản ghi của entityName khỏi Postgres. */
export function deleteSupabaseEntity(entityName, id) {
  return genericDeleteEntity(entityName, id);
}

/** Đọc danh sách bản ghi của entityName từ Postgres (dùng cho hydrate/khôi phục). */
export function listSupabaseEntity(entityName, filter, sort, limit) {
  return genericListEntity(entityName, filter, sort, limit);
}

/**
 * Kênh Realtime tổng quát cho 1 trong 7 entity dùng ENTITY_TABLE_MAP (Message,
 * Notification, Project, BankAccount, Signature, Transaction, AuditLog).
 * Dùng chung mẫu với subscribeSupabaseUsersTable/subscribeSupabaseWalletTransactionsTable
 * ở trên - callback nhận payload sự kiện thô, bên gọi tự quyết định tải lại gì.
 */
export function subscribeSupabaseEntityTable(entityName, callback, onStatusChange) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) return () => {};
  return subscribeChannelWithAutoReconnect(() =>
    supabase
      .channel(nextChannelName(`public:${table}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      ),
    onStatusChange
  );
}

// ==========================================
// 4. CSKH MESSAGE PAGINATION (cursor thật theo hội thoại)
// ==========================================
// fetchFromSupabase('Message') (base44Client.js) chỉ fetch "2000 tin mới
// nhất TOÀN HỆ THỐNG" (không WHERE conversation_id) rồi cache/lọc ở JS -
// đủ cho luồng real-time "hot" (patch tức thời qua subscribe(), đã
// hardening qua nhiều PR) nhưng KHÔNG phải pagination thật: hội thoại nào
// có lịch sử cũ hơn ngưỡng 2000 tin chung đó sẽ mất hẳn khỏi tầm nhìn,
// không có cách nào tải thêm. Hàm này là đường ĐỘC LẬP, chỉ dùng để seed
// lần đầu 1 hội thoại cụ thể và tải thêm khi cuộn lên đầu (Support.jsx,
// MessagesTab.jsx) - KHÔNG thay thế, không đụng vào cơ chế cache/real-time
// toàn cục ở trên.
/**
 * @param {string} conversationId
 * @param {{beforeCreatedAt?: string, limit?: number}} [options]
 */
export async function fetchMessagesPage(conversationId, { beforeCreatedAt, limit = 50 } = {}) {
  if (!conversationId) return [];
  let query = supabase
    .from('messages')
    .select(selectColumnsFor('Message'))
    .eq('conversation_id', conversationId)
    .order('created_date', { ascending: false })
    .limit(limit);
  if (beforeCreatedAt) query = query.lt('created_date', beforeCreatedAt);

  const { data, error } = await query;
  if (error) {
    console.warn('[SupabaseDb] fetchMessagesPage error:', error.message);
    throw new Error(error.message);
  }
  return data || [];
}
