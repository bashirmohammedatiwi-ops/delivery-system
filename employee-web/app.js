/**
 * تطبيق الموظفين - نسخة الويب
 * شركة ديما الحياة
 */

function formatIQD(n) {
    return new Intl.NumberFormat('ar-IQ').format(Math.round(n || 0)) + ' د.ع';
}

const STATUS_MAP = { New: 'جديد', AssignedToDriver: 'مع السائق', Delivered: 'تم التوصيل', Returned: 'راجع' };

const app = {
    user: null,
    currentTab: 'new-order'
};

function getEmployeeCode() {
    return localStorage.getItem('empCode') || '';
}

function setEmployeeCode(c) {
    if (c) localStorage.setItem('empCode', c);
    else localStorage.removeItem('empCode');
}

async function checkAuth() {
    const token = window.api.auth.getToken();
    if (!token) return false;
    try {
        app.user = await window.api.auth.me();
        return !!app.user;
    } catch {
        window.api.auth.setToken('');
        return false;
    }
}

function showMain() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('empName').textContent = app.user?.DisplayName || app.user?.Username || 'موظف';
    app.currentTab = 'new-order';
    renderTab();
}

function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
}

function renderTab() {
    document.querySelectorAll('.bottom-nav-item').forEach(t => t.classList.toggle('active', t.dataset.tab === app.currentTab));
    const content = document.getElementById('empContent');
    if (app.currentTab === 'new-order') renderNewOrder(content);
    else if (app.currentTab === 'receive') renderReceive(content);
    else if (app.currentTab === 'orders') renderOrders(content);
    else if (app.currentTab === 'settings') renderSettings(content);
}

function calcTotal(amt, fee, free) {
    if (free) return amt;
    return (amt || 0) + (fee || 0);
}

