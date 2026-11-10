# 🏢 企業會議室預約管理系統 (Meeting Room Booking System)

一套獨立、現代化且直覺的企業會議室排程與預約管理系統。

專為企業內部同仁協作設計，提供免滑鼠滾輪的雙欄儀表板佈局、橫向時間軸排程、當月月曆預約熱點標示、與會同仁多選名單、自動寄送會議通知信、以及開會前五分鐘即時桌面橫幅提醒。

---

## ✨ 核心功能特色

1. **🖥️ 免滑鼠滾輪雙欄儀表板 (No-Scroll Dual Layout)**
   - **左側邊欄 (~310px)**：會議室即時使用狀態卡片、當月月曆（點選日期即時高亮與標記預約點）、所選日預約快速摘要。
   - **右側主工作區 (1fr)**：高對比分頁切換（當日排程軸 / 本週排程表 / 我的預約）、日期導航切換列、當日時間軸軌道與會議卡片一覽清單。
   - 專為 1080p 與筆記型電腦螢幕優化，主頁面無需滾輪滾動即可縱覽全局。

2. **📊 視覺化時間軸軌道 (Timeline View)**
   - 橫向 08:00 ~ 19:00（每 30 分鐘一格）時間軸軌道，一目了然空檔與佔用時段。
   - 點選空白格子可直接帶入時段快速預約。
   - 時間軸下方直覺陳列當日所有會議卡片，包含會議主旨、起訖時間、召集人與與會同仁。

3. **🗓️ 本週排程 (Week View) 與我的預約 (My Bookings)**
   - 週視圖提供週一至週日 7 天並列卡片，每欄內部自適應滾動。
   - 我的預約清楚羅列自身名下預約，支援一鍵再次編輯或取消釋出時段。

4. **👥 與會同仁選擇與自帶 Chips 標籤**
   - 支援搜尋同仁姓名、部門，提供「全選 / 清除」與勾選名單。
   - 支援額外填寫外部訪客／貴賓補充人員。

5. **✉️ 自動寄送 Email 會議通知**
   - 預約建立或修改後，系統自動觸發寄送完整會議資訊（主旨、時間、地點、召集人、與會名冊）至所有選取同仁的電子信箱。

6. **⏰ 開會前 5 分鐘即時置頂提醒**
   - 頂部導航列自動輪詢 `/api/meeting-bookings/reminders`，當距會議開始 5 分鐘內時，自動彈出醒目提醒橫幅。

7. **🔒 權限與資料隔離**
   - 「只能修改自己預約的，其他人僅能查看」：非本人預約點擊後開啟唯讀模式，後端 API 強制校驗使用者 ID（403 禁止越權修改或刪除）。

8. **💾 零外部相依檔案型資料庫 (Node 22 SQLite)**
   - 採用 Node.js 22 內建 `node:sqlite`（`DatabaseSync`），不需安裝 Python、C++ 編譯環境或額外依賴庫，開箱即用。

---

## 🚀 快速開始

### 環境需求
- **Node.js**: v22.0.0 以上
- **npm**: v10.0.0 以上

### 安裝相依套件

```bash
# 於專案根目錄執行一鍵安裝前後端依賴
npm run setup
```

或分別安裝：

```bash
cd server && npm install
cd ../frontend && npm install
```

### 本地開發啟動 (前後端同步啟動)

```bash
npm run dev
```

- **前端介面**：`http://localhost:5173`
- **後端 API**：`http://localhost:3849`
- 系統內建預設同仁帳號：`tzuming`、`admin`、`colleague1`、`colleague2`、`colleague3`（密碼預設均為 `123456`）。

### 生產環境建置與執行

```bash
# 1. 打包前端
npm run build

# 2. 啟動生產伺服器 (靜態託管 + API 合一)
npm start
```

服務將運行於 `http://localhost:3849`。

---

## 🐳 Docker 容器化部署

本專案支援以 Docker / Docker Compose 一鍵部署：

```bash
# 啟動容器
docker compose up -d

# 查看運行狀態
docker compose ps

# 查看日誌
docker compose logs -f
```

資料庫與設定檔自動持久化掛載於 `./data` 目錄。

---

## ⚙️ 環境變數設定 (`.env`)

複製 `.env.example` 為 `.env` 並依需求調整：

```env
PORT=3849
DB_TYPE=sqlite
DB_PATH=./data/meeting_room.db
JWT_SECRET=your_jwt_secret_key

# SMTP 郵件通知 (選填)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="會議預約系統 <no-reply@company.com>"
BASE_URL=http://localhost:3849
```

---

## 📦 專案結構

```
meeting-room-system/
├── .gitignore
├── .env.example
├── README.md
├── package.json
├── Dockerfile
├── docker-compose.yml
├── server/
│   ├── package.json
│   ├── index.js             # Express 服務主程式
│   ├── db.js                # 資料庫連線 (Node 22 node:sqlite)
│   ├── schema.js            # 資料表結構與種子資料
│   ├── mail.js              # SMTP 郵件發送服務
│   └── routes/
│       ├── auth.js          # 身份驗證與同仁名單
│       └── meeting-rooms.js # 會議室、預約與即時提醒 REST API
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.js
        ├── App.vue          # 頂部導航、同仁切換與 5 分鐘提醒橫幅
        ├── style.css        # 企業主題與按鈕工具類
        ├── api/
        │   ├── client.js
        │   ├── users.js
        │   └── meeting-rooms.js
        ├── stores/
        │   └── auth.js
        └── views/
            └── MeetingRoomsView.vue # 免滾輪雙欄排程主視圖
```

---

## 📄 License
[MIT License](LICENSE)
