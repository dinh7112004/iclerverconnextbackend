
/**
 * Script Đánh Thức Server (Keep-Alive) - Phiên bản không cần cài thư viện
 * Chạy lệnh: node keep_alive.js
 */

const https = require('https');

const URL = 'https://iclerverconnextbackend.onrender.com/api/v1/auth/me';
const INTERVAL = 30000;

console.log('🚀 Đang bắt đầu chiến dịch ĐÁNH THỨC SERVER (Dùng HTTPS Native)...');
console.log('🔗 Mục tiêu:', URL);

function ping() {
    https.get(URL, (res) => {
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Server vẫn đang thức (Status: ${res.statusCode})`);
    }).on('error', (e) => {
        console.log(`[${new Date().toLocaleTimeString()}] ❌ Đang đánh thức server... (Lỗi: ${e.message})`);
    });
}

ping();
setInterval(ping, INTERVAL);
