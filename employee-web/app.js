/**
 * تطبيق الموظفين - نسخة الويب
 * شركة ديما الحياة
 */

function formatIQD(n) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' د.ع';
}

const STATUS_MAP = { New: 'جديد', AssignedToDriver: 'مع السائق', Delivered: 'تم التوصيل', Returned: 'راجع' };

const app = {
    user: null,
    currentTab: 'new-order'
};


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
    const name = app.user?.DisplayName || app.user?.Username || 'موظف';
    document.getElementById('empName').textContent = name;
    const avatar = document.getElementById('empAvatar');
    if (avatar) avatar.textContent = (name.charAt(0) || 'م').toUpperCase();
    app.currentTab = 'new-order';
    renderTab();
}

function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
}

function stopBarcodeScanner() {
    if (app.scanInstance && typeof app.scanInstance.stop === 'function') {
        app.scanInstance.stop().catch(() => {}).finally(() => { app.scanInstance = null; });
    }
}

function renderTab() {
    document.querySelectorAll('.bottom-nav-item').forEach(t => t.classList.toggle('active', t.dataset.tab === app.currentTab));
    if (app.currentTab !== 'receive') stopBarcodeScanner();
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
/* المبلغ المستحق = المبلغ النهائي - أجرة التوصيل */
function getAmountDue(o) {
    const total = Number(o.TotalIQD ?? 0) || 0;
    const free = !!(o.FreeDelivery);
    const deliveryAmt = free ? (Number(o.WaivedDeliveryIQD ?? 0) || 0) : (Number(o.DeliveryFeeIQD ?? 0) || 0);
    return total - deliveryAmt;
}

async function printOrder(order, onPrinted) {
    if (!order) return;
    try {
        const url = await window.api.orders.print(order);
        const w = window.open(url, '_blank', 'noopener');
        if (w) setTimeout(() => w.print(), 500);
        await window.api.orders.markLabelPrinted(order.OrderID).catch(() => {});
        if (onPrinted) onPrinted();
    } catch (err) {
        alert(err?.message || 'فشلت الطباعة');
    }
}

async function renderNewOrder(container) {
    let regions = [];
    let defaults = { storeName: '', storePhone: '' };
    try { regions = await window.api.regions.getAll(); } catch (_) {}
    try { defaults = await window.api.settings.getDefaults(); } catch (_) {}
    container.innerHTML = `
        <div class="screen-hero screen-hero-sm">
            <h2 class="screen-hero-title">طلب جديد</h2>
        </div>
        <div class="card card-form">
            <h3 class="card-title">بيانات الطلب</h3>
            <form id="orderForm">
                <div class="form-group">
                    <label>رمز الموظف <span class="required">*</span></label>
                    <input type="password" id="empCode" placeholder="رمز الموظف (يُدخل في كل طلب)" required>
                </div>
                <div class="form-group">
                    <label>رقم الطلب الإداري</label>
                    <input type="text" id="adminOrderNo" placeholder="رقم الطلب عندكم">
                </div>
                <div class="form-group" style="display:none" data-hidden-store>
                    <label>اسم المتجر <span class="required">*</span></label>
                    <input type="text" id="storeName" value="${(defaults.storeName || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group" style="display:none" data-hidden-store>
                    <label>هاتف المتجر <span class="required">*</span></label>
                    <input type="tel" id="storePhone" value="${(defaults.storePhone || '').replace(/"/g, '&quot;')}" placeholder="11 رقم">
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
                    <div class="region-search-wrap">
                        <input type="text" id="regionSearchInput" class="region-search-input" placeholder="ابحث بكتابة اسم المنطقة أو أول أحرفها..." autocomplete="off">
                        <span class="region-search-chevron">▼</span>
                        <input type="hidden" id="regionId" required>
                        <div id="regionSearchDropdown" class="region-search-dropdown" style="display:none"></div>
                    </div>
                </div>
                <div class="form-group">
                    <label>العنوان <span class="required">*</span></label>
                    <input type="text" id="address" required>
                </div>
                <div class="form-group">
                    <label>عدد القطع</label>
                    <input type="number" id="pieces" min="1" value="1">
                </div>
                <div class="form-group">
                    <label>مبلغ الفاتورة (د.ع) <span class="form-hint">(يمكن أن يكون 0)</span></label>
                    <input type="number" id="amount" min="0" value="0" step="1">
                </div>
                <div class="form-group">
                    <label>أجرة التوصيل (د.ع) <span class="form-hint">(ثابتة حسب المنطقة)</span></label>
                    <input type="number" id="deliveryFee" min="0" value="0" readonly>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="freeDelivery"> توصيل مجاني <span class="form-hint">(تلقائي عند 50,000 د.ع أو أكثر)</span></label>
                </div>
                <div class="order-total-box">
                    <span class="order-total-label">المبلغ النهائي:</span>
                    <span id="orderTotalDisplay" class="order-total-value">0 د.ع</span>
                </div>
                <div class="order-total-box">
                    <span class="order-total-label">المبلغ المستحق:</span>
                    <span id="orderDueDisplay" class="order-total-value">0 د.ع</span>
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="notes" rows="2"></textarea>
                </div>
                <div id="orderFeedback" class="feedback" style="display:none"></div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-block">حفظ الطلب</button>
                    <button type="button" class="btn btn-secondary btn-block" id="btnPrintAfterSave" style="display:none; margin-top:8px">
                        طباعة الملصق
                    </button>
                </div>
            </form>
        </div>
    `;
    const FREE_DELIVERY_THRESHOLD = 50000;
    let lastAmountForFreeDelivery = 0;
    const updateOrderTotal = (fromAmountInput) => {
        const amt = parseFloat(document.getElementById('amount')?.value || 0) || 0;
        const fee = parseFloat(document.getElementById('deliveryFee')?.value || 0) || 0;
        const freeEl = document.getElementById('freeDelivery');
        if (fromAmountInput && freeEl && amt >= FREE_DELIVERY_THRESHOLD && lastAmountForFreeDelivery < FREE_DELIVERY_THRESHOLD) {
            freeEl.checked = true;
        }
        lastAmountForFreeDelivery = amt;
        const free = freeEl?.checked || false;
        const total = calcTotal(amt, fee, free);
        const due = free ? (amt - fee) : amt;
        const el = document.getElementById('orderTotalDisplay');
        const dueEl = document.getElementById('orderDueDisplay');
        if (el) el.textContent = formatIQD(total);
        if (dueEl) dueEl.textContent = formatIQD(due);
    };
    (() => {
        const regionSearchInput = document.getElementById('regionSearchInput');
        const regionIdInput = document.getElementById('regionId');
        const dropdown = document.getElementById('regionSearchDropdown');
        const deliveryFeeInput = document.getElementById('deliveryFee');

        const applyRegionSelection = (r) => {
            regionIdInput.value = r.RegionID;
            regionSearchInput.value = (r.RegionName || '') + ' (' + formatIQD(r.DeliveryFeeIQD) + ')';
            regionSearchInput.dataset.fee = r.DeliveryFeeIQD || 0;
            deliveryFeeInput.value = r.DeliveryFeeIQD || 0;
            dropdown.style.display = 'none';
            updateOrderTotal(false);
        };

        const filterRegions = (q) => {
            const qn = (q || '').trim().toLowerCase();
            if (!qn) return regions;
            return regions.filter(r => {
                const name = (r.RegionName || '').toLowerCase();
                const area = (r.RegionArea || '').toLowerCase();
                return name.includes(qn) || name.startsWith(qn) || area.includes(qn) || area.startsWith(qn);
            });
        };

        const renderDropdown = (list) => {
            dropdown.innerHTML = list.length
                ? list.map(r => `<div class="region-search-item" data-id="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}">${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)})</div>`).join('')
                : '<div class="region-search-item region-search-empty">لا توجد نتائج</div>';
            dropdown.style.display = 'block';
        };

        regionSearchInput?.addEventListener('input', () => {
            regionIdInput.value = '';
            regionSearchInput.dataset.fee = '';
            deliveryFeeInput.value = '0';
            const list = filterRegions(regionSearchInput.value);
            renderDropdown(list);
            updateOrderTotal(false);
        });

        regionSearchInput?.addEventListener('focus', () => {
            const list = regionIdInput.value ? regions : filterRegions(regionSearchInput.value);
            renderDropdown(list);
        });

        regionSearchInput?.closest('.region-search-wrap')?.addEventListener('click', () => regionSearchInput?.focus());

        regionSearchInput?.addEventListener('keydown', (e) => {
            const items = dropdown.querySelectorAll('.region-search-item:not(.region-search-empty)');
            const focused = dropdown.querySelector('.region-search-item.focused');
            if (e.key === 'Escape') { dropdown.style.display = 'none'; return; }
            if (e.key === 'Enter' && focused?.dataset.id) {
                e.preventDefault();
                const r = regions.find(x => x.RegionID == focused.dataset.id);
                if (r) applyRegionSelection(r);
                return;
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                let idx = Array.from(items).indexOf(focused);
                if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
                else idx = Math.max(idx - 1, 0);
                items.forEach(el => el.classList.remove('focused'));
                if (items[idx]) items[idx].classList.add('focused');
            }
        });

        document.addEventListener('click', (e) => {
            if (!regionSearchInput?.contains(e.target) && !dropdown?.contains(e.target)) dropdown.style.display = 'none';
        });

        dropdown?.addEventListener('click', (e) => {
            const item = e.target.closest('.region-search-item');
            if (item?.dataset.id) {
                const r = regions.find(x => x.RegionID == item.dataset.id);
                if (r) applyRegionSelection(r);
            }
        });
    })();
    document.getElementById('amount')?.addEventListener('input', () => updateOrderTotal(true));
    document.getElementById('amount')?.addEventListener('change', () => updateOrderTotal(true));
    document.getElementById('deliveryFee')?.addEventListener('input', () => updateOrderTotal(false));
    document.getElementById('deliveryFee')?.addEventListener('change', () => updateOrderTotal(false));
    document.getElementById('freeDelivery')?.addEventListener('change', () => updateOrderTotal(false));
    updateOrderTotal(false);
    const clearFieldErrors = () => {
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    };
    const showFieldError = (fieldId, msg, feedbackEl) => {
        clearFieldErrors();
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('input-error');
            field.focus();
            const wrap = field.closest('.form-group') || field.closest('.region-search-wrap');
            if (wrap && !wrap.querySelector('.field-error')) {
                const err = document.createElement('div');
                err.className = 'field-error';
                err.textContent = msg;
                wrap.appendChild(err);
            }
        }
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.className = 'feedback error';
            feedbackEl.textContent = '❌ ' + msg;
        }
        return false;
    };

    const feedback = document.getElementById('orderFeedback');
    document.getElementById('orderForm').onsubmit = async (e) => {
        e.preventDefault();
        clearFieldErrors();
        document.getElementById('btnPrintAfterSave')?.style.setProperty('display', 'none');
        const feedback = document.getElementById('orderFeedback');

        const empCode = (document.getElementById('empCode')?.value || '').trim();
        if (!empCode) return showFieldError('empCode', 'أدخل رمز الموظف', feedback);

        const regionId = document.getElementById('regionId')?.value;
        if (!regionId) return showFieldError('regionSearchInput', 'اختر المنطقة', feedback);

        const customerPhone = (document.getElementById('customerPhone')?.value || '').trim();
        if (!customerPhone) return showFieldError('customerPhone', 'أدخل هاتف المستلم', feedback);

        const phoneDigits = customerPhone.replace(/\D/g, '');
        if (phoneDigits.length !== 11) return showFieldError('customerPhone', 'هاتف المستلم يجب أن يكون 11 رقماً', feedback);

        const address = (document.getElementById('address')?.value || '').trim();
        if (!address) return showFieldError('address', 'أدخل العنوان', feedback);

        const amountVal = parseFloat(document.getElementById('amount')?.value);
        if (isNaN(amountVal) || amountVal < 0) return showFieldError('amount', 'مبلغ الفاتورة لا يمكن أن يكون سالباً', feedback);

        const data = {
            EmployeeCode: empCode,
            AdminOrderNo: document.getElementById('adminOrderNo').value,
            StoreName: document.getElementById('storeName').value.trim(),
            StorePhone: document.getElementById('storePhone').value.trim(),
            CustomerName: document.getElementById('customerName').value.trim(),
            CustomerPhone: customerPhone,
            RegionID: parseInt(regionId),
            Address: address,
            Pieces: parseInt(document.getElementById('pieces')?.value) || 1,
            AmountIQD: amountVal,
            DeliveryFeeIQD: parseFloat(document.getElementById('deliveryFee').value) || 0,
            FreeDelivery: document.getElementById('freeDelivery').checked,
            Notes: document.getElementById('notes').value
        };
        if (!data.StoreName || !data.StorePhone) { data.StoreName = defaults.storeName || ''; data.StorePhone = defaults.storePhone || ''; }
        try {
            const order = await window.api.orders.create(data);
            clearFieldErrors();
            feedback.style.display = 'block';
            feedback.className = 'feedback success';
            feedback.textContent = 'تم الحفظ! رقم الشحنة: ' + order.ShipmentNumber;
            document.getElementById('orderForm').reset();
            document.getElementById('storeName').value = defaults.storeName || '';
            document.getElementById('storePhone').value = defaults.storePhone || '';
            document.getElementById('regionSearchInput').value = '';
            document.getElementById('regionId').value = '';
            document.getElementById('deliveryFee').value = '0';
            updateOrderTotal(false);
            const btnPrint = document.getElementById('btnPrintAfterSave');
            if (btnPrint) {
                btnPrint.style.display = 'block';
                btnPrint.onclick = () => printOrder(order);
            }
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
        <div class="screen-hero screen-hero-sm">
            <h2 class="screen-hero-title">استلام للسائق</h2>
        </div>
        <div class="card">
            <h3 class="card-title">تعيين الطلبات</h3>
            <div id="receiveStep1">
                <div class="form-group">
                    <label>الرمز السري للسائق</label>
                    <input type="password" id="driverCode" placeholder="أدخل الرمز واضغط Enter">
                </div>
            </div>
            <div id="receiveStep2" style="display:none">
                <div class="form-group" style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
                    <span class="driver-badge" id="driverBadge"></span>
                    <button type="button" class="btn btn-secondary" id="btnOther">سائق آخر</button>
                </div>
                <div class="receive-scan-area">
                    <div id="receiveScanner" class="receive-scanner"></div>
                    <button type="button" class="btn btn-primary btn-block receive-scan-btn" id="btnStartScan">📷 مسح الباركود بالكاميرا</button>
                    <button type="button" class="btn btn-block receive-scan-btn receive-scan-stop" id="btnStopScan" style="display:none">⏹ إيقاف المسح</button>
                </div>
                <div class="receive-divider">أو أدخل يدوياً</div>
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

    document.getElementById('btnOther').onclick = () => { currentDriver = null; feedback.style.display = 'none'; stopBarcodeScanner(); updateUI(); };

    const doAssign = async (scannedValue) => {
        const num = normalizeBarcodeInput(scannedValue !== undefined ? scannedValue : scanInput?.value);
        if (!num) { feedback.style.display = 'block'; feedback.className = 'feedback error'; feedback.textContent = 'أدخل رقم الشحنة'; return; }
        if (!currentDriver) { feedback.style.display = 'block'; feedback.className = 'feedback error'; feedback.textContent = 'أدخل الرمز السري أولاً'; return; }
        feedback.style.display = 'none';
        try {
            await window.api.orders.assignDriver(num, currentDriver.DriverID);
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
    document.getElementById('btnAssign').onclick = () => doAssign();

    const btnStart = document.getElementById('btnStartScan');
    const btnStop = document.getElementById('btnStopScan');
    btnStart?.addEventListener('click', async () => {
        if (typeof Html5Qrcode === 'undefined') {
            feedback.style.display = 'block'; feedback.className = 'feedback error';
            feedback.textContent = 'المكتبة غير محمّلة. حدّث الصفحة.';
            return;
        }
        app.scanInstance = new Html5Qrcode('receiveScanner');
        try {
            await app.scanInstance.start(
                { facingMode: 'environment' },
                { fps: 8, qrbox: { width: 280, height: 120 } },
                (decodedText) => {
                    stopBarcodeScanner();
                    doAssign(decodedText);
                    btnStart.style.display = 'block';
                    btnStop.style.display = 'none';
                },
                () => {}
            );
            btnStart.style.display = 'none';
            btnStop.style.display = 'block';
        } catch (e) {
            feedback.style.display = 'block'; feedback.className = 'feedback error';
            feedback.textContent = e?.message || 'فشل تشغيل الكاميرا. تحقق من صلاحيات الكاميرا.';
        }
    });
    btnStop?.addEventListener('click', () => {
        stopBarcodeScanner();
        btnStart.style.display = 'block';
        btnStop.style.display = 'none';
    });
}

async function renderOrders(container) {
    container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
    try {
        const orders = await window.api.orders.getAll({ limit: 500 });
        const list = Array.isArray(orders) ? orders : [];
        if (!list.length) {
            container.innerHTML = `
                <div class="screen-hero screen-hero-sm">
                    <h2 class="screen-hero-title">الطلبات</h2>
                </div>
                <div class="empty-state"><p>لا توجد طلبات</p></div>
            `;
            return;
        }
        const renderOrdersList = (ordersToShow) => {
            const listEl = document.getElementById('ordersList');
            if (!listEl) return;
            listEl.innerHTML = ordersToShow.map(o => `
            <div class="order-card" data-order-id="${o.OrderID}">
                <div class="order-card-header">
                    <span class="order-shipment">#${o.ShipmentNumber}</span>
                    <span class="order-amount">${formatIQD(o.TotalIQD)}</span>
                </div>
                <div>${o.CustomerName || '—'}</div>
                <div class="order-card-addr">${o.Address || ''}</div>
                <div class="order-card-meta">${STATUS_MAP[o.Status] || o.Status} · ${o.CreatedDate || ''}</div>
                <div class="order-card-meta">المستحق: ${formatIQD(getAmountDue(o))}</div>
                <div class="order-card-meta"><span class="label-printed-badge ${o.LabelPrinted ? 'printed' : 'not-printed'}">${o.LabelPrinted ? 'تم الطباعة' : 'لم يُطبع'}</span></div>
                <div class="order-card-actions">
                    <button type="button" class="btn-order-action btn-edit" data-order-id="${o.OrderID}" title="تعديل">تعديل</button>
                    <button type="button" class="btn-order-action btn-print" data-order-id="${o.OrderID}" title="طباعة">طباعة</button>
                </div>
            </div>
        `).join('');
            listEl.querySelectorAll('.btn-edit').forEach(btn => {
                btn.onclick = () => {
                    const id = parseInt(btn.dataset.orderId);
                    const order = list.find(o => o.OrderID === id) || { OrderID: id };
                    showEditOrderModalEmp(order, () => renderOrders(container));
                };
            });
            listEl.querySelectorAll('.btn-print').forEach(btn => {
                btn.onclick = async () => {
                    const id = parseInt(btn.dataset.orderId);
                    const order = list.find(o => o.OrderID === id);
                    if (!order) return;
                    const fullOrder = order.RegionName ? order : await window.api.orders.getById(id).catch(() => order);
                    printOrder(fullOrder || order, () => { order.LabelPrinted = 1; renderOrdersList(filterOrders(document.getElementById('ordersSearchInput')?.value || '')); });
                };
            });
        };
        const filterOrders = (q) => {
            const s = (q || '').trim().toLowerCase();
            if (!s) return list;
            const searchDigits = s.replace(/\D/g, '');
            return list.filter(o => {
                const sn = (o.ShipmentNumber || '').toLowerCase();
                const snDigits = (o.ShipmentNumber || '').replace(/\D/g, '');
                const cn = (o.CustomerName || '').toLowerCase();
                const cp = (o.CustomerPhone || '').replace(/\D/g, '');
                const addr = (o.Address || '').toLowerCase();
                const store = (o.StoreName || '').toLowerCase();
                const admin = (o.AdminOrderNo || '').toLowerCase();
                const matchShipment = sn.includes(s) ||
                    (searchDigits && (snDigits.includes(searchDigits) || snDigits.endsWith(searchDigits)));
                return matchShipment || cn.includes(s) || addr.includes(s) || store.includes(s) || admin.includes(s) ||
                    (searchDigits && cp.includes(searchDigits));
            });
        };
        container.innerHTML = `
            <div class="screen-hero screen-hero-sm">
                <h2 class="screen-hero-title">الطلبات</h2>
            </div>
            <div class="orders-search-wrap">
                <input type="text" id="ordersSearchInput" placeholder="بحث برقم الشحنة أو آخره، الاسم، الهاتف، العنوان..." class="orders-search-input">
            </div>
            <div id="ordersList">` + list.map(o => `
            <div class="order-card" data-order-id="${o.OrderID}">
                <div class="order-card-header">
                    <span class="order-shipment">#${o.ShipmentNumber}</span>
                    <span class="order-amount">${formatIQD(o.TotalIQD)}</span>
                </div>
                <div>${o.CustomerName || '—'}</div>
                <div class="order-card-addr">${o.Address || ''}</div>
                <div class="order-card-meta">${STATUS_MAP[o.Status] || o.Status} · ${o.CreatedDate || ''}</div>
                <div class="order-card-meta">المستحق: ${formatIQD(getAmountDue(o))}</div>
                <div class="order-card-meta"><span class="label-printed-badge ${o.LabelPrinted ? 'printed' : 'not-printed'}">${o.LabelPrinted ? 'تم الطباعة' : 'لم يُطبع'}</span></div>
                <div class="order-card-actions">
                    <button type="button" class="btn-order-action btn-edit" data-order-id="${o.OrderID}" title="تعديل">تعديل</button>
                    <button type="button" class="btn-order-action btn-print" data-order-id="${o.OrderID}" title="طباعة">طباعة</button>
                </div>
            </div>
        `).join('') + '</div>';
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => {
                const id = parseInt(btn.dataset.orderId);
                const order = list.find(o => o.OrderID === id) || { OrderID: id };
                showEditOrderModalEmp(order, () => renderOrders(container));
            };
        });
        container.querySelectorAll('.btn-print').forEach(btn => {
            btn.onclick = async () => {
                const id = parseInt(btn.dataset.orderId);
                const order = list.find(o => o.OrderID === id);
                if (!order) return;
                const fullOrder = order.RegionName ? order : await window.api.orders.getById(id).catch(() => order);
                printOrder(fullOrder || order, () => { order.LabelPrinted = 1; renderOrdersList(filterOrders(document.getElementById('ordersSearchInput')?.value || '')); });
            };
        });
        document.getElementById('ordersSearchInput').addEventListener('input', function() {
            const filtered = filterOrders(this.value);
            renderOrdersList(filtered);
            const listEl = document.getElementById('ordersList');
            if (listEl && filtered.length === 0) {
                listEl.innerHTML = '<div class="empty-state"><p>لا توجد نتائج للبحث</p></div>';
            }
        });
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p class="feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
    }
}

async function showEditOrderModalEmp(order, onSuccess) {
    let regions = [];
    try { regions = await window.api.regions.getAll(); } catch (_) {}
    let o = order;
    if (!o.RegionName && o.OrderID) {
        try { o = await window.api.orders.getById(o.OrderID); } catch (_) {}
    }
    const driverDelivery = o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <h3>تعديل الطلب ${o.ShipmentNumber}</h3>
            <form id="editOrderFormEmp">
                <div class="form-group">
                    <label>رقم الطلب الإداري</label>
                    <input type="text" id="editAdminOrderNo" value="${(o.AdminOrderNo || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group" style="display:none">
                    <label>المتجر</label>
                    <input type="text" id="editStoreName" value="${(o.StoreName || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group" style="display:none">
                    <label>هاتف المتجر</label>
                    <input type="text" id="editStorePhone" value="${(o.StorePhone || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>اسم المستلم</label>
                    <input type="text" id="editCustomerName" value="${(o.CustomerName || '').replace(/"/g, '&quot;')}" required>
                </div>
                <div class="form-group">
                    <label>هاتف المستلم</label>
                    <input type="text" id="editCustomerPhone" value="${(o.CustomerPhone || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>المنطقة</label>
                    <select id="editRegionId">
                        <option value="">-- لا منطقة --</option>
                        ${(regions || []).map(r => `<option value="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}" ${(o.RegionID && r.RegionID === o.RegionID) ? 'selected' : ''}>${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>العنوان</label>
                    <input type="text" id="editAddress" value="${(o.Address || '').replace(/"/g, '&quot;')}">
                </div>
                <div class="form-group">
                    <label>مبلغ الفاتورة (د.ع)</label>
                    <input type="number" id="editAmount" value="${o.AmountIQD || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>أجرة التوصيل (د.ع) <span class="form-hint">(ثابتة حسب المنطقة)</span></label>
                    <input type="number" id="editDeliveryFee" value="${driverDelivery || 0}" min="0" readonly>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="editFreeDelivery" ${o.FreeDelivery ? 'checked' : ''}> توصيل مجاني</label>
                </div>
                <div class="form-group" style="background:var(--bg);padding:12px;border-radius:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>المبلغ النهائي:</span><strong id="editTotalDisplayEmp">0</strong></div>
                    <div style="display:flex;justify-content:space-between"><span>المبلغ المستحق:</span><strong id="editDueDisplayEmp">0</strong></div>
                </div>
                <div class="form-group">
                    <label>ملاحظات</label>
                    <textarea id="editNotes" rows="2">${(o.Notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                </div>
                <div id="editFeedbackEmp" class="feedback" style="display:none"></div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">حفظ</button>
                    <button type="button" class="btn btn-secondary" id="editModalCloseEmp">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.getElementById('editModalCloseEmp').onclick = closeModal;
    const updateEditTotalsEmp = () => {
        const amt = parseFloat(document.getElementById('editAmount')?.value || 0) || 0;
        const fee = parseFloat(document.getElementById('editDeliveryFee')?.value || 0) || 0;
        const free = document.getElementById('editFreeDelivery')?.checked || false;
        const total = free ? amt : (amt + fee);
        const due = free ? (amt - fee) : amt;
        const totalEl = document.getElementById('editTotalDisplayEmp');
        const dueEl = document.getElementById('editDueDisplayEmp');
        if (totalEl) totalEl.textContent = formatIQD(total);
        if (dueEl) dueEl.textContent = formatIQD(due);
    };
    updateEditTotalsEmp();
    document.getElementById('editAmount')?.addEventListener('input', updateEditTotalsEmp);
    document.getElementById('editAmount')?.addEventListener('change', updateEditTotalsEmp);
    document.getElementById('editFreeDelivery')?.addEventListener('change', updateEditTotalsEmp);
    document.getElementById('editRegionId')?.addEventListener('change', function() {
        const opt = this.options[this.selectedIndex];
        if (opt?.value) {
            document.getElementById('editDeliveryFee').value = opt.dataset.fee || 0;
            updateEditTotalsEmp();
        }
    });
    const clearEditErrors = () => {
        modal.querySelectorAll('.field-error').forEach(el => el.remove());
        modal.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    };
    const showEditFieldError = (fieldId, msg) => {
        clearEditErrors();
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('input-error');
            field.focus();
            const wrap = field.closest('.form-group');
            if (wrap && !wrap.querySelector('.field-error')) {
                const err = document.createElement('div');
                err.className = 'field-error';
                err.textContent = msg;
                wrap.appendChild(err);
            }
        }
        const fb = document.getElementById('editFeedbackEmp');
        fb.style.display = 'block'; fb.className = 'feedback error'; fb.textContent = '❌ ' + msg;
    };
    document.getElementById('editOrderFormEmp').onsubmit = async (e) => {
        e.preventDefault();
        clearEditErrors();
        const fb = document.getElementById('editFeedbackEmp');
        const editPhone = (document.getElementById('editCustomerPhone')?.value || '').trim();
        if (editPhone && editPhone.replace(/\D/g, '').length !== 11) {
            return showEditFieldError('editCustomerPhone', 'هاتف المستلم يجب أن يكون 11 رقماً');
        }
        const editAmount = parseFloat(document.getElementById('editAmount')?.value);
        if (isNaN(editAmount) || editAmount < 0) {
            return showEditFieldError('editAmount', 'مبلغ الفاتورة لا يمكن أن يكون سالباً');
        }
        const data = {
            AdminOrderNo: document.getElementById('editAdminOrderNo').value,
            StoreName: document.getElementById('editStoreName').value.trim(),
            StorePhone: document.getElementById('editStorePhone').value,
            CustomerName: document.getElementById('editCustomerName').value.trim(),
            CustomerPhone: document.getElementById('editCustomerPhone').value,
            RegionID: document.getElementById('editRegionId').value ? parseInt(document.getElementById('editRegionId').value) : null,
            Address: document.getElementById('editAddress').value.trim(),
            AmountIQD: isNaN(editAmount) ? 0 : editAmount,
            DeliveryFeeIQD: parseFloat(document.getElementById('editDeliveryFee').value) || 0,
            FreeDelivery: document.getElementById('editFreeDelivery').checked,
            Notes: document.getElementById('editNotes').value
        };
        try {
            await window.api.orders.update(o.OrderID, data);
            clearEditErrors();
            fb.style.display = 'block'; fb.className = 'feedback success'; fb.textContent = 'تم الحفظ';
            setTimeout(() => { closeModal(); if (onSuccess) onSuccess(); }, 600);
        } catch (err) {
            fb.style.display = 'block'; fb.className = 'feedback error'; fb.textContent = '❌ ' + (err?.message || 'فشل الحفظ');
        }
    };
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="settings-profile">
            <div style="font-size:2rem;margin-bottom:8px">👤</div>
            <div class="settings-driver-name">${app.user?.DisplayName || app.user?.Username || 'موظف'}</div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-top:4px">${app.user?.Role === 'admin' ? 'مدير' : 'موظف'}</div>
        </div>
        <button type="button" class="btn-logout" id="btnLogout">تسجيل الخروج</button>
    `;
    document.getElementById('btnLogout').onclick = async () => {
        if (!confirm('تسجيل الخروج؟')) return;
        try { await window.api.auth.logout(); } catch (_) {}
        window.api.auth.setToken('');
        showLogin();
    };
}

async function init() {
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
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
