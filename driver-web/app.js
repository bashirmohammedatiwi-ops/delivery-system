/**
 * تطبيق السائق - نسخة الويب
 * شركة ديما الحياة
 */

const API_BASE = ''; // نفس المنفذ - البروكسي يوجه إلى السيرفر الرئيسي

async function api(path, opts = {}) {
    const url = API_BASE + path;
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();
    const res = await fetch(url, { ...opts, headers });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || 'خطأ في الاتصال');
    return data;
}

function getToken() { return localStorage.getItem('driverToken'); }
function setToken(t) { if (t) localStorage.setItem('driverToken', t); else localStorage.removeItem('driverToken'); }
function getDriver() {
    try { return JSON.parse(localStorage.getItem('driverData') || '{}'); } catch { return {}; }
}
function setDriver(d) { localStorage.setItem('driverData', JSON.stringify(d || {})); }

function formatIQD(n) { return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع'; }
function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateShort(d) {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}
/* تاريخ بتوقيت العراق (Asia/Baghdad) */
function getLocalDateStr(d) {
    d = d || new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
}
function addDays(dateStr, delta) {
    const d = new Date(dateStr + 'T12:00:00+03:00');
    d.setDate(d.getDate() + delta);
    return getLocalDateStr(d);
}
/* المبلغ المستحق = المبلغ النهائي - أجرة التوصيل */
function getAmountDue(o) {
    const total = Number(o.TotalIQD ?? o.totaliqd) || 0;
    const free = !!(o.FreeDelivery === 1 || o.FreeDelivery === '1' || o.FreeDelivery === true);
    const deliveryAmt = free ? (Number(o.WaivedDeliveryIQD ?? o.waiveddeliveryiqd) || 0) : (Number(o.DeliveryFeeIQD ?? o.deliveryfeeiqd) || 0);
    return total - deliveryAmt;
}
function calcTotalAmountDue(orders) {
    let t = 0;
    for (const o of orders || []) t += getAmountDue(o);
    return Math.round(t * 100) / 100;
}

// ─── التطبيق ───
const app = {
    token: null,
    driver: null,
    currentTab: 'orders',
    currentOrder: null,
    scanInstance: null  // مثيل مسح الباركود
};

function normalizeBarcodeInput(str) {
    return String(str || '').replace(/\D/g, '').trim();
}

function stopBarcodeScanner() {
    if (app.scanInstance && typeof app.scanInstance.stop === 'function') {
        app.scanInstance.stop().catch(() => {}).finally(() => { app.scanInstance = null; });
    }
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(name + '-screen');
    if (el) el.classList.add('active');
}

function showMain() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('driverName').textContent = app.driver?.DriverName || '—';
    app.currentTab = 'orders';
    renderTab();
}

function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
}

function renderTab() {
    document.querySelectorAll('.bottom-nav-item').forEach(t => t.classList.toggle('active', t.dataset.tab === app.currentTab));
    if (app.currentTab !== 'receive') stopBarcodeScanner();
    const content = document.getElementById('driverContent');
    if (app.currentTab === 'orders') renderOrders(content);
    else if (app.currentTab === 'receive') renderReceive(content);
    else if (app.currentTab === 'pending') renderPending(content);
    else if (app.currentTab === 'stats') renderStats(content);
    else if (app.currentTab === 'history') renderHistory(content);
    else if (app.currentTab === 'settings') renderSettings(content);
}