async function renderNewOrder(container) {
    let regions = [];
    try { regions = await window.api.regions.getAll(); } catch (_) {}
    container.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom:16px">إدخال طلب جديد</h3>
            <form id="orderForm">
                <div class="form-group">
                    <label>رمز الموظف <span class="required">*</span></label>
                    <input type="password" id="empCode" placeholder="رمزك السري" value="${(getEmployeeCode() || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>رقم الطلب الإداري</label>
                    <input type="text" id="adminOrderNo" placeholder="رقم الطلب عندكم">
                </div>
                <div class="form-group">
                    <label>اسم المتجر <span class="required">*</span></label>
                    <input type="text" id="storeName" required>
                </div>
                <div class="form-group">
                    <label>هاتف المتجر <span class="required">*</span></label>
                    <input type="tel" id="storePhone" placeholder="11 رقم" required>
                </div>
                <div class="form-group">
                    <label>اسم المستلم</label>
                    <input type="text" id="customerName">
                </div>
                <div class="form-group">
                    <label>هاتف المستلم <span class="required">*</span></label>
                    <input type="tel" id="customerPhone" placeholder="07701234567" required>
                </div>
                <div class="form-group">
                    <label>المنطقة <span class="required">*</span></label>
                    <select id="regionId" required>
                        <option value="">-- اختر --</option>
                        ${(regions || []).map(r => `<option value="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}">${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>العنوان <span class="required">*</span></label>
                    <input type="text" id="address" required>
                </div>
                <div class="form-group">
                    <label>مبلغ الفاتورة (د.ع) <span class="required">*</span></label>
                    <input type="number" id="amount" min="0" required>
                </div>
                <div class="form-group">
                    <label>أجرة التوصيل (د.ع)</label>
                    <input type="number" id="deliveryFee" min="0" value="0">
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="freeDelivery"> توصيل مجاني</label>
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="notes" rows="2"></textarea>
                </div>
                <div id="orderFeedback" class="feedback" style="display:none"></div>
                <button type="submit" class="btn btn-primary btn-block">حفظ الطلب</button>
            </form>
        </div>
    `;
    document.getElementById('regionId')?.addEventListener('change', function() {
        const opt = this.options[this.selectedIndex];
        if (opt?.value) document.getElementById('deliveryFee').value = opt.dataset.fee || 0;
    });
    document.getElementById('orderForm').onsubmit = async (e) => {
        e.preventDefault();
        const empCode = (document.getElementById('empCode')?.value || '').trim();
        if (!empCode) { alert('أدخل رمز الموظف'); return; }
        setEmployeeCode(empCode);
        const data = {
            EmployeeCode: empCode,
            AdminOrderNo: document.getElementById('adminOrderNo').value,
            StoreName: document.getElementById('storeName').value.trim(),
            StorePhone: document.getElementById('storePhone').value.trim(),
            CustomerName: document.getElementById('customerName').value.trim(),
            CustomerPhone: document.getElementById('customerPhone').value.trim(),
            RegionID: document.getElementById('regionId').value ? parseInt(document.getElementById('regionId').value) : null,
            Address: document.getElementById('address').value.trim(),
            Pieces: 1,
            AmountIQD: parseFloat(document.getElementById('amount').value) || 0,
            DeliveryFeeIQD: parseFloat(document.getElementById('deliveryFee').value) || 0,
            FreeDelivery: document.getElementById('freeDelivery').checked,
            Notes: document.getElementById('notes').value
        };
        if (!data.StoreName || !data.StorePhone || !data.CustomerPhone || !data.Address || data.AmountIQD <= 0) {
            alert('أكمل الحقول المطلوبة');
            return;
        }
        const phone = (data.CustomerPhone || '').replace(/\D/g, '');
        if (phone.length !== 11) { alert('هاتف المستلم يجب 11 رقماً'); return; }
        const feedback = document.getElementById('orderFeedback');
        try {
            const order = await window.api.orders.create(data);
            feedback.style.display = 'block';
            feedback.className = 'feedback success';
            feedback.textContent = 'تم الحفظ! رقم الشحنة: ' + order.ShipmentNumber;
            document.getElementById('orderForm').reset();
            document.getElementById('empCode').value = empCode;
        } catch (err) {
            feedback.style.display = 'block';
            feedback.className = 'feedback error';
            feedback.textContent = err.message || 'فشل الحفظ';
        }
    };
}

function normalizeBarcodeInput(str) {
    return String(str || '').replace(/\D/g, '').trim();
}

async function renderReceive(container) {
    let drivers = [];
    try { drivers = await window.api.drivers.getAll(); } catch (_) {}
    let currentDriver = null;
    container.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom:12px">استلام الطلبات للسائق</h3>
            <div id="receiveStep1">
                <div class="form-group">
                    <label>الرمز السري للسائق</label>
                    <input type="password" id="driverCode" placeholder="أدخل الرمز واضغط Enter">
                </div>
            </div>
            <div id="receiveStep2" style="display:none">
                <div class="form-group" style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
                    <span style="background:var(--primary);color:#fff;padding:8px 12px;border-radius:8px" id="driverBadge"></span>
                    <button type="button" class="btn btn-secondary" id="btnOther">سائق آخر</button>
                </div>
                <div class="form-group">
                    <label>رقم الشحنة</label>
                    <input type="text" id="scanInput" placeholder="امسح أو اكتب ثم Enter">
                </div>
                <button type="button" class="btn btn-primary btn-block" id="btnAssign">تعيين للسائق</button>
            </div>
            <div id="receiveFeedback" class="feedback" style="display:none"></div>
        </div>
    `;
    const step1 = document.getElementById('receiveStep1');
    const step2 = document.getElementById('receiveStep2');
    const driverCode = document.getElementById('driverCode');
    const scanInput = document.getElementById('scanInput');
    const feedback = document.getElementById('receiveFeedback');
    const driverBadge = document.getElementById('driverBadge');

    const updateUI = () => {
        if (currentDriver) {
            step1.style.display = 'none';
            step2.style.display = 'block';
            driverBadge.textContent = currentDriver.DriverName;
        } else {
            step1.style.display = 'block';
            step2.style.display = 'none';
        }
    };

    driverCode.onkeypress = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = (driverCode.value || '').trim();
            if (!code) { feedback.style.display = 'block'; feedback.className = 'feedback error'; feedback.textContent = 'أدخل الرمز'; return; }
            try {
                const res = await window.api.drivers.verifyPassword(code);
                if (res?.driver) {
                    currentDriver = res.driver;
                    driverCode.value = '';
                    feedback.style.display = 'block';
                    feedback.className = 'feedback success';
                    feedback.textContent = 'السائق: ' + res.driver.DriverName;
                    updateUI();
                }
            } catch (err) {
                feedback.style.display = 'block';
                feedback.className = 'feedback error';
                feedback.textContent = err.message || 'رمز غير صحيح';
            }
        }
    };

    document.getElementById('btnOther').onclick = () => { currentDriver = null; feedback.style.display = 'none'; updateUI(); };

    const doAssign = async () => {
        const num = normalizeBarcodeInput(scanInput?.value);
        if (!num) { feedback.style.display = 'block'; feedback.className = 'feedback error'; feedback.textContent = 'أدخل رقم الشحنة'; return; }
        if (!currentDriver) { feedback.style.display = 'block'; feedback.className = 'feedback error'; feedback.textContent = 'أدخل الرمز السري أولاً'; return; }
        try {
            const res = await window.api.orders.assignDriver(num, currentDriver.DriverID);
            feedback.style.display = 'block';
            feedback.className = 'feedback success';
            feedback.textContent = 'تم تعيين #' + num + ' لـ ' + currentDriver.DriverName;
            scanInput.value = '';
        } catch (err) {
            feedback.style.display = 'block';
            feedback.className = 'feedback error';
            feedback.textContent = err.message || 'فشل التعيين';
        }
    };

    scanInput.onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); doAssign(); } };
    document.getElementById('btnAssign').onclick = doAssign;
}

async function renderOrders(container) {
    container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
    try {
        const today = new Date().toISOString().slice(0, 10);
        const orders = await window.api.orders.getAll({ dateFrom: today, dateTo: today, limit: 100 });
        const list = Array.isArray(orders) ? orders : [];
        if (!list.length) {
            container.innerHTML = '<div class="empty-state"><p>لا توجد طلبات اليوم</p></div>';
            return;
        }
        container.innerHTML = list.map(o => `
            <div class="order-card">
                <div class="order-card-header">
                    <span class="order-shipment">#${o.ShipmentNumber}</span>
                    <span class="order-amount">${formatIQD(o.TotalIQD)}</span>
                </div>
                <div>${o.CustomerName || '—'}</div>
                <div style="font-size:0.9rem;color:var(--text-muted)">${o.Address || ''}</div>
                <div style="font-size:0.8rem;margin-top:4px;color:var(--text-muted)">${STATUS_MAP[o.Status] || o.Status}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p class="feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
    }
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="settings-profile">
            <div style="font-size:2rem;margin-bottom:8px">👤</div>
            <div class="settings-driver-name">${app.user?.DisplayName || app.user?.Username || 'موظف'}</div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-top:4px">${app.user?.Role === 'admin' ? 'مدير' : 'موظف'}</div>
        </div>
        <div class="card">
            <label>رمز الموظف (لإدخال الطلبات)</label>
            <input type="password" id="settingsEmpCode" value="${(getEmployeeCode() || '').replace(/"/g, '&quot;')}" style="width:100%;padding:12px;border-radius:8px;margin-top:8px">
            <button type="button" class="btn btn-primary btn-block" id="btnSaveCode" style="margin-top:12px">حفظ الرمز</button>
        </div>
        <button type="button" class="btn-logout" id="btnLogout">تسجيل الخروج</button>
    `;
    document.getElementById('btnSaveCode').onclick = () => {
        const c = (document.getElementById('settingsEmpCode')?.value || '').trim();
        setEmployeeCode(c);
        alert('تم حفظ الرمز');
    };
    document.getElementById('btnLogout').onclick = async () => {
        if (!confirm('تسجيل الخروج؟')) return;
        try { await window.api.auth.logout(); } catch (_) {}
        window.api.auth.setToken('');
        showLogin();
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAuth()) {
        showMain();
    } else {
        showLogin();
    }

    document.getElementById('btnLogin').onclick = async () => {
        const username = (document.getElementById('loginUsername')?.value || '').trim();
        const password = document.getElementById('loginPassword')?.value || '';
        const errEl = document.getElementById('loginError');
        if (!username || !password) {
            errEl.style.display = 'block';
            errEl.textContent = 'أدخل اسم المستخدم وكلمة المرور';
            return;
        }
        errEl.style.display = 'none';
        try {
            const res = await window.api.auth.login(username, password);
            window.api.auth.setToken(res.token);
            app.user = res.user;
            showMain();
        } catch (e) {
            errEl.style.display = 'block';
            errEl.textContent = e.message || 'فشل تسجيل الدخول';
        }
    };

    document.getElementById('loginPassword').onkeypress = (e) => {
        if (e.key === 'Enter') document.getElementById('btnLogin').click();
    };

    document.querySelectorAll('.bottom-nav-item').forEach(tab => {
        tab.onclick = () => {
            app.currentTab = tab.dataset.tab;
            renderTab();
        };
    });
});
