<template>
  <div class="meeting-rooms-page">
    <!-- 主排版：左右雙欄 (高度收斂在單一視窗內，無須滑鼠滾輪滾動) -->
    <div class="meeting-layout-grid">
      <!-- 左欄：會議室即時狀態 + 當月月曆 + 所選日摘要 (~310px) -->
      <div class="meeting-left-panel">
        <!-- 1. 會議室即時狀態卡片 (精簡緊湊) -->
        <div
          v-for="item in roomStatuses"
          :key="item.room.id"
          class="card room-status-mini-card"
          :style="{ borderTop: `3px solid ${item.room.color || '#2563eb'}` }"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:1.05rem;color:#1e293b">{{ item.room.name }}</strong>
            <span
              v-if="item.in_use"
              class="status-pill in-use"
            >
              <span class="status-dot"></span> 使用中
            </span>
            <span
              v-else
              class="status-pill free"
            >
              <span class="status-dot"></span> 目前空閒
            </span>
          </div>

          <!-- 即時/下場會議摘要 -->
          <div class="room-status-snippet">
            <template v-if="item.in_use && item.current_booking">
              <div style="font-weight:700;color:#991b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.84rem">
                🔴 開會中：{{ item.current_booking.title }}
              </div>
              <div class="muted" style="font-size:0.75rem;margin-top:1px">
                🕒 {{ item.current_booking.start_time }}~{{ item.current_booking.end_time }} · {{ item.current_booking.user_name }}
              </div>
            </template>
            <template v-else-if="item.next_booking">
              <div style="color:#0369a1;font-weight:700;font-size:0.84rem">
                ⏳ 下一場：{{ item.next_booking.title }}
              </div>
              <div class="muted" style="font-size:0.75rem;margin-top:1px">
                🕒 {{ item.next_booking.start_time }}~{{ item.next_booking.end_time }} · {{ item.next_booking.user_name }}
              </div>
            </template>
            <template v-else>
              <div style="color:#64748b;font-size:0.8rem">
                ✨ 今日稍後無後續會議安排
              </div>
            </template>
          </div>

          <button
            type="button"
            class="btn primary sm"
            style="width:100%;font-size:0.82rem;padding:6px 0;font-weight:600"
            @click="openBookingModal({ room_id: item.room.id })"
          >
            ＋ 立即預約此會議室
          </button>
        </div>

        <!-- 2. 當月會議排程月曆 (緊湊型迷你月曆) -->
        <div class="card calendar-mini-card">
          <!-- 月曆頂部切換 -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:0.92rem;color:#0f172a;display:flex;align-items:center;gap:4px">
              <span>🗓️</span> {{ calYear }} 年 {{ calMonth }} 月
            </strong>
            <div style="display:flex;gap:4px">
              <button type="button" class="btn outline sm cal-nav-btn" @click="changeCalMonth(-1)">◀</button>
              <button type="button" class="btn outline sm cal-nav-btn" @click="goToCalToday">今天</button>
              <button type="button" class="btn outline sm cal-nav-btn" @click="changeCalMonth(1)">▶</button>
            </div>
          </div>

          <!-- 星期列 -->
          <div class="cal-weekdays-row">
            <div style="color:#ef4444">日</div>
            <div>一</div>
            <div>二</div>
            <div>三</div>
            <div>四</div>
            <div>五</div>
            <div style="color:#2563eb">六</div>
          </div>

          <!-- 月曆格子 (7列) -->
          <div class="cal-days-grid">
            <div
              v-for="day in calendarGridDays"
              :key="day.dateStr"
              class="cal-day-cell"
              :class="{
                'cal-day-other-month': !day.isCurrentMonth,
                'cal-day-today': day.isToday,
                'cal-day-selected': day.dateStr === selectedCalendarDate,
                'cal-day-has-booking': getBookingsForDate(day.dateStr).length > 0
              }"
              :title="`${day.dateStr}：${getBookingsForDate(day.dateStr).length} 場預約`"
              @click="selectCalendarDate(day.dateStr)"
            >
              <span class="cal-day-num">{{ day.day }}</span>
              <span v-if="getBookingsForDate(day.dateStr).length > 0" class="cal-booking-badge">
                ●{{ getBookingsForDate(day.dateStr).length }}
              </span>
            </div>
          </div>
        </div>

        <!-- 3. 所選日預約情況 (緊湊列表，內建小滾動條) -->
        <div class="card selected-day-mini-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="color:#0f172a;font-size:0.86rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              📌 {{ selectedCalendarDate.slice(5) }} ({{ selectedDayBookings.length }}場)
            </strong>
            <button
              type="button"
              class="btn outline sm"
              style="font-size:0.75rem;padding:2px 8px;color:#2563eb;border-color:#bfdbfe;font-weight:600"
              @click="openBookingModal({ booking_date: selectedCalendarDate })"
            >
              ＋ 預約此日
            </button>
          </div>

          <!-- 當日預約列表 -->
          <div v-if="selectedDayBookings.length" class="selected-day-list-scroll">
            <div
              v-for="b in selectedDayBookings"
              :key="b.id"
              class="selected-day-item"
              :title="b.user_id === currentUserId ? '點擊編輯您的預約' : '點擊檢視預約內容'"
              @click="openBookingModal(b)"
            >
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
                <span style="font-weight:700;color:#0f172a;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">
                  {{ b.title }}
                </span>
                <span
                  style="font-size:0.68rem;padding:1px 5px;border-radius:3px;font-weight:600"
                  :style="b.user_id === currentUserId ? 'background:#dbeafe;color:#1d4ed8' : 'background:#f1f5f9;color:#64748b'"
                >
                  {{ b.user_id === currentUserId ? '我的' : '檢視' }}
                </span>
              </div>
              <div style="font-size:0.75rem;color:#2563eb;font-weight:600">
                🕒 {{ b.start_time }} ~ {{ b.end_time }}
              </div>
              <div style="font-size:0.72rem;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                👤 {{ b.user_name }} {{ b.attendees ? `· 👥 ${b.attendees}` : '' }}
              </div>
            </div>
          </div>
          <div
            v-else
            style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:10px;text-align:center;font-size:0.78rem;color:#64748b"
          >
            本日尚無預約，全天可使用
          </div>
        </div>
      </div>

      <!-- 右欄：排程工具列 + 主視圖區 (~1fr) -->
      <div class="meeting-right-panel">
        <!-- 排程工具列 (緊湊單行) -->
        <div class="card schedule-toolbar-card">
          <!-- 視圖切換 Tabs (高對比清楚可見) -->
          <div class="meeting-tabs-wrap">
            <button
              type="button"
              class="meeting-tab-btn"
              :class="{ active: activeTab === 'timeline' }"
              @click="switchTab('timeline')"
            >
              📊 當日排程軸
            </button>
            <button
              type="button"
              class="meeting-tab-btn"
              :class="{ active: activeTab === 'week' }"
              @click="switchTab('week')"
            >
              🗓️ 本週排程表
            </button>
            <button
              type="button"
              class="meeting-tab-btn"
              :class="{ active: activeTab === 'mine' }"
              @click="switchTab('mine')"
            >
              📋 我的預約
            </button>
          </div>

          <!-- 日期導航器（僅在 timeline 或 week 視圖顯示） -->
          <div v-if="activeTab !== 'mine'" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <button type="button" class="btn outline sm" style="padding:4px 8px" @click="changeDate(-1)">
              ◀ {{ activeTab === 'week' ? '上週' : '前一天' }}
            </button>
            <button type="button" class="btn outline sm" style="padding:4px 8px" @click="goToToday">
              今天
            </button>
            <button type="button" class="btn outline sm" style="padding:4px 8px" @click="changeDate(1)">
              {{ activeTab === 'week' ? '下週' : '後一天' }} ▶
            </button>
            <input
              v-model="currentDate"
              type="date"
              class="input sm"
              style="padding:3px 6px;border-radius:5px;border:1px solid #cbd5e1;font-size:0.82rem"
              @change="onCurrentDateChange"
            />
            <strong style="color:#1e293b;font-size:0.88rem;margin-left:2px">
              {{ formatCurrentDateDisplay }}
            </strong>
          </div>

          <button
            type="button"
            class="btn primary sm"
            style="font-size:0.82rem;padding:5px 12px;font-weight:600;margin-left:auto"
            @click="openBookingModal()"
          >
            ＋ 預約會議室
          </button>
        </div>

        <!-- 視圖主卡片 (Timeline / Week / Mine) -->
        <div class="card schedule-main-card">
          <!-- 視圖 1：當日時間軸排程 (Timeline View) -->
          <div v-if="activeTab === 'timeline'" class="timeline-view-wrap">
            <!-- 橫向 08:00 ~ 19:00 時間軌道 -->
            <div style="overflow-x:auto;padding-bottom:6px;border-bottom:1px solid #e2e8f0;margin-bottom:10px">
              <div style="min-width:780px">
                <!-- 時間標尺刻度 -->
                <div style="display:grid;grid-template-columns:100px repeat(22, 1fr);border-bottom:1px solid #e2e8f0;padding-bottom:3px;margin-bottom:4px">
                  <div style="font-weight:700;color:#64748b;font-size:0.75rem;padding-left:4px">會議室 \ 時段</div>
                  <div
                    v-for="h in timeSlots"
                    :key="h"
                    style="text-align:center;font-size:0.7rem;color:#64748b;font-weight:600"
                  >
                    {{ h.endsWith(':00') ? h : '' }}
                  </div>
                </div>

                <!-- 時間軸軌道列 -->
                <div
                  v-for="room in rooms"
                  :key="room.id"
                  class="timeline-row"
                  style="display:grid;grid-template-columns:100px repeat(22, 1fr);align-items:center;height:42px;position:relative"
                >
                  <!-- 會議室標頭 -->
                  <div style="padding:4px;border-right:2px solid #e2e8f0;display:flex;align-items:center">
                    <strong :style="{ color: room.color || '#1e293b', fontSize: '0.84rem' }">{{ room.name }}</strong>
                  </div>

                  <!-- 22 個 30 分鐘格子 -->
                  <div
                    v-for="slot in timeSlots"
                    :key="slot"
                    :title="`點擊預約 ${room.name} (${slot})`"
                    class="timeline-cell"
                    style="height:36px;border-right:1px dashed #f1f5f9;cursor:pointer;position:relative;background:transparent"
                    @click="onCellClick(room, slot)"
                  ></div>

                  <!-- 覆蓋在時間軸上的已預約彩色方塊 -->
                  <div
                    v-for="b in getBookingsForRoom(room.id)"
                    :key="b.id"
                    class="booking-badge"
                    :style="getBookingBadgeStyle(b, room)"
                    :title="`${b.title}\n預約人：${b.user_name} (${b.user_dept || ''})\n時間：${b.start_time} ~ ${b.end_time}\n與會同仁：${b.attendees || '未填寫'}\n備註：${b.description || '無'}`"
                    @click.stop="openBookingModal(b)"
                  >
                    <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.74rem">
                      {{ b.title }}
                    </div>
                    <div style="font-size:0.68rem;opacity:0.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ b.start_time }}~{{ b.end_time }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 時間軸下方：當日預約詳細一覽清單 (直接看清所有會議，不必逐一找方塊) -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong style="color:#0f172a;font-size:0.9rem">
                  📋 【{{ currentDate }}】預約排程明細 (共 {{ currentDateBookings.length }} 場)
                </strong>
                <span class="muted" style="font-size:0.75rem">💡 點擊任一會議卡片即可檢視或編輯</span>
              </div>

              <div v-if="currentDateBookings.length" class="timeline-day-cards-grid">
                <div
                  v-for="b in currentDateBookings"
                  :key="b.id"
                  class="timeline-meeting-card"
                  :style="{ borderLeftColor: b.room_color || '#2563eb' }"
                  :title="b.user_id === currentUserId ? '點擊編輯您的預約' : '點擊檢視預約內容'"
                  @click="openBookingModal(b)"
                >
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-bottom:3px">
                    <strong style="font-size:0.88rem;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ b.title }}
                    </strong>
                    <span
                      style="font-size:0.7rem;padding:1px 6px;border-radius:4px;white-space:nowrap;font-weight:600"
                      :style="b.user_id === currentUserId ? 'background:#dbeafe;color:#1d4ed8' : 'background:#f1f5f9;color:#475569'"
                    >
                      {{ b.user_id === currentUserId ? '我的預約' : '檢視' }}
                    </span>
                  </div>
                  <div style="font-size:0.78rem;color:#2563eb;font-weight:700">
                    🕒 {{ b.start_time }} ~ {{ b.end_time }}
                  </div>
                  <div style="font-size:0.75rem;color:#64748b;margin-top:2px">
                    👤 召集人：{{ b.user_name }} ({{ b.user_dept || '同仁' }})
                  </div>
                  <div v-if="b.attendees" style="font-size:0.73rem;color:#475569;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    👥 與會：{{ b.attendees }}
                  </div>
                </div>
              </div>
              <div
                v-else
                style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:24px;text-align:center;font-size:0.85rem;color:#64748b"
              >
                今日全天尚無會議排程，點選上方時間軸或點擊「預約會議室」按鈕即可安排會議。
              </div>
            </div>
          </div>

          <!-- 視圖 2：本週排程檢視 (Week View，7列並排) -->
          <div v-else-if="activeTab === 'week'" class="week-view-wrap">
            <div class="week-days-grid">
              <div
                v-for="day in weekDays"
                :key="day.dateStr"
                class="week-day-col"
                :class="{ 'week-day-today': day.isToday }"
              >
                <!-- 日期標題 -->
                <div class="week-day-header">
                  <strong :style="{ color: day.isToday ? '#2563eb' : '#334155', fontSize: '0.84rem' }">
                    {{ day.label }}
                  </strong>
                  <div class="muted" style="font-size:0.72rem">{{ day.dateStr.slice(5) }}</div>
                </div>

                <!-- 當日預約列表 (內部自適應滾動) -->
                <div class="week-day-bookings-scroll">
                  <div
                    v-for="b in getBookingsForDate(day.dateStr)"
                    :key="b.id"
                    class="week-booking-item"
                    :style="{ borderLeftColor: b.room_color || '#2563eb' }"
                    :title="b.user_id === currentUserId ? '點擊編輯您的預約' : '點擊檢視預約詳情'"
                    @click="openBookingModal(b)"
                  >
                    <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#0f172a;font-size:0.78rem">
                      {{ b.title }}
                    </div>
                    <div style="font-size:0.74rem;color:#2563eb;font-weight:600">
                      {{ b.start_time }}~{{ b.end_time }}
                    </div>
                    <div class="muted" style="font-size:0.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ b.user_name }}
                    </div>
                  </div>
                  <div
                    v-if="!getBookingsForDate(day.dateStr).length"
                    style="color:#cbd5e1;font-size:0.72rem;text-align:center;padding:16px 0"
                  >
                    無排程
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 視圖 3：我的預約清單 (My Bookings) -->
          <div v-else-if="activeTab === 'mine'" class="mine-view-wrap">
            <div v-if="myBookings.length" class="mine-table-scroll">
              <table class="table" style="width:100%;font-size:0.84rem">
                <thead>
                  <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left">
                    <th style="padding:8px 10px">會議主旨</th>
                    <th style="padding:8px 10px">會議室</th>
                    <th style="padding:8px 10px">預約日期</th>
                    <th style="padding:8px 10px">時間區段</th>
                    <th style="padding:8px 10px">與會同仁</th>
                    <th style="padding:8px 10px;text-align:center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="b in myBookings"
                    :key="b.id"
                    style="border-bottom:1px solid #f1f5f9;cursor:pointer"
                    @click="openBookingModal(b)"
                  >
                    <td style="padding:8px 10px;font-weight:700;color:#1e293b">
                      {{ b.title }}
                    </td>
                    <td style="padding:8px 10px">
                      <span :style="{ color: b.room_color || '#2563eb', fontWeight: 600 }">
                        {{ b.room_name }}
                      </span>
                    </td>
                    <td style="padding:8px 10px;white-space:nowrap">
                      {{ b.booking_date }}
                    </td>
                    <td style="padding:8px 10px;color:#2563eb;font-weight:600;white-space:nowrap">
                      {{ b.start_time }} ~ {{ b.end_time }}
                    </td>
                    <td style="padding:8px 10px;color:#475569;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {{ b.attendees || '-' }}
                    </td>
                    <td style="padding:8px 10px;text-align:center" @click.stop>
                      <div style="display:flex;gap:4px;justify-content:center">
                        <button type="button" class="btn outline sm" style="font-size:0.75rem;padding:2px 8px" @click="openBookingModal(b)">
                          編輯
                        </button>
                        <button type="button" class="btn danger sm" style="font-size:0.75rem;padding:2px 8px" @click="onCancelBooking(b)">
                          取消
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else style="text-align:center;padding:32px 16px;color:#64748b">
              <div style="font-size:1.6rem;margin-bottom:6px">📋</div>
              <div style="font-size:0.95rem;font-weight:600;color:#334155;margin-bottom:4px">您目前沒有未來的會議室預約紀錄</div>
              <button type="button" class="btn primary sm" style="margin-top:8px" @click="openBookingModal()">
                立即預約會議室
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 預約／修改／檢視會議室彈窗 (雙欄緊湊設計，螢幕不需捲動) -->
    <div
      v-if="showBookingModal"
      class="modal-backdrop"
      style="position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;z-index:999;padding:12px"
      @click.self="closeBookingModal"
    >
      <div
        class="card modal-content"
        style="width:100%;max-width:760px;background:#fff;border-radius:12px;padding:18px 22px;box-shadow:0 10px 25px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <h3 style="margin:0;font-size:1.1rem;color:#1e293b;display:flex;align-items:center;gap:6px">
            <span>{{ isReadOnly ? '📋' : (isEditing ? '✏️' : '📅') }}</span>
            {{ isReadOnly ? '會議預約詳情（僅供檢視）' : (isEditing ? '編輯會議室預約' : '預約會議室') }}
          </h3>
          <button type="button" class="btn ghost sm" style="font-size:1.2rem;line-height:1" @click="closeBookingModal">
            ✕
          </button>
        </div>

        <!-- 唯讀模式提醒 Banner (只能修改自己預約的，其他人僅能查看) -->
        <div
          v-if="isReadOnly"
          style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:0.82rem;color:#166534"
        >
          ℹ️ 此預約由 <strong>{{ editingBooking?.user_name }}（{{ editingBooking?.user_dept || '同仁' }}）</strong> 建立。只能修改自己預約的會議，其他人僅能查看內容。
        </div>

        <form @submit.prevent="submitBooking">
          <!-- 衝突錯誤警告 -->
          <div
            v-if="bookingError"
            style="background:#fee2e2;border:1px solid #fecaca;color:#b91c1c;padding:8px 12px;border-radius:6px;font-size:0.82rem;margin-bottom:10px;display:flex;align-items:flex-start;gap:6px"
          >
            <span>⚠️</span>
            <div style="flex:1">{{ bookingError }}</div>
          </div>

          <!-- 雙欄排列表單 -->
          <div class="modal-form-grid">
            <!-- 左欄：基本時段與會議內容 -->
            <div style="display:flex;flex-direction:column;gap:10px">
              <!-- 會議室 -->
              <div>
                <label class="modal-label">會議室</label>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;border-radius:6px;font-size:0.88rem;font-weight:600;color:#1e293b;display:flex;align-items:center;gap:6px">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563eb"></span>
                  {{ rooms[0]?.name || '會議室' }}
                </div>
              </div>

              <!-- 會議主旨 -->
              <div>
                <label class="modal-label">會議主旨 <span v-if="!isReadOnly" style="color:#ef4444">*</span></label>
                <input
                  v-model="bookingForm.title"
                  type="text"
                  :required="!isReadOnly"
                  :disabled="isReadOnly"
                  placeholder="例如：業務週例會、主管策略會議"
                  class="input sm"
                  style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1"
                />
              </div>

              <!-- 日期與時段 -->
              <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:6px">
                <div>
                  <label class="modal-label">預約日期 <span v-if="!isReadOnly" style="color:#ef4444">*</span></label>
                  <input
                    v-model="bookingForm.booking_date"
                    type="date"
                    :required="!isReadOnly"
                    :disabled="isReadOnly"
                    class="input sm"
                    style="width:100%;padding:6px 4px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.82rem"
                  />
                </div>
                <div>
                  <label class="modal-label">開始時間 <span v-if="!isReadOnly" style="color:#ef4444">*</span></label>
                  <select
                    v-model="bookingForm.start_time"
                    :required="!isReadOnly"
                    :disabled="isReadOnly"
                    class="select sm"
                    style="width:100%;padding:6px 4px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.82rem"
                  >
                    <option v-for="t in allTimeOptions" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
                <div>
                  <label class="modal-label">結束時間 <span v-if="!isReadOnly" style="color:#ef4444">*</span></label>
                  <select
                    v-model="bookingForm.end_time"
                    :required="!isReadOnly"
                    :disabled="isReadOnly"
                    class="select sm"
                    style="width:100%;padding:6px 4px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.82rem"
                  >
                    <option v-for="t in allTimeOptions" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>

              <!-- 外部同仁 / 貴賓補充 -->
              <div>
                <label class="modal-label">外部訪客 / 其他備註人員</label>
                <div
                  v-if="isReadOnly"
                  style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;font-size:0.82rem;color:#1e293b"
                >
                  {{ externalAttendees || '無外部訪客' }}
                </div>
                <input
                  v-else
                  v-model="externalAttendees"
                  type="text"
                  placeholder="例如：汎佳顧問、外部會計師"
                  class="input sm"
                  style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1"
                />
              </div>
            </div>

            <!-- 右欄：同仁選擇 -->
            <div style="display:flex;flex-direction:column;gap:10px">
              <!-- 與會同仁選擇 -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <label class="modal-label">👥 與會同仁選擇 ({{ selectedAttendeeIds.length }} 位)</label>
                  <div v-if="!isReadOnly" style="display:flex;gap:4px">
                    <button type="button" class="btn outline sm" style="font-size:0.72rem;padding:1px 6px" @click="selectAllColleagues">全選</button>
                    <button type="button" class="btn outline sm" style="font-size:0.72rem;padding:1px 6px" @click="clearAllColleagues">清除</button>
                  </div>
                </div>

                <!-- 唯讀模式 -->
                <div v-if="isReadOnly" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;font-size:0.82rem;color:#1e293b;max-height:180px;overflow-y:auto">
                  {{ bookingForm.attendees || '未填寫與會同仁' }}
                </div>

                <!-- 編輯模式 -->
                <div v-else style="border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:#f8fafc">
                  <input
                    v-model="colleagueSearch"
                    type="text"
                    placeholder="🔍 搜尋同仁姓名、部門..."
                    class="input sm"
                    style="width:100%;padding:4px 8px;margin-bottom:6px;border-radius:4px;font-size:0.8rem;background:#fff"
                  />

                  <!-- Chips 標籤 -->
                  <div v-if="selectedAttendeeChips.length" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;max-height:56px;overflow-y:auto">
                    <span
                      v-for="u in selectedAttendeeChips"
                      :key="u.id"
                      style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:10px;font-size:0.72rem;display:inline-flex;align-items:center;gap:3px"
                    >
                      {{ u.name }}
                      <span role="button" style="cursor:pointer;font-weight:700" @click="toggleAttendee(u.id)">✕</span>
                    </span>
                  </div>

                  <!-- 勾選名單 -->
                  <div style="max-height:170px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:6px">
                    <label
                      v-for="u in filteredUsers"
                      :key="u.id"
                      style="display:flex;align-items:center;gap:4px;font-size:0.78rem;padding:2px 4px;border-radius:4px;cursor:pointer;user-select:none"
                      :style="selectedAttendeeIds.includes(u.id) ? 'background:#eff6ff;font-weight:600;color:#1e40af' : 'color:#334155'"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedAttendeeIds.includes(u.id)"
                        @change="toggleAttendee(u.id)"
                      />
                      <span>{{ u.name }}</span>
                      <span class="muted" style="font-size:0.7rem">({{ u.department || '同仁' }})</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 按鈕區 -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;border-top:1px solid #e2e8f0;padding-top:10px">
            <div>
              <button
                v-if="isEditing && !isReadOnly"
                type="button"
                class="btn danger sm"
                style="font-size:0.8rem;padding:5px 12px"
                @click="onCancelBooking(editingBooking)"
              >
                取消此預約
              </button>
            </div>
            <div style="display:flex;gap:8px">
              <button
                v-if="!isReadOnly"
                type="button"
                class="btn outline sm"
                style="font-size:0.82rem;padding:5px 14px"
                @click="closeBookingModal"
              >
                取消
              </button>
              <button
                v-if="!isReadOnly"
                type="submit"
                class="btn primary sm"
                style="font-size:0.82rem;padding:5px 16px;font-weight:600"
                :disabled="bookingSubmitting"
              >
                {{ bookingSubmitting ? '儲存中...' : (isEditing ? '儲存變更' : '確認預約') }}
              </button>
              <button
                v-else
                type="button"
                class="btn primary sm"
                style="font-size:0.82rem;padding:5px 16px"
                @click="closeBookingModal"
              >
                我知道了（關閉）
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { fetchUsers } from '@/api/users';
import {
  fetchMeetingRooms,
  fetchMeetingRoomStatuses,
  fetchMeetingBookings,
  createMeetingBooking,
  updateMeetingBooking,
  cancelMeetingBooking,
} from '@/api/meeting-rooms';

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.id);

