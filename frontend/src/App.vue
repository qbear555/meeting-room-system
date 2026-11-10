<template>
  <div class="app-layout">
    <!-- 頂部企業導航列 -->
    <header class="app-header">
      <div class="header-left">
        <span class="app-logo">🏢</span>
        <h1 class="app-title">企業會議室預約管理系統</h1>
      </div>

      <!-- 快速同仁切換器 (獨立運行時方便以不同同仁身分預約、檢視權限) -->
      <div class="header-right">
        <div class="user-picker-wrap">
          <span style="font-size:0.8rem;color:#64748b">目前登入同仁：</span>
          <select
            v-model="currentUsername"
            class="input sm user-select"
            @change="onSwitchUser"
          >
            <option value="tzuming">👤 子銘 (資訊部)</option>
            <option value="admin">👑 管理員 (管理部)</option>
            <option value="colleague1">👤 怡君 (業務部)</option>
            <option value="colleague2">👤 冠宇 (研發部)</option>
            <option value="colleague3">👤 雅婷 (財務部)</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 行前 5 分鐘即時提醒 Banner -->
    <div v-if="reminders.length" class="meeting-reminder-banner">
      <div class="reminder-content">
        <span class="reminder-icon">⏰</span>
        <div class="reminder-text">
          <strong>【即將開始會議提醒】</strong>
          <span v-for="m in reminders" :key="m.id" style="margin-left: 6px;">
            您的「{{ m.title }}」即將於 <strong>{{ m.start_time }}</strong> 在 <strong>{{ m.room_name }}</strong> 召開，請預先準備出席！
          </span>
        </div>
      </div>
    </div>

    <!-- 主頁面視圖 -->
    <main class="app-main">
      <MeetingRoomsView v-if="isReady" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { fetchMeetingReminders } from './api/meeting-rooms';
import MeetingRoomsView from './views/MeetingRoomsView.vue';

const authStore = useAuthStore();
const currentUsername = ref('tzuming');
const isReady = ref(false);
const reminders = ref([]);

async function checkReminders() {
  try {
    const data = await fetchMeetingReminders();
    reminders.value = data.reminders || [];
  } catch {
    reminders.value = [];
  }
}

async function onSwitchUser() {
  try {
    await authStore.login(currentUsername.value, '123456');
    isReady.value = false;
    setTimeout(() => {
      isReady.value = true;
      checkReminders();
    }, 50);
  } catch (err) {
    console.error('登入切換失敗:', err);
  }
}

onMounted(async () => {
  // 自動預設以 tzuming 登入
  try {
    await authStore.login('tzuming', '123456');
  } catch (e) {
    console.warn('Auto login failed:', e);
  }
  isReady.value = true;
  await checkReminders();
  setInterval(checkReminders, 30000);
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f1f5f9;
}

.app-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-logo {
  font-size: 1.5rem;
}

.app-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-picker-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.user-select {
  font-weight: 600;
  color: #1e293b;
  border-color: #cbd5e1;
  background: #ffffff;
  cursor: pointer;
}

.meeting-reminder-banner {
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  padding: 8px 24px;
  animation: pulseReminder 2s infinite ease-in-out;
}

@keyframes pulseReminder {
  0%, 100% { background: #fef2f2; }
  50% { background: #fee2e2; }
}

.reminder-content {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 1400px;
  margin: 0 auto;
  font-size: 0.85rem;
  color: #991b1b;
}

.reminder-icon {
  font-size: 1.2rem;
}

.app-main {
  flex: 1;
  padding: 12px 20px;
  max-width: 1480px;
  width: 100%;
  margin: 0 auto;
}
</style>
