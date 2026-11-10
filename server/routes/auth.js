'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'meeting_room_secret_key_change_in_production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.cookies?.token || req.query.token);

  if (!token) {
    return res.status(401).json({ error: '請先登入系統' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }
}

module.exports = function registerAuth(app, db) {
  // 登入
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '請輸入帳號與密碼' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '帳號或密碼不正確' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: tokenPayload,
    });
  });

  // 目前登入同仁資訊
  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, username, name, email, department, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: '找不到使用者' });
    res.json({ user });
  });

  // 同仁列表（供與會人員選擇器使用）
  app.get('/api/users', authMiddleware, (req, res) => {
    const users = db.prepare(`
      SELECT id, name, email, department, role, username
      FROM users
      WHERE active = 1
      ORDER BY department ASC, name ASC
    `).all();
    res.json({ users });
  });

  return { authMiddleware };
};