// 標籤狀態：'timeline' | 'week' | 'mine'
const activeTab = ref('timeline');

function switchTab(tab) {
  activeTab.value = tab;
  if (tab === 'mine') {
    loadMyBookings();
  } else {
    loadBookings();
  }
}

watch(activeTab, (tab) => {
  if (tab === 'mine') {
    loadMyBookings();
  } else {
    loadBookings();
  }
});

// 日期相關
const currentDate = ref(getTodayDateStr());
const selectedCalendarDate = ref(getTodayDateStr());

// 當月月曆年份與月份 (1-based)
const todayDate = new Date();
const calYear = ref(todayDate.getFullYear());
const calMonth = ref(todayDate.getMonth() + 1);

// 資料狀態
const rooms = ref([]);
const roomStatuses = ref([]);
const bookings = ref([]);
const myBookings = ref([]);
const allUsers = ref([]);

// 同仁選擇器狀態
const colleagueSearch = ref('');
const selectedAttendeeIds = ref([]);
const externalAttendees = ref('');

// 預約彈窗狀態
const showBookingModal = ref(false);
const isEditing = ref(false);
const editingBooking = ref(null);
const bookingSubmitting = ref(false);
const bookingError = ref('');

// 判斷是否為預約建立者 (只能修改自己預約的，其他人僅能查看)
const isBookingOwner = computed(() => {
  if (!editingBooking.value) return true;
  return editingBooking.value.user_id === currentUserId.value;
});