async function renderOrders(container) {
    container.innerHTML = '<div class="loading-state">جاري تحميل الطلبات...</div>';
    try {
        const orders = await api('/api/driver/orders');
        if (!orders.length) {
            container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📦</span><p>لا توجد طلبات معك حالياً</p></div>';
            return;
        }
        container.innerHTML = orders.map(o => `
            <div class="order-card" data-order-id="${o.OrderID}">
                <div class="order-card-header">
                    <span class="order-shipment">#${o.ShipmentNumber}</span>
                    <span class="order-amount">${formatIQD(o.TotalIQD)}</span>
                </div>
                <div class="order-customer">${(o.CustomerName || '—')}</div>
                <div class="order-address">${(o.Address || '—')}</div>
                ${o.RegionName ? '<div class="order-region">' + o.RegionName + '</div>' : ''}
            </div>
        `).join('');
        container.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', () => {
                const o = orders.find(x => x.OrderID == card.dataset.orderId);
                if (o) showOrderDetail(o);
            });
        });
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p class="receive-feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
    }
}

function renderReceive(container) {
    container.innerHTML = `
        <div class="receive-box">
            <div class="receive-scan-area">
                <div id="receiveScanner" class="receive-scanner"></div>
                <button type="button" class="btn btn-primary btn-block receive-scan-btn" id="btnStartScan">
                    📷 تفعيل مسح الباركود
                </button>
                <button type="button" class="btn btn-block receive-scan-btn receive-scan-stop" id="btnStopScan" style="display:none">
                    ⏹ إيقاف المسح
                </button>
            </div>
            <div class="receive-divider">أو أدخل يدوياً</div>
            <input type="text" class="receive-input" id="receiveInput" placeholder="رقم الشحنة" inputmode="numeric" autocomplete="off">
            <div id="receiveFeedback" class="receive-feedback" style="display:none"></div>
            <button type="button" class="btn btn-primary btn-block" id="btnReceive">استلام الطلب</button>
        </div>
    `;
    const input = document.getElementById('receiveInput');
    const feedback = document.getElementById('receiveFeedback');
    const scannerEl = document.getElementById('receiveScanner');
    const btnStart = document.getElementById('btnStartScan');
    const btnStop = document.getElementById('btnStopScan');

    const doReceive = async (num) => {
        const shipNum = normalizeBarcodeInput(num !== undefined ? num : input?.value);
        if (!shipNum) {
            feedback.style.display = 'block';
            feedback.className = 'receive-feedback error';
            feedback.textContent = 'أدخل رقم الشحنة';
            return;
        }
        feedback.style.display = 'none';
        try {
            const result = await api('/api/driver/receive-order', {
                method: 'POST',
                body: JSON.stringify({ shipmentNumber: shipNum })
            });
            feedback.style.display = 'block';
            feedback.className = 'receive-feedback success';
            feedback.textContent = 'تم استلام الطلب #' + (result.order?.ShipmentNumber || shipNum) + ' بنجاح';
            if (input) input.value = '';
            if (result.order) setTimeout(() => showOrderDetail(result.order), 800);
        } catch (e) {
            feedback.style.display = 'block';
            feedback.className = 'receive-feedback error';
            feedback.textContent = e.message || 'فشل الاستلام';
        }
    };

    btnStart.onclick = async () => {
        if (typeof Html5Qrcode === 'undefined') {
            feedback.style.display = 'block';
            feedback.className = 'receive-feedback error';
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
                    doReceive(decodedText);
                    btnStart.style.display = 'block';
                    btnStop.style.display = 'none';
                },
                () => {}
            );
            btnStart.style.display = 'none';
            btnStop.style.display = 'block';
        } catch (e) {
            feedback.style.display = 'block';
            feedback.className = 'receive-feedback error';
            feedback.textContent = e?.message || 'فشل تشغيل الكاميرا. تحقق من صلاحيات الكاميرا.';
        }
    };

    btnStop.onclick = () => {
        stopBarcodeScanner();
        btnStart.style.display = 'block';
        btnStop.style.display = 'none';
    };

    document.getElementById('btnReceive').onclick = () => doReceive();
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') doReceive(); });
}

