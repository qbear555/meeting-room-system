'use strict';

const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: user,
      pass: pass,
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || '會議預約系統 <no-reply@company.com>';

  if (!transporter) {
    console.log(`[mail:mock] (SMTP not configured, logging output)`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    return { mock: true, success: true };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    console.log(`[mail:sent] Message sent: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mail:error] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendMail,
};