const isReadOnly = computed(() => {
  if (!isEditing.value) return false;
  return !isBookingOwner.value;
});

const bookingForm = ref({
  room_id: '',
  title: '',
  booking_date: '',
  start_time: '09:00',
  end_time: '10:00',
  attendees: '',
  description: '',
  notify_email: true,
});

// 時間刻度 (08:00 到 19:00，每 30 分鐘一個 slot，共 22 個 slots)
const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30',
];

// 下拉選單所有可選時間 (08:00 ~ 21:00)
const allTimeOptions = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00',
];

function getTodayDateStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const formatCurrentDateDisplay = computed(() => {
  if (!currentDate.value) return '';
  const parts = currentDate.value.split('-');
  if (parts.length < 3) return currentDate.value;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const weekNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return `${parts[0]}年${parts[1]}月${parts[2]}日 (${weekNames[d.getDay()]})`;
});

// 當月月曆所有格子計算 (包含前後月份補齊格子)
const calendarGridDays = computed(() => {
  const year = calYear.value;
  const month = calMonth.value;

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 是週日
  const daysInMonth = lastDay.getDate();

  const days = [];
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = getTodayDateStr();

  // 補足前一個月天數
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;
    days.push({
      year: y,
      month: m,
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // 當月天數
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad(month)}-${pad(d)}`;
    days.push({
      year,
      month,
      day: d,
      dateStr,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // 補足後一個月天數使總數為 35 或 42 格
  const totalSlots = days.length > 35 ? 42 : 35;
  const remaining = totalSlots - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;
    days.push({
      year: y,
      month: m,
      day: d,
      dateStr,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
});

// 當前點選日期的所有預約
const selectedDayBookings = computed(() => {
  return getBookingsForDate(selectedCalendarDate.value);
});

// 當前時間軸日期（currentDate）的所有預約
const currentDateBookings = computed(() => {
  return getBookingsForDate(currentDate.value);
});

function selectCalendarDate(dateStr) {
  selectedCalendarDate.value = dateStr;
  currentDate.value = dateStr;
  const [y, m] = dateStr.split('-').map(Number);
  if (y !== calYear.value || m !== calMonth.value) {
    calYear.value = y;
    calMonth.value = m;
    loadBookings();
  }
}

function changeCalMonth(delta) {
  let m = calMonth.value + delta;
  let y = calYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  calYear.value = y;
  calMonth.value = m;
  loadBookings();
}

function goToCalToday() {
  const d = new Date();
  calYear.value = d.getFullYear();
  calMonth.value = d.getMonth() + 1;
  const todayStr = getTodayDateStr();
  selectedCalendarDate.value = todayStr;
  currentDate.value = todayStr;
  loadBookings();
}

function onCurrentDateChange() {
  if (currentDate.value) {
    selectedCalendarDate.value = currentDate.value;
    const [y, m] = currentDate.value.split('-').map(Number);
    calYear.value = y;
    calMonth.value = m;
  }
  loadBookings();
}

// 計算本週 7 天日期陣列 (以週一為起始日)
const weekDays = computed(() => {
  if (!currentDate.value) return [];
  const parts = currentDate.value.split('-');
  const curr = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayOfWeek = curr.getDay(); // 0 是週日
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diffToMonday);

  const pad = (n) => String(n).padStart(2, '0');
  const weekNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const todayStr = getTodayDateStr();

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    days.push({
      dateStr,
      label: weekNames[i],
      isToday: dateStr === todayStr,
    });
  }
  return days;
});

function goToToday() {
  const todayStr = getTodayDateStr();
  currentDate.value = todayStr;
  selectedCalendarDate.value = todayStr;
  const d = new Date();
  calYear.value = d.getFullYear();
  calMonth.value = d.getMonth() + 1;
  loadBookings();
}

function changeDate(delta) {
  const parts = currentDate.value.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (activeTab.value === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setDate(d.getDate() + delta);
  }
  const pad = (n) => String(n).padStart(2, '0');
  const newDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  currentDate.value = newDate;
  selectedCalendarDate.value = newDate;
  calYear.value = d.getFullYear();
  calMonth.value = d.getMonth() + 1;
  loadBookings();
}

function getBookingsForRoom(roomId) {
  return bookings.value.filter((b) => b.room_id === roomId && b.booking_date === currentDate.value);
}

function getBookingsForDate(dateStr) {
  return bookings.value.filter((b) => b.booking_date === dateStr);
}

/** 計算時間軸方塊的絕對定位樣式 */
function getBookingBadgeStyle(booking, room) {
  const [startH, startM] = booking.start_time.split(':').map(Number);
  const [endH, endM] = booking.end_time.split(':').map(Number);

  const baseMinutes = 8 * 60; // 08:00
  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  const totalTimelineMinutes = 11 * 60; // 08:00 到 19:00 = 11 小時 = 660 分鐘
  const leftPercent = Math.max(0, ((startTotalMinutes - baseMinutes) / totalTimelineMinutes) * 100);
  const widthPercent = Math.min(100 - leftPercent, Math.max(4, ((endTotalMinutes - startTotalMinutes) / totalTimelineMinutes) * 100));

  return {
    position: 'absolute',
    left: `calc(100px + (100% - 100px) * ${leftPercent / 100})`,
    width: `calc((100% - 100px) * ${widthPercent / 100})`,
    top: '3px',
    bottom: '3px',
    background: room.color || '#2563eb',
    color: '#fff',
    borderRadius: '5px',
    padding: '2px 6px',
    cursor: 'pointer',
    zIndex: 2,
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  };
}

function onCellClick(room, slot) {
  const [h, m] = slot.split(':').map(Number);
  let nextH = h + 1;
  let nextM = m;
  const pad = (n) => String(n).padStart(2, '0');
  const nextSlot = `${pad(nextH)}:${pad(nextM)}`;

  openBookingModal({
    room_id: room.id,
    booking_date: currentDate.value,
    start_time: slot,
    end_time: allTimeOptions.includes(nextSlot) ? nextSlot : slot,
  });
}

// 同仁選擇相關邏輯
const filteredUsers = computed(() => {
  const q = colleagueSearch.value.trim().toLowerCase();
  if (!q) return allUsers.value;
  return allUsers.value.filter(
    (u) =>
      String(u.name || '').toLowerCase().includes(q) ||
      String(u.department || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q)
  );
});

const selectedAttendeeChips = computed(() => {
  return allUsers.value.filter((u) => selectedAttendeeIds.value.includes(u.id));
});

function toggleAttendee(id) {
  if (isReadOnly.value) return;
  const idx = selectedAttendeeIds.value.indexOf(id);
  if (idx >= 0) {
    selectedAttendeeIds.value.splice(idx, 1);
  } else {
    selectedAttendeeIds.value.push(id);
  }
}

function selectAllColleagues() {
  if (isReadOnly.value) return;
  selectedAttendeeIds.value = allUsers.value.map((u) => u.id);
}

function clearAllColleagues() {
  if (isReadOnly.value) return;
  selectedAttendeeIds.value = [];
}

function openBookingModal(initial = {}) {
  bookingError.value = '';
  colleagueSearch.value = '';

  if (initial && initial.id) {
    // 編輯或檢視現有預約
    isEditing.value = true;
    editingBooking.value = initial;

    // 解析 attendee_ids
    const idList = String(initial.attendee_ids || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
    selectedAttendeeIds.value = idList;

    // 完整還原原本注記的外部訪客內容
    if (initial.external_attendees !== undefined && initial.external_attendees !== null && String(initial.external_attendees).trim()) {
      externalAttendees.value = String(initial.external_attendees).trim();
    } else if (initial.attendees) {
      // 向下相容：從已儲存的 attendees 字串中解析非內部同仁名稱
      const internalNames = allUsers.value
        .filter((u) => idList.includes(u.id))
        .map((u) => `${u.name} (${u.department || '同仁'})`);
      const allParts = String(initial.attendees)
        .split(/[、,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const externals = allParts.filter(
        (p) => !internalNames.includes(p) && !allUsers.value.some((u) => p.startsWith(u.name))
      );
      externalAttendees.value = externals.join('、 ');
    } else {
      externalAttendees.value = '';
    }

    bookingForm.value = {
      room_id: initial.room_id,
      title: initial.title,
      booking_date: initial.booking_date,
      start_time: initial.start_time,
      end_time: initial.end_time,
      attendees: initial.attendees || '',
      description: initial.description || '',
      notify_email: initial.notify_email !== 0,
    };
  } else {
    // 新增預約
    isEditing.value = false;
    editingBooking.value = null;
    selectedAttendeeIds.value = [];
    externalAttendees.value = '';

    const defaultRoomId = initial.room_id || (rooms.value[0] ? rooms.value[0].id : '');
    const dateToUse = initial.booking_date || selectedCalendarDate.value || currentDate.value;
    const startToUse = initial.start_time || '09:00';
    let endToUse = '10:00';
    const sIdx = allTimeOptions.indexOf(startToUse);
    if (sIdx >= 0 && sIdx + 2 < allTimeOptions.length) {
      endToUse = allTimeOptions[sIdx + 2];
    }

    bookingForm.value = {
      room_id: defaultRoomId,
      title: '',
      booking_date: dateToUse,
      start_time: startToUse,
      end_time: endToUse,
      attendees: '',
      description: '',
      notify_email: true,
    };
  }
  showBookingModal.value = true;
}

function closeBookingModal() {
  showBookingModal.value = false;
  bookingError.value = '';
}

async function submitBooking() {
  if (isReadOnly.value) return;
  bookingError.value = '';
  bookingSubmitting.value = true;
  try {
    const chosenUsers = allUsers.value.filter((u) => selectedAttendeeIds.value.includes(u.id));
    const chosenNames = chosenUsers.map((u) => `${u.name} (${u.department || '同仁'})`);
    if (externalAttendees.value.trim()) {
      chosenNames.push(externalAttendees.value.trim());
    }
    const combinedAttendees = chosenNames.join('、 ');

    const payload = {
      ...bookingForm.value,
      description: '',
      attendees: combinedAttendees || bookingForm.value.attendees,
      attendee_ids: selectedAttendeeIds.value.join(','),
      external_attendees: externalAttendees.value.trim(),
      attendee_count: Math.max(1, chosenUsers.length + (externalAttendees.value.trim() ? 1 : 0)),
      notify_email: 1, // 預設一律自動發送通知信
    };

    if (isEditing.value && editingBooking.value) {
      await updateMeetingBooking(editingBooking.value.id, payload);
    } else {
      await createMeetingBooking(payload);
    }
    closeBookingModal();
    await loadAllData();
  } catch (err) {
    bookingError.value = err.message || '預約儲存失敗';
  } finally {
    bookingSubmitting.value = false;
  }
}

async function onCancelBooking(booking) {
  if (!booking || !booking.id) return;
  if (isReadOnly.value) {
    alert('只能取消自己預約的會議，其他人僅能查看。');
    return;
  }
  const ok = window.confirm(`確定要取消「${booking.title}」的會議室預約嗎？`);
  if (!ok) return;

  try {
    await cancelMeetingBooking(booking.id);
    closeBookingModal();
    await loadAllData();
  } catch (err) {
    alert(err.message || '取消失敗');
  }
}

// 載入資料
async function loadUsersData() {
  try {
    const res = await fetchUsers();
    allUsers.value = (res.users || []).filter((u) => u.active !== 0);
  } catch (err) {
    console.error('loadUsersData error:', err);
  }
}

async function loadBookings() {
  try {
    const grid = calendarGridDays.value;
    if (grid && grid.length) {
      const res = await fetchMeetingBookings({
        start_date: grid[0].dateStr,
        end_date: grid[grid.length - 1].dateStr,
      });
      bookings.value = res.bookings || [];
    } else {
      const res = await fetchMeetingBookings({
        month: `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`,
      });
      bookings.value = res.bookings || [];
    }
  } catch (err) {
    console.error('loadBookings error:', err);
  }
}

async function loadMyBookings() {
  try {
    const res = await fetchMeetingBookings({ my_only: true });
    myBookings.value = res.bookings || [];
  } catch (err) {
    console.error('loadMyBookings error:', err);
  }
}

async function loadAllData() {
  try {
    const [roomsRes, statusRes] = await Promise.all([
      fetchMeetingRooms(),
      fetchMeetingRoomStatuses(),
      loadUsersData(),
    ]);
    rooms.value = roomsRes.rooms || [];
    roomStatuses.value = statusRes.statuses || [];
    await Promise.all([loadBookings(), loadMyBookings()]);
  } catch (err) {
    console.error('loadAllData error:', err);
  }
}

onMounted(() => {
  loadAllData();
});
</script>

<style scoped>
.meeting-rooms-page {
  padding-bottom: 8px;
}

/* 主佈局：雙欄自適應（高度緊湊，不需滾輪滾動） */
.meeting-layout-grid {
  display: grid;
  grid-template-columns: 310px 1fr;
  gap: 12px;
  align-items: start;
}

.meeting-left-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meeting-right-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

/* 1. 會議室即時狀態卡片 */
.room-status-mini-card {
  padding: 10px 12px;
  margin: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.status-pill {
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-pill.in-use {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.status-pill.free {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.room-status-snippet {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-bottom: 8px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 2. 當月月曆 */
.calendar-mini-card {
  padding: 10px 12px;
  margin: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.cal-nav-btn {
  padding: 1px 6px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.4;
}

.cal-weekdays-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
  font-size: 0.74rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
  background: #f8fafc;
  padding: 3px 0;
  border-radius: 4px;
}

.cal-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cal-day-cell {
  height: 27px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 1px 2px;
  cursor: pointer;
  background: #ffffff;
  transition: all 0.12s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cal-day-cell:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.cal-day-other-month {
  color: #cbd5e1;
  background: #fafafa;
}

.cal-day-num {
  font-size: 0.75rem;
  font-weight: 600;
  padding-left: 2px;
}

.cal-day-today {
  border: 2px solid #2563eb !important;
  font-weight: 700;
}

.cal-day-has-booking {
  background: #eff6ff !important;
  border-color: #93c5fd !important;
}

.cal-booking-badge {
  font-size: 0.65rem;
  font-weight: 700;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 3px;
  padding: 0 3px;
  line-height: 1.2;
}

.cal-day-selected {
  background: #2563eb !important;
  color: #ffffff !important;
  border-color: #1d4ed8 !important;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
}

.cal-day-selected .cal-booking-badge {
  background: #ffffff !important;
  color: #2563eb !important;
}

.cal-day-selected .cal-day-num {
  color: #ffffff !important;
}

/* 3. 所選日摘要卡片 */
.selected-day-mini-card {
  padding: 10px 12px;
  margin: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.selected-day-list-scroll {
  max-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-right: 2px;
}

.selected-day-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #2563eb;
  border-radius: 5px;
  padding: 5px 8px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.selected-day-item:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

/* 右欄排程工具列 */
.schedule-toolbar-card {
  padding: 7px 12px;
  margin: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.meeting-tabs-wrap {
  display: inline-flex;
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
}

.meeting-tab-btn {
  border: 1px solid #cbd5e1 !important;
  background: #ffffff !important;
  color: #1e293b !important;
  font-weight: 700 !important;
  font-size: 0.84rem;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  user-select: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.meeting-tab-btn:hover {
  background: #e2e8f0 !important;
  color: #0f172a !important;
  border-color: #94a3b8 !important;
}

.meeting-tab-btn.active {
  background: #2563eb !important;
  color: #ffffff !important;
  border-color: #1d4ed8 !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.35);
}

/* 右欄主內容卡片 */
.schedule-main-card {
  padding: 12px 14px;
  margin: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.timeline-cell:hover {
  background: rgba(37, 99, 235, 0.08) !important;
}

.booking-badge:hover {
  filter: brightness(1.08);
}

/* 當日明細卡片清單網格 */
.timeline-day-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
}

.timeline-meeting-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid #2563eb;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.timeline-meeting-card:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  transform: translateY(-1px);
}

/* 週檢視網格 */
.week-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.week-day-col {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
  min-height: 330px;
  display: flex;
  flex-direction: column;
}

.week-day-today {
  background: #eff6ff !important;
  border: 2px solid #3b82f6 !important;
}

.week-day-header {
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid #cbd5e1;
  margin-bottom: 6px;
}

.week-day-bookings-scroll {
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-y: auto;
  max-height: 280px;
}

.week-booking-item {
  padding: 5px 6px;
  border-radius: 5px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #2563eb;
  cursor: pointer;
  transition: transform 0.1s;
}

.week-booking-item:hover {
  transform: translateY(-1px);
  background: #f0f7ff;
}

/* 我的預約滾動表格 */
.mine-table-scroll {
  max-height: 330px;
  overflow-y: auto;
}

/* 彈窗樣式 */
.modal-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.modal-label {
  display: block;
  font-weight: 600;
  font-size: 0.8rem;
  margin-bottom: 3px;
  color: #334155;
}

@media (max-width: 960px) {
  .meeting-layout-grid {
    grid-template-columns: 1fr !important;
  }
  .modal-form-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