async function renderPending(container) {
    container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
    try {
        const today = getLocalDateStr();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 6);
        const dateFrom = getLocalDateStr(weekAgo);
        const data = await api('/api/driver/pending-orders?dateFrom=' + dateFrom + '&dateTo=' + today);
        const days = Array.isArray(data) ? data : [];
        const filtered = days.filter(d => ((d.countKarkh || 0) + (d.countRusafa || 0)) > 0);
        if (!filtered.length) {
            container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">⏳</span><p>لا توجد طلبات منتظرة حالياً</p></div>';
            return;
        }
        container.innerHTML = `
            <p style="text-align:center;font-weight:700;margin-bottom:8px">الطلبات المنتظرة للاستلام</p>
            <p style="text-align:center;font-size:0.9rem;color:var(--text-muted);margin-bottom:16px">اضغط على الكرخ أو الرصافة لرؤية الطلبات</p>
            ${filtered.map(d => {
                const total = (d.countKarkh || 0) + (d.countRusafa || 0);
                return `<div class="pending-day-card">
                    <div class="pending-day-date">${formatDate(d.orderDate)}</div>
                    <div class="pending-areas">
                        <div class="pending-area-badge karkh pending-area-clickable" data-date="${d.orderDate}" data-area="الكرخ">
                            <div class="pending-area-value">${d.countKarkh || 0}</div>
                            <div>الكرخ</div>
                        </div>
                        <div class="pending-area-badge rusafa pending-area-clickable" data-date="${d.orderDate}" data-area="الرصافة">
                            <div class="pending-area-value">${d.countRusafa || 0}</div>
                            <div>الرصافة</div>
                        </div>
                    </div>
                    <div style="text-align:center;color:var(--text-muted);font-size:0.9rem">المجموع: ${total} طلب</div>
                </div>`;
            }).join('')}
        `;
        container.querySelectorAll('.pending-area-clickable').forEach(badge => {
            badge.onclick = () => showPendingOrdersList(badge.dataset.date, badge.dataset.area);
        });
    } catch (e) {
        container.innerHTML = '<div class="empty-state"><p class="receive-feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
    }
}

