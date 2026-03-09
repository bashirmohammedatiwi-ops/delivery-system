const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database/init');
const orderService = require('./services/orderService');
const driverService = require('./services/driverService');
const feeCollectionService = require('./services/feeCollectionService');
const reportService = require('./services/reportService');
const labelService = require('./services/labelService');
const authService = require('./services/authService');
const userAuthService = require('./services/userAuthService');
const regionService = require('./services/regionService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// نقطة فحص الصحة لـ Docker (قبل أي مسار آخر)
app.get('/health', (_req, res) => res.status(200).send('OK'));

app.use(express.static(path.join(__dirname, 'public')));

// ─── تهيئة قاعدة البيانات ───
let dbReady = false;
db.initSchema().then(() => {
    dbReady = true;
    userAuthService.ensureDefaultAdmin();
    console.log('Database ready');
}).catch(err => {
    console.error('Database init failed:', err);
    process.exit(1);
});

// ─── مصادقة مستخدمي التطبيق (ويب) ───
function requireAppAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const user = userAuthService.getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'غير مصرح - سجّل الدخول' });
    req.appUser = user;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.appUser || req.appUser.Role !== 'admin') {
        return res.status(403).json({ error: 'صلاحية المدير مطلوبة' });
    }
    next();
}

// ─── API: تسجيل الدخول (التطبيق الإداري) ───
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة السر' });
        const user = userAuthService.verifyCredentials(username, password);
        if (!user) return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيح' });
        const token = userAuthService.createSession(user.UserID);
        res.json({ success: true, user, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', requireAppAuth, (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        userAuthService.logoutUser(token);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', requireAppAuth, (req, res) => {
    res.json(req.appUser);
});

// جلسة موظف مشتركة (بدون تسجيل دخول)
app.post('/api/auth/employee-session', async (req, res) => {
    try {
        const token = userAuthService.createEmployeeSession();
        const user = userAuthService.getUserByToken(token);
        res.json({ success: true, token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: المناطق ───
app.get('/api/regions', requireAppAuth, (req, res) => {
    try {
        res.json(regionService.getAllRegions());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/regions', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const { regionName, deliveryFeeIQD, regionArea } = req.body;
        const result = regionService.createRegion(regionName, deliveryFeeIQD, regionArea);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/regions/:id', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { regionName, deliveryFeeIQD, regionArea } = req.body;
        const result = regionService.updateRegion(id, regionName, deliveryFeeIQD, regionArea);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/regions/:id', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = regionService.deleteRegion(id);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: إدارة المستخدمين (المدير فقط) ───
app.get('/api/users', requireAppAuth, requireAdmin, (req, res) => {
    try {
        res.json(userAuthService.getAllUsers());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const { username, password, displayName, role, secretCode } = req.body;
        const result = userAuthService.createUser(username, password, displayName, role || 'employee', secretCode);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = userAuthService.updateUser(id, req.body);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = userAuthService.deleteUser(id);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: السائقين ───
app.post('/api/drivers/verify-password', requireAppAuth, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || !String(password).trim()) return res.status(400).json({ error: 'أدخل الرمز السري' });
        const driver = driverService.getDriverByPassword(password);
        if (!driver) return res.status(401).json({ error: 'الرمز السري غير صحيح' });
        res.json({ success: true, driver: { DriverID: driver.DriverID, DriverName: driver.DriverName } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/drivers', requireAppAuth, async (req, res) => {
    try {
        const activeOnly = req.query.active !== 'false';
        const list = driverService.getAllDrivers(activeOnly);
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { name, phone } = req.body;
        driverService.createDriver(name || '', phone || '');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/drivers/:id', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { name, phone, active } = req.body;
        driverService.updateDriver(parseInt(req.params.id), name || '', phone || '', active !== false);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/drivers/:id', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        driverService.deleteDriver(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// مسار منفصل لتجنب تعارض مع /api/drivers/:id
app.post('/api/driver-credentials', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { driverId } = req.body;
        const id = parseInt(driverId);
        if (!id) return res.status(400).json({ error: 'رقم السائق مطلوب' });
        const driver = driverService.getDriverById(id);
        if (!driver) return res.status(404).json({ error: 'السائق غير موجود' });
        if (!driver.Username) return res.status(400).json({ error: 'لا يوجد حساب لهذا السائق' });
        res.json({ username: driver.Username, password: driver.StoredPassword || '-' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers/create-account', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { driverId, username, password } = req.body;
        const id = parseInt(driverId);
        if (!id) return res.status(400).json({ error: 'رقم السائق مطلوب' });
        if (!username || !username.trim()) return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
        if (!password || !password.trim()) return res.status(400).json({ error: 'كلمة السر مطلوبة' });
        const result = authService.createDriverAccount(id, username.trim(), password.trim());
        if (!result.success) return res.status(400).json({ error: result.error });
        authService.createSession(id);
        res.json({ success: true, username: result.username, password: result.password });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/drivers/fees-collected-status', requireAppAuth, requireAdmin, (req, res) => {
    try {
        const driverId = parseInt(req.query.driverId);
        const orderDate = (req.query.orderDate || '').trim().slice(0, 10);
        if (!driverId || !orderDate) return res.status(400).json({ error: 'المعاملات مطلوبة' });
        const collected = feeCollectionService.isFeesCollected(driverId, orderDate);
        res.json({ collected });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers/collect-fees', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { driverId, orderDate } = req.body;
        if (feeCollectionService.isFeesCollected(parseInt(driverId), orderDate)) {
            return res.status(400).json({ error: 'تم دفع المبلغ مسبقاً - لا يمكن الدفع مرتين' });
        }
        const result = feeCollectionService.recordCollection(
            parseInt(driverId), orderDate, req.appUser?.UserID
        );
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers/regenerate-password', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { driverId, password } = req.body;
        const id = parseInt(driverId);
        if (!id) return res.status(400).json({ error: 'رقم السائق مطلوب' });
        if (!password || !password.trim()) return res.status(400).json({ error: 'كلمة السر مطلوبة' });
        const result = authService.createDriverAccount(id, null, password.trim());
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json({ success: true, username: result.username, password: result.password });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: تطبيق السائق (تسجيل الدخول) ───
app.post('/api/auth/driver-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'أدخل اسم المستخدم والرمز' });
        const driver = authService.verifyDriverCredentials(username, password);
        if (!driver) return res.status(401).json({ error: 'اسم المستخدم أو الرمز غير صحيح' });
        const token = authService.createSession(driver.DriverID);
        const { PasswordHash, ...driverSafe } = driver;
        res.json({ success: true, driver: driverSafe, token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/driver-logout', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        authService.logoutDriver(token);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/orders', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح - سجّل الدخول مجدداً' });
        const orders = orderService.getOrders({ driverId: driver.DriverID, status: 'AssignedToDriver' });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/me', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const { PasswordHash, ...driverSafe } = driver;
        res.json(driverSafe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/driver/orders/:id/deliver', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) return res.status(400).json({ error: 'معرّف الطلب غير صالح' });
        const result = orderService.markDeliveredByDriver(orderId, driver.DriverID);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/driver/orders/:id/return', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const orderId = parseInt(req.params.id, 10);
        if (isNaN(orderId)) return res.status(400).json({ error: 'معرّف الطلب غير صالح' });
        const returnReason = req.body?.returnReason || '';
        const result = orderService.markReturnedByDriver(orderId, driver.DriverID, returnReason);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/stats', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const stats = orderService.getDriverStats(driver.DriverID, date);
        stats.feesCollected = feeCollectionService.isFeesCollected(driver.DriverID, date);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/delivered-orders', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const orders = orderService.getDriverDeliveredOrders(driver.DriverID, date);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/returned-orders', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const orders = orderService.getDriverReturnedOrders(driver.DriverID, date);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/pending-orders', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const dateFrom = req.query.dateFrom || new Date().toISOString().slice(0, 10);
        const dateTo = req.query.dateTo || dateFrom;
        const data = orderService.getPendingOrdersByArea(dateFrom, dateTo);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/driver/pending-orders-list', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const area = (req.query.area || '').trim();
        if (!area || !['الكرخ', 'الرصافة'].includes(area)) {
            return res.status(400).json({ error: 'حدد المنطقة: الكرخ أو الرصافة' });
        }
        const orders = orderService.getPendingOrdersList(date, area);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/driver/receive-order', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        const driver = authService.getDriverByToken(token);
        if (!driver) return res.status(401).json({ error: 'غير مصرح' });
        let { shipmentNumber } = req.body || {};
        if (!shipmentNumber || !String(shipmentNumber).trim()) {
            return res.status(400).json({ error: 'أدخل رقم الشحنة' });
        }
        shipmentNumber = String(shipmentNumber).replace(/\D/g, '') || String(shipmentNumber).trim();
        if (!shipmentNumber) return res.status(400).json({ error: 'رقم الشحنة غير صالح' });
        const result = orderService.assignOrderToDriver(shipmentNumber, driver.DriverID);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: الطلبات (يتطلب تسجيل الدخول) ───
app.post('/api/orders', requireAppAuth, async (req, res) => {
    try {
        const employeeCode = (req.body.EmployeeCode || '').trim();
        if (!employeeCode) return res.status(400).json({ error: 'أدخل رمز الموظف' });
        const emp = userAuthService.getUserBySecretCode(employeeCode);
        if (!emp) return res.status(400).json({ error: 'رمز الموظف غير صحيح' });
        const body = { ...req.body, CreatedByUserID: emp.UserID };
        delete body.EmployeeCode;
        const order = orderService.createOrder(body);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders', requireAppAuth, async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            driverId: req.query.driverId ? parseInt(req.query.driverId) : undefined,
            status: req.query.status,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            limit: req.query.limit
        };
        const orders = orderService.getOrders(filters);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/shipment/:num', requireAppAuth, async (req, res) => {
    try {
        const order = orderService.getOrderByShipmentNumber(req.params.num);
        res.json(order || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/:id', requireAppAuth, async (req, res) => {
    try {
        const order = orderService.getOrderById(parseInt(req.params.id));
        res.json(order || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/update-status', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const id = parseInt(orderId, 10);
        const statusTrimmed = (status || '').toString().trim();
        const validStatuses = ['New', 'AssignedToDriver', 'Delivered', 'Returned'];
        if (!orderId && orderId !== 0) {
            return res.status(400).json({ error: 'رقم الطلب مفقود' });
        }
        if (isNaN(id) || id < 1) {
            return res.status(400).json({ error: 'رقم الطلب غير صالح' });
        }
        if (!statusTrimmed || !validStatuses.includes(statusTrimmed)) {
            return res.status(400).json({ error: 'حالة غير صالحة. الحالات المسموحة: جديد، مع السائق، تم التوصيل، راجع' });
        }
        orderService.updateOrderStatus(id, statusTrimmed);
        const order = orderService.getOrderById(id);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orders/:id', requireAppAuth, async (req, res) => {
    try {
        const order = orderService.updateOrder(parseInt(req.params.id), req.body);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const result = orderService.deleteOrder(parseInt(req.params.id));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/assign', requireAppAuth, async (req, res) => {
    try {
        const { shipmentNumber, driverId } = req.body;
        const result = orderService.assignOrderToDriver(shipmentNumber, parseInt(driverId));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/assign-by-code', requireAppAuth, async (req, res) => {
    try {
        const { shipmentNumber, driverCode } = req.body;
        if (!driverCode || !String(driverCode).trim()) return res.status(400).json({ error: 'أدخل الرمز السري للسائق' });
        const driver = driverService.getDriverByPassword(driverCode);
        if (!driver) return res.status(404).json({ error: 'الرمز السري غير صحيح أو السائق ليس له حساب' });
        const result = orderService.assignOrderToDriver(shipmentNumber, driver.DriverID);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/return', requireAppAuth, async (req, res) => {
    try {
        const { shipmentNumber } = req.body;
        const result = orderService.returnOrderFromDriver(shipmentNumber);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/:id/mark-label-printed', requireAppAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || isNaN(id)) return res.status(400).json({ error: 'رقم الطلب غير صالح' });
        const ok = orderService.markLabelPrinted(id);
        if (!ok) return res.status(404).json({ error: 'الطلب غير موجود' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/:id/receive-returned', requireAppAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id || isNaN(id)) return res.status(400).json({ error: 'رقم الطلب غير صالح' });
        const result = orderService.markReturnedOrderReceived(id);
        if (!result.success) return res.status(400).json({ error: result.error });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: التقارير (المدير فقط) ───
app.get('/api/reports/driver', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { driverId, dateFrom, dateTo } = req.query;
        const report = reportService.getDriverReportByRange(parseInt(driverId), dateFrom, dateTo || dateFrom);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/daily-summary', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { dateFrom, dateTo, driverIds } = req.query;
        const ids = driverIds ? String(driverIds).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
        const report = reportService.getDailySummaryReport(ids, dateFrom, dateTo || dateFrom);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/company', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const report = reportService.getCompanyReportByRange(dateFrom, dateTo || dateFrom);
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports/driver-pdf', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const buf = await reportService.generateDriverReportPDF(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=driver-report.pdf');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports/daily-summary-pdf', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const buf = await reportService.generateDailySummaryReportPDF(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=daily-summary.pdf');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports/company-pdf', requireAppAuth, requireAdmin, async (req, res) => {
    try {
        const buf = await reportService.generateCompanyReportPDF(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=company-report.pdf');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── API: الملصق ───
app.post('/api/label/pdf', requireAppAuth, async (req, res) => {
    try {
        const buf = await labelService.createLabelPDF(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=label.pdf');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── أي مسار API غير معرّف يُرجع JSON ───
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'المسار غير موجود' });
    }
    next();
});

// ─── واجهة الويب ───
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`شركة ديما الحياة - نظام التوصيل (ويب) يعمل على http://0.0.0.0:${PORT}`);
});
