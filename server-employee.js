/**
 * سيرفر تطبيق الموظفين - نسخة الويب
 * يعمل على البورت 3002
 * يوجّه طلبات API إلى السيرفر الرئيسي (البورت 3000)
 */

const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.EMPLOYEE_PORT || 3002;
const MAIN_HOST = process.env.MAIN_HOST || 'localhost';
const MAIN_PORT = process.env.MAIN_PORT || 3000;

app.use('/api', (req, res) => {
    const headers = { ...req.headers };
    delete headers.host;
    const proxyReq = http.request({
        hostname: MAIN_HOST,
        port: MAIN_PORT,
        path: req.originalUrl,
        method: req.method,
        headers,
    }, (proxyRes) => {
        res.status(proxyRes.statusCode);
        Object.keys(proxyRes.headers).forEach(k => res.setHeader(k, proxyRes.headers[k]));
        proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ error: 'لا يمكن الاتصال بالسيرفر الرئيسي. شغّل السيرفر على البورت 3000 أولاً' });
    });
    req.pipe(proxyReq);
});

app.use(express.static(path.join(__dirname, 'employee-web')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'employee-web', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`تطبيق الموظفين (ويب) يعمل على: http://0.0.0.0:${PORT}`);
    console.log(`يرجى تشغيل السيرفر الرئيسي على البورت 3000`);
});
