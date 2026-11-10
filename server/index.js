'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDb } = require('./db');
const { applySchema } = require('./schema');
const registerAuth = require('./routes/auth');
const registerMeetingRooms = require('./routes/meeting-rooms');

const app = express();
const PORT = process.env.PORT || 3849;

// 中介軟體
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化資料庫
const db = initDb();
applySchema(db);

// 註冊認證路由與中介層
const { authMiddleware } = registerAuth(app, db);

// 註冊會議室路由
registerMeetingRooms(app, { db, authMiddleware });

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'meeting-room-system', timestamp: new Date().toISOString() });
});

// 前端靜態檔案託管 (生產環境打包後)
const publicDir = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(publicDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtml = path.join(publicDir, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Meeting Room System API</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>📅 企業會議室預約管理系統 API 服務運行中</h2>
          <p>若要瀏覽完整前台畫面，請在前端目錄執行 <code>npm run dev</code> 或在根目錄執行 <code>npm run build</code>。</p>
          <p><a href="/api/health">檢查 API 健康狀態</a></p>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 會議室預約系統後端啟動於 http://localhost:${PORT}`);
  console.log(`===============================================`);
});