function showPendingOrdersList(date, area) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal-card"><div class="loading-state">جاري تحميل الطلبات...</div></div>';
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    api('/api/driver/pending-orders-list?date=' + encodeURIComponent(date) + '&area=' + encodeURIComponent(area))
        .then(orders => {
            const list = Array.isArray(orders) ? orders : [];
            modal.querySelector('.modal-card').innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                    <h3 style="margin:0;font-size:1.2rem">${area} - ${formatDate(date)}</h3>
                    <button type="button" class="btn" onclick="this.closest('.modal-overlay').remove()">✕ إغلاق</button>
                </div>
                ${list.length === 0
                    ? '<div class="empty-state"><p>لا توجد طلبات</p></div>'
                    : '<div class="pending-orders-list">' + list.map(o => `
                        <div class="order-card" style="cursor:default">
                            <div class="order-card-header">
                                <span class="order-shipment">#${o.ShipmentNumber}</span>
                                <span class="order-amount">${formatIQD(o.TotalIQD)}</span>
                            </div>
                            <div class="order-customer">${(o.CustomerName || '—')}</div>
                            <div class="order-address">${(o.Address || '—')}</div>
                            ${o.RegionName ? '<div class="order-region">' + o.RegionName + '</div>' : ''}
                            ${o.StoreName ? '<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px">' + (o.StoreName || '') + '</div>' : ''}
                        </div>
                    `).join('') + '</div>'
                }
            `;
        })
        .catch(e => {
            modal.querySelector('.modal-card').innerHTML = '<div class="receive-feedback error">' + (e.message || 'فشل التحميل') + '</div><button type="button" class="btn" onclick="this.closest(\'.modal-overlay\').remove()">إغلاق</button>';
        });
}

async function renderStats(container) {
    let selectedDate = getLocalDateStr();
    const render = async () => {
        container.innerHTML = '<div class="loading-state">جاري تحميل الإحصائيات...</div>';
        try {
            const [statsData, deliveredOrders] = await Promise.all([
                api('/api/driver/stats?date=' + selectedDate),
                api('/api/driver/delivered-orders?date=' + selectedDate)
            ]);
            const totalAmountDue = calcTotalAmountDue(deliveredOrders);
            const stats = { ...statsData, totalAmountDue };
            const todayStr = getLocalDateStr();
            const goPrev = () => {
                selectedDate = addDays(selectedDate, -1);
                render();
            };
            const goNext = () => {
                if (selectedDate >= todayStr) return;
                selectedDate = addDays(selectedDate, 1);
                render();
            };
            container.innerHTML = `
                <div class="stats-date-nav">
                    <button type="button" class="btn btn-secondary" onclick="document.driverGoPrev()">← السابق</button>
                    <span class="stats-date-label">${formatDateShort(selectedDate)}</span>
                    <button type="button" class="btn btn-secondary" ${selectedDate >= todayStr ? 'disabled' : ''} onclick="document.driverGoNext()">التالي →</button>
                </div>
                <p style="text-align:center;color:var(--text-muted);margin-bottom:20px">${formatDate(selectedDate)}</p>
                <div class="stats-cards">
                    <div class="stat-card green"><div class="stat-value">${stats.delivered ?? 0}</div><div class="stat-label">تم التوصيل</div></div>
                    <div class="stat-card red"><div class="stat-value">${stats.returned ?? 0}</div><div class="stat-label">تم الإرجاع</div></div>
                </div>
                <div class="stat-card gray" style="margin-bottom:12px">
                    <div class="stat-value">${stats.orderCount ?? 0}</div>
                    <div class="stat-label">عدد الطلبات</div>
                    <div style="margin-top:10px;font-size:0.85rem">
                        تم التوصيل: ${stats.delivered ?? 0} | تم الإرجاع: ${stats.returned ?? 0} | لم يوصل: ${stats.notDelivered ?? 0}
                    </div>
                </div>
                <div class="stats-cards">
                    <div class="stat-card teal"><div class="stat-value" style="font-size:1.2rem">${formatIQD(stats.totalDeliveredIQD)}</div><div class="stat-label">المبلغ الكلي</div></div>
                    <div class="stat-card teal"><div class="stat-value" style="font-size:1.2rem">${formatIQD(stats.totalAmountDue)}</div><div class="stat-label">المبلغ المستحق</div></div>
                </div>
                ${stats.feesCollected !== undefined ? `
                <div class="fee-badge ${stats.feesCollected ? 'paid' : 'unpaid'}">
                    ${stats.feesCollected ? '✓ تم تسديد المستحقات' : '○ لم يُسدّد المستحقات بعد'}
                </div>
                ` : ''}
                <div style="margin-top:24px;padding:20px;background:linear-gradient(135deg,#475569,#64748b);border-radius:14px;text-align:center;color:#fff">
                    <div style="font-size:0.9rem;opacity:0.9;margin-bottom:6px">العدد الكلي المعك حالياً</div>
                    <div style="font-size:2rem;font-weight:800">${stats.assigned ?? 0}</div>
                </div>
            `;
            document.driverGoPrev = goPrev;
            document.driverGoNext = goNext;
        } catch (e) {
            container.innerHTML = '<div class="empty-state"><p class="receive-feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
        }
    };
    await render();
}

async function renderHistory(container) {
    let tab = 'delivered';
    let selectedDate = getLocalDateStr();
    const doRender = async () => {
        container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
        try {
            const [orders, stats] = await Promise.all([
                tab === 'delivered' ? api('/api/driver/delivered-orders?date=' + selectedDate) : api('/api/driver/returned-orders?date=' + selectedDate),
                api('/api/driver/stats?date=' + selectedDate)
            ]);
            const list = Array.isArray(orders) ? orders : [];
            const todayStr = getLocalDateStr();
            const fmtDt = (d) => d ? new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
            container.innerHTML = `
                <div class="history-date-nav">
                    <button type="button" class="btn btn-primary" onclick="document.driverHistPrev()">← السابق</button>
                    <span class="stats-date-label">${formatDateShort(selectedDate)}</span>
                    <button type="button" class="btn btn-secondary" ${selectedDate >= todayStr ? 'disabled' : ''} onclick="document.driverHistNext()">التالي →</button>
                </div>
                <div class="history-tabs">
                    <button type="button" class="history-tab ${tab === 'delivered' ? 'active' : ''}" data-t="delivered">الموصّل</button>
                    <button type="button" class="history-tab ${tab === 'returned' ? 'active' : ''}" data-t="returned">المراجع</button>
                </div>
                ${stats?.assigned != null ? `<div style="background:var(--primary);color:#fff;padding:10px 16px;border-radius:10px;text-align:center;margin-bottom:12px">طلبات لم توصل: ${stats.assigned}</div>` : ''}
                ${list.length === 0 ? '<div class="empty-state"><p>' + (tab === 'delivered' ? 'لا توجد طلبات موصّلة' : 'لا توجد طلبات مرتجعة') + '</p></div>' : list.map(o => `
                    <div class="history-card">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                            <span style="font-weight:700;color:var(--primary)">#${o.ShipmentNumber}</span>
                            ${tab === 'delivered' ? '<span style="font-weight:600;color:var(--success)">' + formatIQD(o.TotalIQD) + '</span>' : ''}
                        </div>
                        <div>${o.CustomerName || '—'}</div>
                        <div style="font-size:0.9rem;color:var(--text-muted);margin:4px 0">${(o.Address || '—').slice(0, 80)}</div>
                        ${o.RegionName ? '<div style="font-size:0.8rem;color:var(--text-muted)">' + o.RegionName + '</div>' : ''}
                        ${tab === 'returned' && o.ReturnReason ? '<div style="font-size:0.85rem;color:var(--danger)">سبب الإرجاع: ' + o.ReturnReason + '</div>' : ''}
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
                            ${tab === 'delivered' ? 'التوصيل: ' + fmtDt(o.DeliveredDate) : 'الإرجاع: ' + fmtDt(o.ReturnedDate)}
                        </div>
                    </div>
                `).join('')}
            `;
            container.querySelectorAll('.history-tab').forEach(b => {
                b.onclick = () => { tab = b.dataset.t; doRender(); };
            });
            document.driverHistPrev = () => {
                selectedDate = addDays(selectedDate, -1);
                doRender();
            };
            document.driverHistNext = () => {
                if (selectedDate >= todayStr) return;
                selectedDate = addDays(selectedDate, 1);
                doRender();
            };
        } catch (e) {
            container.innerHTML = '<div class="empty-state"><p class="receive-feedback error">' + (e.message || 'فشل التحميل') + '</p></div>';
        }
    };
    await doRender();
}

function renderSettings(container) {
    container.innerHTML = `
        <div class="settings-profile">
            <div class="settings-avatar">👤</div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px">اسم السائق</div>
            <div class="settings-driver-name">${app.driver?.DriverName || '—'}</div>
        </div>
        <button type="button" class="btn-logout" id="btnLogout">تسجيل الخروج</button>
        <p style="text-align:center;margin-top:24px;font-size:0.9rem;color:var(--text-muted)">تطبيق السائق • شركة ديما الحياة</p>
    `;
    document.getElementById('btnLogout').onclick = async () => {
        if (!confirm('هل تريد تسجيل الخروج؟')) return;
        try { await api('/api/auth/driver-logout', { method: 'POST' }); } catch (_) {}
        setToken(null);
        setDriver(null);
        showLogin();
    };
}

function showOrderDetail(order) {
    app.currentOrder = order;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-shipment">#${order.ShipmentNumber}</div>
            <div class="modal-row"><div class="modal-label">المحل</div><div class="modal-value">${order.StoreName || '—'}</div></div>
            <div class="modal-row"><div class="modal-label">العميل</div><div class="modal-value">${order.CustomerName || '—'}</div></div>
            <div class="modal-row">
                <div class="modal-label">هاتف العميل</div>
                <div class="modal-value">
                    <a href="tel:${(order.CustomerPhone || '').replace(/\D/g, '')}" class="modal-link">${order.CustomerPhone || '—'}</a>
                </div>
            </div>
            <div class="modal-row"><div class="modal-label">العنوان</div><div class="modal-value">${order.Address || '—'}</div></div>
            ${order.CustomerLocationLink ? `
            <div class="modal-row">
                <div class="modal-label">رابط الموقع</div>
                <div class="modal-value"><a href="${order.CustomerLocationLink}" target="_blank" class="modal-link">فتح على الخريطة</a></div>
            </div>
            ` : ''}
            <div class="modal-row"><div class="modal-label">المبلغ</div><div class="modal-value" style="font-weight:800;color:var(--success)">${formatIQD(order.TotalIQD)}</div></div>
            ${order.Notes ? '<div class="modal-row"><div class="modal-label">ملاحظات</div><div class="modal-value">' + order.Notes + '</div></div>' : ''}
            <div class="modal-actions">
                <button type="button" class="modal-btn deliver" id="btnDeliver">✓ تم التوصيل</button>
                <button type="button" class="modal-btn return" id="btnReturn">↩ إرجاع الطلب</button>
            </div>
        </div>
    `;
    const close = () => { modal.remove(); };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    document.body.appendChild(modal);
    document.getElementById('btnDeliver').onclick = async () => {
        if (!confirm('هل تم توصيل الطلب #' + order.ShipmentNumber + ' بنجاح؟')) return;
        try {
            await api('/api/driver/orders/' + order.OrderID + '/deliver', { method: 'POST' });
            close();
            renderTab();
        } catch (e) {
            alert('خطأ: ' + (e.message || 'فشل تأكيد التوصيل'));
        }
    };
    const reasons = ['غير متوفر', 'رفض الاستلام', 'عنوان خاطئ', 'المحل مغلق', 'أخرى'];
    document.getElementById('btnReturn').onclick = async () => {
        const reason = prompt('سبب الإرجاع:\n' + reasons.join('\n') + '\n\nاختر أو اكتب السبب:') || 'أخرى';
        try {
            await api('/api/driver/orders/' + order.OrderID + '/return', {
                method: 'POST',
                body: JSON.stringify({ returnReason: reason })
            });
            close();
            renderTab();
        } catch (e) {
            alert('خطأ: ' + (e.message || 'فشل الإرجاع'));
        }
    };
}

// ─── البدء ───
document.addEventListener('DOMContentLoaded', () => {
    app.token = getToken();
    app.driver = getDriver();
    if (app.token && app.driver?.DriverID) {
        showMain();
    } else {
        showLogin();
    }

    document.getElementById('btnLogin').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginError');
        if (!username || !password) {
            errEl.style.display = 'block';
            errEl.textContent = 'أدخل اسم المستخدم وكلمة المرور';
            return;
        }
        errEl.style.display = 'none';
        try {
            const data = await api('/api/auth/driver-login', {
                method: 'POST',
                headers: {},
                body: JSON.stringify({ username, password })
            });
            setToken(data.token);
            setDriver(data.driver);
            app.token = data.token;
            app.driver = data.driver;
            showMain();
        } catch (e) {
            errEl.style.display = 'block';
            errEl.textContent = e.message || 'فشل تسجيل الدخول';
        }
    });

    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btnLogin').click();
    });

    document.querySelectorAll('.bottom-nav-item').forEach(tab => {
        tab.addEventListener('click', () => {
            app.currentTab = tab.dataset.tab;
            renderTab();
        });
    });
});
