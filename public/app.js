// ─── المصادقة والصلاحيات ───
let currentUser = null;

let driversCache = { data: null, ts: 0 };
async function getDriversCached(force) {
    if (!force && driversCache.data && Date.now() - driversCache.ts < 120000) {
        return driversCache.data;
    }
    const data = await window.api.drivers.getAll();
    driversCache = { data, ts: Date.now() };
    return data;
}
function invalidateDriversCache() {
    driversCache = { data: null, ts: 0 };
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

let dashboardHomeCache = { data: null, ts: 0 };
const DASHBOARD_CACHE_MS = 45000;

async function getDashboardHomeCached(force) {
    if (!force && dashboardHomeCache.data && Date.now() - dashboardHomeCache.ts < DASHBOARD_CACHE_MS) {
        return dashboardHomeCache.data;
    }
    const home = await window.api.dashboard.home();
    dashboardHomeCache = { data: home, ts: Date.now() };
    return home;
}

function invalidateDashboardCache() {
    dashboardHomeCache = { data: null, ts: 0 };
}

const screenMounts = new Map();

function screenCacheKey(screenId, subTab) {
    return `${screenId}:${subTab || ''}`;
}

function invalidateScreenCache(screenId) {
    if (screenId) {
        screenMounts.forEach((entry, key) => {
            if (key.startsWith(`${screenId}:`)) entry.stale = true;
        });
        return;
    }
    screenMounts.clear();
    const container = document.getElementById('screen-container');
    if (container) container.innerHTML = '';
}

const ORDERS_LIST_LIMIT = 400;
const ORDERS_MOBILE_MQ = window.matchMedia('(max-width: 768px)');

async function checkAuth() {
    const token = window.api.auth.getToken();
    if (!token) return false;
    try {
        currentUser = await window.api.auth.me();
        return !!currentUser;
    } catch {
        window.api.auth.setToken('');
        return false;
    }
}

function showApp() {
    document.body.classList.remove('is-login-screen');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'flex';
    const appMain = document.getElementById('app-main');
    if (currentUser) {
        // مزامنة القيم الافتراضية من localStorage إلى السيرفر (لويب الموظفين)
        if (currentUser.Role === 'admin') {
            const localStore = localStorage.getItem('defaultStoreName') || '';
            const localPhone = localStorage.getItem('defaultStorePhone') || '';
            if (localStore || localPhone) {
                window.api.settings.getDefaults().then(s => {
                    if (!(s?.storeName || s?.storePhone)) {
                        window.api.settings.updateDefaults({ storeName: localStore, storePhone: localPhone }).catch(() => {});
                    }
                }).catch(() => {});
            }
        }
        const isEmployee = currentUser.Role === 'employee';
        appMain?.classList.toggle('employee-mode', isEmployee);
        document.getElementById('sidebarUserInfo').innerHTML = isEmployee
            ? `<div class="user-info-employee">
                <div class="user-avatar">👤</div>
                <div class="user-details">
                    <div class="user-name">${(currentUser.DisplayName || currentUser.Username || 'موظف').replace(/</g, '&lt;')}</div>
                    <div class="user-role-badge">موظف</div>
                </div>
               </div>`
            : `<div class="user-info-employee user-info-admin">
                <div class="user-avatar user-avatar--admin"><i class="bi bi-shield-check"></i></div>
                <div class="user-details">
                    <div class="user-name">${(currentUser.DisplayName || currentUser.Username || 'مدير').replace(/</g, '&lt;')}</div>
                    <div class="user-role-badge user-role-badge--admin">${currentUser.Role === 'admin' ? 'مدير النظام' : 'موظف'}</div>
                </div>
               </div>`;
        document.querySelectorAll('.nav-admin').forEach(el => {
            el.style.display = currentUser.Role === 'admin' ? '' : 'none';
        });
        document.querySelectorAll('.mobile-bottom-nav .nav-admin').forEach(el => {
            el.style.display = currentUser.Role === 'admin' ? '' : 'none';
        });
        const btnAdmin = document.getElementById('btnAdminLogin');
        if (btnAdmin) btnAdmin.style.display = currentUser.Role === 'admin' ? 'none' : '';
        initSidebarNav();
        const defaultScreen = currentUser.Role === 'admin' ? 'dashboard' : 'new-order';
        setNavActive(defaultScreen);
        showScreen(defaultScreen);
    }
}

function showLogin() {
    document.body.classList.add('is-login-screen');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
    currentUser = null;
    invalidateScreenCache();
    invalidateDashboardCache();
    invalidateDriversCache();
}

const STATUS_MAP = {
    New: 'جديد',
    AssignedToDriver: 'مع السائق',
    Delivered: 'تم التوصيل',
    Returned: 'راجع'
};
function isOrderReturned(o) {
    const s = String(o?.Status ?? o?.status ?? '').trim();
    return s === 'Returned' || /راجع|returned/i.test(s) || s === 'Canceled' || s === 'ملغي';
}

function formatIQD(val) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val || 0));
}

function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseISODate(s) {
    if (!s) return null;
    const parts = String(s).split('-').map(Number);
    if (parts.length < 3) return null;
    const [y, m, day] = parts;
    return new Date(y, m - 1, day);
}

function formatDateAr(iso) {
    if (!iso) return '—';
    const d = parseISODate(iso);
    if (!d || Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('ar-IQ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(d);
}

function formatDateShortAr(iso) {
    if (!iso) return '—';
    const d = parseISODate(iso);
    if (!d || Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('ar-IQ', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    }).format(d);
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function splitISODate(iso) {
    const d = parseISODate(iso) || new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() };
}

function buildDateSelectOptions(y, m, day) {
    const currentYear = new Date().getFullYear();
    let years = '';
    for (let yr = currentYear + 1; yr >= currentYear - 6; yr--) {
        years += `<option value="${yr}"${yr === y ? ' selected' : ''}>${yr}</option>`;
    }
    let months = '';
    for (let mo = 1; mo <= 12; mo++) {
        const v = String(mo).padStart(2, '0');
        months += `<option value="${v}"${mo === m ? ' selected' : ''}>${v}</option>`;
    }
    const maxDay = getDaysInMonth(y, m);
    const safeDay = Math.min(day, maxDay);
    let days = '';
    for (let da = 1; da <= maxDay; da++) {
        const v = String(da).padStart(2, '0');
        days += `<option value="${v}"${da === safeDay ? ' selected' : ''}>${v}</option>`;
    }
    return { years, months, days, safeDay };
}

function dateRangePickerHtml(prefix, today, opts = {}) {
    const fromId = opts.fromId || `${prefix}DateFrom`;
    const toId = opts.toId || `${prefix}DateTo`;
    const parts = splitISODate(today);
    const fromOpts = buildDateSelectOptions(parts.y, parts.m, parts.day);
    return `
        <div class="date-range-picker" data-prefix="${prefix}" data-today="${today}">
            <input type="hidden" id="${fromId}" class="date-hidden-from" value="${today}">
            <input type="hidden" id="${toId}" class="date-hidden-to" value="${today}">
            <div class="date-range-row">
                <div class="date-range-block" data-side="from">
                    <label class="date-range-label">من تاريخ</label>
                    <div class="date-triple" data-side="from">
                        <select class="date-part date-y" aria-label="سنة من">${fromOpts.years}</select>
                        <span class="date-sep" aria-hidden="true">/</span>
                        <select class="date-part date-m" aria-label="شهر من">${fromOpts.months}</select>
                        <span class="date-sep" aria-hidden="true">/</span>
                        <select class="date-part date-d" aria-label="يوم من">${fromOpts.days}</select>
                    </div>
                </div>
                <div class="date-range-block" data-side="to">
                    <label class="date-range-label">إلى تاريخ</label>
                    <div class="date-triple" data-side="to">
                        <select class="date-part date-y" aria-label="سنة إلى">${fromOpts.years}</select>
                        <span class="date-sep" aria-hidden="true">/</span>
                        <select class="date-part date-m" aria-label="شهر إلى">${fromOpts.months}</select>
                        <span class="date-sep" aria-hidden="true">/</span>
                        <select class="date-part date-d" aria-label="يوم إلى">${fromOpts.days}</select>
                    </div>
                </div>
            </div>
            <div class="date-range-summary">من ${parts.y}/${String(parts.m).padStart(2, '0')}/${String(fromOpts.safeDay).padStart(2, '0')} — إلى ${parts.y}/${String(parts.m).padStart(2, '0')}/${String(fromOpts.safeDay).padStart(2, '0')}</div>
        </div>`;
}

function readDateTriple(triple) {
    const y = parseInt(triple.querySelector('.date-y')?.value, 10);
    const m = parseInt(triple.querySelector('.date-m')?.value, 10);
    let d = parseInt(triple.querySelector('.date-d')?.value, 10);
    if (!y || !m || !d) return '';
    const max = getDaysInMonth(y, m);
    if (d > max) d = max;
    return toISODate(new Date(y, m - 1, d));
}

function setDateTriple(triple, iso) {
    const { y, m, day } = splitISODate(iso);
    const opts = buildDateSelectOptions(y, m, day);
    const yEl = triple.querySelector('.date-y');
    const mEl = triple.querySelector('.date-m');
    const dEl = triple.querySelector('.date-d');
    if (yEl) yEl.innerHTML = opts.years;
    if (mEl) mEl.innerHTML = opts.months;
    if (dEl) dEl.innerHTML = opts.days;
    if (yEl) yEl.value = String(y);
    if (mEl) mEl.value = String(m).padStart(2, '0');
    if (dEl) dEl.value = String(opts.safeDay).padStart(2, '0');
}

function refreshDateTripleDays(triple) {
    const y = parseInt(triple.querySelector('.date-y')?.value, 10);
    const m = parseInt(triple.querySelector('.date-m')?.value, 10);
    const dEl = triple.querySelector('.date-d');
    if (!y || !m || !dEl) return;
    const cur = parseInt(dEl.value, 10) || 1;
    const max = getDaysInMonth(y, m);
    const safe = Math.min(cur, max);
    let days = '';
    for (let da = 1; da <= max; da++) {
        const v = String(da).padStart(2, '0');
        days += `<option value="${v}"${da === safe ? ' selected' : ''}>${v}</option>`;
    }
    dEl.innerHTML = days;
}

function formatDateSlash(iso) {
    if (!iso) return '—';
    const { y, m, day } = splitISODate(iso);
    return `${y}/${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

function initDateRangePicker(root) {
    if (!root || root.dataset.initialized === '1') return;
    root.dataset.initialized = '1';
    const fromHidden = root.querySelector('.date-hidden-from');
    const toHidden = root.querySelector('.date-hidden-to');
    const fromTriple = root.querySelector('.date-triple[data-side="from"]');
    const toTriple = root.querySelector('.date-triple[data-side="to"]');
    const summary = root.querySelector('.date-range-summary');
    const today = root.dataset.today || toISODate(new Date());

    if (fromTriple && fromHidden) setDateTriple(fromTriple, fromHidden.value || today);
    if (toTriple && toHidden) setDateTriple(toTriple, toHidden.value || today);

    const sync = () => {
        let fromIso = readDateTriple(fromTriple);
        let toIso = readDateTriple(toTriple);
        if (fromIso && toIso && toIso < fromIso) {
            setDateTriple(toTriple, fromIso);
            toIso = fromIso;
        }
        if (fromHidden) fromHidden.value = fromIso;
        if (toHidden) toHidden.value = toIso;
        if (summary) summary.textContent = `من ${formatDateSlash(fromIso)} — إلى ${formatDateSlash(toIso)}`;
    };

    const bindTriple = (triple) => {
        triple?.querySelectorAll('.date-part').forEach(el => {
            el.addEventListener('change', () => {
                refreshDateTripleDays(triple);
                sync();
            });
        });
    };

    bindTriple(fromTriple);
    bindTriple(toTriple);
    sync();
}

function initAllDateRangePickers(scope) {
    (scope || document).querySelectorAll('.date-range-picker').forEach(initDateRangePicker);
}

/* المبلغ المستحق = المبلغ النهائي - أجرة التوصيل */
function getAmountDue(o) {
    const total = Number(o.TotalIQD ?? 0) || 0;
    const free = !!(o.FreeDelivery);
    const deliveryAmt = free ? (Number(o.WaivedDeliveryIQD ?? 0) || 0) : (Number(o.DeliveryFeeIQD ?? 0) || 0);
    return total - deliveryAmt;
}

function getFullAddress(o) {
    const region = (o.RegionName || '').trim();
    const addr = (o.Address || '').trim();
    if (region && addr) return region + ' - ' + addr;
    return region || addr || '-';
}

function orderStatusBadgeClass(status) {
    return 'badge-' + String(status || 'new').toLowerCase()
        .replace('assignedtodriver', 'assigned')
        .replace('delivered', 'delivered')
        .replace('returned', 'returned');
}

function renderOrderActionsHtml(o) {
    return `
        <div class="order-actions order-actions--stack">
            <button type="button" class="btn btn-sm btn-print-order" data-order-id="${o.OrderID}" title="طباعة الملصق"><i class="bi bi-printer"></i><span class="order-action-label">طباعة</span></button>
            <button type="button" class="btn btn-sm btn-edit" data-order-id="${o.OrderID}" title="تعديل الطلب"><i class="bi bi-pencil-square" aria-hidden="true"></i><span class="order-action-label">تعديل</span></button>
            ${currentUser?.Role === 'admin' ? `
            <div class="status-quick-btns" title="تغيير سريع للحالة">
                <button type="button" class="btn-status-sm btn-status-sm--ok" data-order-id="${o.OrderID}" data-status="Delivered" title="تم التوصيل">✓</button>
                <button type="button" class="btn-status-sm btn-status-sm--ret" data-order-id="${o.OrderID}" data-status="Returned" title="راجع">↩</button>
            </div>
            <button type="button" class="btn btn-sm btn-delete" data-order-id="${o.OrderID}" title="حذف الطلب"><i class="bi bi-trash" aria-hidden="true"></i></button>
            ` : ''}
        </div>`;
}

function renderOrderCardHtml(o) {
    const notesRaw = (o.Notes || '').trim();
    const loc = (o.CustomerLocationLink || '').replace(/"/g, '&quot;');
    const returned = isOrderReturned(o);
    return `
        <article class="order-mobile-card ${returned ? 'order-mobile-card--returned' : ''}" data-order-id="${o.OrderID}">
            <div class="order-mobile-card__head">
                <div class="order-mobile-card__shipment">${escapeHtml(o.ShipmentNumber)}</div>
                <span class="badge ${orderStatusBadgeClass(o.Status)}">${STATUS_MAP[o.Status] || escapeHtml(o.Status || '') || '—'}</span>
            </div>
            <div class="order-mobile-card__meta">#${o.OrderID} · ${escapeHtml(o.AdminOrderNo || '—')} · ${o.Pieces || 1} قطعة</div>
            <div class="order-mobile-card__party">
                <div class="order-mobile-card__name">${escapeHtml(o.CustomerName || '—')}</div>
                <a class="order-mobile-card__phone" href="tel:${escapeHtml((o.CustomerPhone || '').replace(/\s/g, ''))}">${escapeHtml(o.CustomerPhone || '—')}</a>
                <div class="order-mobile-card__store"><i class="bi bi-shop" aria-hidden="true"></i> ${escapeHtml(o.StoreName || '—')}</div>
            </div>
            <div class="order-mobile-card__address">${escapeHtml(getFullAddress(o))}</div>
            ${notesRaw ? `<div class="order-mobile-card__notes"><i class="bi bi-chat-square-text" aria-hidden="true"></i><span>${escapeHtml(notesRaw)}</span></div>` : ''}
            ${returned && (o.ReturnReason || '').trim() ? `<div class="order-mobile-card__return">${escapeHtml((o.ReturnReason || '').trim())}</div>` : ''}
            <div class="order-mobile-card__amounts">
                <div class="order-mobile-amount"><span>فاتورة</span><strong class="iqd">${formatIQD(o.AmountIQD)}</strong></div>
                <div class="order-mobile-amount"><span>توصيل</span><strong class="iqd">${o.FreeDelivery ? 'مجاني' : formatIQD(o.DeliveryFeeIQD)}</strong></div>
                <div class="order-mobile-amount order-mobile-amount--total"><span>نهائي</span><strong class="iqd">${formatIQD(o.TotalIQD)}</strong></div>
                <div class="order-mobile-amount"><span>مستحق</span><strong class="iqd">${formatIQD(getAmountDue(o))}</strong></div>
            </div>
            <div class="order-mobile-card__ops">
                <span><b>سائق:</b> ${escapeHtml(o.DriverName || '—')}</span>
                <span><b>ملصق:</b> ${o.LabelPrinted ? 'مطبوع' : 'لم يُطبع'}</span>
            </div>
            ${o.CustomerLocationLink ? `<a href="${loc}" target="_blank" rel="noopener noreferrer" class="order-mobile-loc"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> فتح موقع الزبون</a>` : ''}
            <div class="order-mobile-card__actions">${renderOrderActionsHtml(o)}</div>
        </article>`;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderUxHero(opts = {}) {
    const icon = opts.icon || 'bi-grid';
    const title = escapeHtml(opts.title || '');
    const subtitle = opts.subtitle
        ? `<p class="ux-hero__sub">${escapeHtml(opts.subtitle)}</p>`
        : '';
    const badges = (opts.badges || [])
        .map(b => `<span class="ux-hero__badge">${escapeHtml(String(b))}</span>`)
        .join('');
    const variant = opts.variant ? ` ux-hero--${opts.variant}` : '';
    const actions = opts.actionsHtml || '';
    return `
    <header class="ux-hero${variant}">
        <div class="ux-hero__glow" aria-hidden="true"></div>
        <div class="ux-hero__icon" aria-hidden="true"><i class="bi ${icon}"></i></div>
        <div class="ux-hero__body">
            <div class="ux-hero__top">
                <h1 class="ux-hero__title">${title}</h1>
                ${badges ? `<div class="ux-hero__badges">${badges}</div>` : ''}
            </div>
            ${subtitle}
            ${actions}
        </div>
    </header>`;
}

function renderUxPipeline(steps) {
    return `<div class="ux-pipeline" aria-label="مسار الطلب">${steps.map((s, i) => {
        const btn = `<button type="button" class="ux-pipeline__step ${s.mod || ''} dash-stat-link" data-screen="${s.screen || 'orders'}" data-status="${s.status || ''}">
            <span class="ux-pipeline__num">${s.count}</span>
            <span class="ux-pipeline__label">${escapeHtml(s.label)}</span>
        </button>`;
        const line = i < steps.length - 1 ? '<div class="ux-pipeline__connector" aria-hidden="true"><i class="bi bi-chevron-left"></i></div>' : '';
        return btn + line;
    }).join('')}</div>`;
}

function renderUxSubnav(items, activeId) {
    return `<nav class="ux-subnav" aria-label="تبويبات الصفحة">${items.map(item => `
        <button type="button" class="ux-subnav__item${item.id === activeId ? ' is-active' : ''}" data-tab="${item.id}">
            ${item.icon ? `<i class="bi ${item.icon}" aria-hidden="true"></i>` : ''}
            <span>${escapeHtml(item.label)}</span>
        </button>`).join('')}</nav>`;
}

function bindUxSubnav(container, opts) {
    const { paneSelector, panePrefix, onChange } = opts;
    container.querySelectorAll('.ux-subnav__item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            container.querySelectorAll('.ux-subnav__item').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
            container.querySelectorAll(paneSelector).forEach(p => p.classList.remove('active'));
            container.querySelector(`${panePrefix}${tab}`)?.classList.add('active');
            container.dataset.initialTab = tab;
            const screenId = document.getElementById('screen-container')?.dataset.currentScreen;
            if (screenId) updateDesktopChrome(screenId, tab);
            if (onChange) onChange(tab);
        });
    });
}

function renderUxError(title, message) {
    return `
        <div class="screen active ux-error-screen">
            ${renderUxHero({
                icon: 'bi-exclamation-triangle',
                title: title || 'حدث خطأ',
                subtitle: message || 'تعذّر تحميل الصفحة',
                variant: 'danger'
            })}
            <div class="ux-panel ux-panel--center">
                <p class="ux-error-text">${escapeHtml(message || '')}</p>
            </div>
        </div>`;
}

function pickNotificationNotes(n) {
    const raw = n?.Notes ?? n?.OrderNotes ?? n?.notes ?? '';
    return String(raw).trim();
}

function formatNotificationWhen(value) {
    if (!value) return '—';
    const s = String(value).trim();
    if (s.length >= 16) return s.slice(0, 16).replace('T', ' ');
    return s;
}

function renderOverrideNotification(n) {
    const notesRaw = pickNotificationNotes(n);
    const performer = escapeHtml(n.PerformedByName || '—');
    const invoiceNo = escapeHtml(String(n.AdminOrderNo || n.ShipmentNumber || '—'));
    const address = escapeHtml((n.Address || '—').toString());
    const price = formatIQD(n.AmountIQD ?? n.TotalIQD);
    const notes = notesRaw ? escapeHtml(notesRaw) : '—';

    return `
    <article class="ovn-card" data-id="${n.NotificationID}">
        <div class="ovn-card-top">
            <button type="button" class="ovn-done-btn btn-override-seen" data-id="${n.NotificationID}" title="تمت المراجعة">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                <span>تمت المراجعة</span>
            </button>
        </div>

        <dl class="ovn-simple-list">
            <div class="ovn-simple-row">
                <dt>اسم الموظف</dt>
                <dd>${performer}</dd>
            </div>
            <div class="ovn-simple-row">
                <dt>رقم الفاتورة</dt>
                <dd>${invoiceNo}</dd>
            </div>
            <div class="ovn-simple-row">
                <dt>العنوان</dt>
                <dd>${address}</dd>
            </div>
            <div class="ovn-simple-row">
                <dt>السعر</dt>
                <dd class="iqd">${price}</dd>
            </div>
            <div class="ovn-simple-row ovn-simple-row--notes">
                <dt>ملاحظات</dt>
                <dd>${notes}</dd>
            </div>
        </dl>
    </article>`;
}

// تنقية المدخل من أجهزة قراءة الباركود - استخراج الأرقام فقط (مثل DH2603000014 → 2603000014)
function normalizeBarcodeInput(str) {
    if (!str || typeof str !== 'string') return '';
    const digits = str.replace(/\D/g, '');  // إزالة كل ما عدا الأرقام
    return digits;
}

async function showMsg(msg, title) {
    await window.api.showMessage(msg, title);
}

async function showEditOrderModal(container, order, onSuccess) {
    let regions = [];
    try {
        regions = await window.api.regions.getAll();
    } catch (_) {}
    const isAdmin = currentUser?.Role === 'admin';
    const driverDelivery = order.FreeDelivery ? (order.WaivedDeliveryIQD || 0) : (order.DeliveryFeeIQD || 0);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <h3>تعديل الطلب ${order.ShipmentNumber}</h3>
            <form id="editOrderForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label>رقم الطلب الإداري</label>
                        <input type="text" id="editAdminOrderNo" value="${(order.AdminOrderNo || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>رقم الشحنة (غير قابل للتعديل)</label>
                        <input type="text" value="${order.ShipmentNumber}" disabled>
                    </div>
                    <div class="form-group">
                        <label>تاريخ الطلب</label>
                        <input type="date" id="editOrderDate" ${isAdmin ? '' : 'disabled'} value="${(order.CreatedDate || '').slice(0, 10)}">
                        ${isAdmin ? '' : '<div class="form-hint" style="margin-top:4px">المدير فقط يمكنه التعديل</div>'}
                    </div>
                    <div class="form-group">
                        <label>المتجر</label>
                        <input type="text" id="editStoreName" value="${(order.StoreName || '').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label>هاتف المتجر</label>
                        <input type="text" id="editStorePhone" value="${(order.StorePhone || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>اسم المستلم (اختياري)</label>
                        <input type="text" id="editCustomerName" value="${(order.CustomerName || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>هاتف المستلم</label>
                        <input type="text" id="editCustomerPhone" value="${(order.CustomerPhone || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>المنطقة</label>
                        <select id="editRegionId">
                            <option value="">-- لا منطقة --</option>
                            ${regions.map(r => `<option value="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}" ${(order.RegionID && r.RegionID === order.RegionID) ? 'selected' : ''}>${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)} د.ع)</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group full">
                        <label>العنوان (تفاصيل)</label>
                        <input type="text" id="editAddress" value="${(order.Address || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>عدد القطع</label>
                        <input type="number" id="editPieces" value="${order.Pieces || 1}" min="1">
                    </div>
                    <div class="form-group">
                        <label>مبلغ الفاتورة (د.ع)</label>
                        <input type="number" id="editAmount" value="${order.AmountIQD || 0}" min="0" step="1">
                    </div>
                    <div class="form-group">
                        <label>أجرة التوصيل (د.ع)${currentUser?.Role === 'employee' ? ' <span class="form-hint">(ثابتة حسب المنطقة)</span>' : ''}</label>
                        <input type="number" id="editDeliveryFee" value="${driverDelivery || 0}" min="0" step="1" ${currentUser?.Role === 'employee' ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                            <input type="checkbox" id="editFreeDelivery" ${order.FreeDelivery ? 'checked' : ''}>
                            توصيل مجاني
                        </label>
                    </div>
                    <div class="form-group full edit-order-totals" style="background:var(--bg-main);padding:12px;border-radius:8px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>المبلغ النهائي:</span><strong id="editTotalDisplay">0</strong></div>
                        <div style="display:flex;justify-content:space-between"><span>المبلغ المستحق:</span><strong id="editDueDisplay">0</strong></div>
                    </div>
                    <div class="form-group full">
                        <label>رابط موقع الزبون (اختياري)</label>
                        <input type="url" id="editCustomerLocationLink" placeholder="رابط خرائط جوجل أو موقع التوصيل" value="${(order.CustomerLocationLink || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group full">
                        <label>ملاحظات</label>
                        <textarea id="editNotes" rows="2">${(order.Notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                    </div>
                    ${(order.Status === 'Returned' && order.ReturnReason) ? `
                    <div class="form-group full">
                        <label>سبب الإرجاع (من السائق)</label>
                        <input type="text" value="${(order.ReturnReason || '').replace(/"/g, '&quot;')}" disabled>
                    </div>
                    ` : ''}
                    ${currentUser?.Role === 'admin' ? `
                    <div class="form-group full">
                        <label>تغيير الحالة (للربط مع تطبيق السائق)</label>
                        <div class="status-buttons" id="editStatusButtons">
                            <button type="button" class="btn-status" data-status="New" title="جديد">جديد</button>
                            <button type="button" class="btn-status" data-status="AssignedToDriver" title="مع السائق">مع السائق</button>
                            <button type="button" class="btn-status" data-status="Delivered" title="تم التوصيل">تم التوصيل</button>
                            <button type="button" class="btn-status" data-status="Returned" title="راجع">راجع</button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
                    <button type="button" class="btn btn-secondary" id="editModalClose">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => {
        modal.remove();
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.getElementById('editModalClose').addEventListener('click', closeModal);

    const updateEditTotals = () => {
        const amt = parseFloat(document.getElementById('editAmount')?.value || 0) || 0;
        const fee = parseFloat(document.getElementById('editDeliveryFee')?.value || 0) || 0;
        const free = document.getElementById('editFreeDelivery')?.checked || false;
        const total = free ? amt : (amt + fee);
        const due = free ? (amt - fee) : amt;
        const totalEl = document.getElementById('editTotalDisplay');
        const dueEl = document.getElementById('editDueDisplay');
        if (totalEl) totalEl.textContent = formatIQD(total) + ' د.ع';
        if (dueEl) dueEl.textContent = formatIQD(due) + ' د.ع';
    };
    updateEditTotals();
    document.getElementById('editAmount')?.addEventListener('input', updateEditTotals);
    document.getElementById('editAmount')?.addEventListener('change', updateEditTotals);
    document.getElementById('editDeliveryFee')?.addEventListener('input', updateEditTotals);
    document.getElementById('editDeliveryFee')?.addEventListener('change', updateEditTotals);
    document.getElementById('editFreeDelivery')?.addEventListener('change', updateEditTotals);
    document.getElementById('editRegionId')?.addEventListener('change', () => {
        const sel = document.getElementById('editRegionId');
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.value) {
            document.getElementById('editDeliveryFee').value = parseFloat(opt.dataset.fee || 0);
            updateEditTotals();
        }
    });

    // أزرار الحالة: تستخدم updateStatus مباشرة (المدير فقط)
    const editStatusButtons = document.getElementById('editStatusButtons');
    if (editStatusButtons) document.querySelectorAll('#editStatusButtons .btn-status').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === (order.Status || ''));
        btn.addEventListener('click', async () => {
            const status = btn.dataset.status;
            try {
                await window.api.orders.updateStatus(order.OrderID, status);
                btn.closest('.status-buttons').querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                order.Status = status;
                await showMsg('تم تغيير الحالة إلى: ' + (STATUS_MAP[status] || status));
            } catch (err) {
                await showMsg('خطأ: ' + (err.message || err));
            }
        });
    });

    document.getElementById('editOrderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const regionEl = document.getElementById('editRegionId');
        const data = {
            AdminOrderNo: document.getElementById('editAdminOrderNo').value,
            StoreName: document.getElementById('editStoreName').value,
            StorePhone: document.getElementById('editStorePhone').value,
            CustomerName: document.getElementById('editCustomerName').value,
            CustomerPhone: document.getElementById('editCustomerPhone').value,
            RegionID: regionEl?.value ? parseInt(regionEl.value) : null,
            Address: document.getElementById('editAddress').value,
            CustomerLocationLink: (document.getElementById('editCustomerLocationLink')?.value || '').trim() || null,
            Pieces: parseInt(document.getElementById('editPieces').value) || 1,
            AmountIQD: parseFloat(document.getElementById('editAmount').value) || 0,
            DeliveryFeeIQD: parseFloat(document.getElementById('editDeliveryFee').value) || 0,
            FreeDelivery: document.getElementById('editFreeDelivery').checked,
            Notes: document.getElementById('editNotes').value
        };
        // لا نرسل تاريخ الطلب إلا إذا كان المستخدم مديراً (حتى لو كان الحقل معطلاً/ظاهر).
        if (isAdmin) {
            const dateVal = document.getElementById('editOrderDate')?.value;
            if (dateVal && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
                data.CreatedDate = dateVal + ' 00:00:00';
            }
        }
        try {
            await window.api.orders.update(order.OrderID, data);
            closeModal();
            await onSuccess();
        } catch (err) {
            await showMsg('خطأ: ' + (err.message || err));
        }
    });
}

async function renderOrdersScreen(container, opts = {}) {
    const title = opts.title || 'الطلبات';
    let filters = { search: '', driverId: '', status: opts.initialFilters?.status || '', dateFrom: opts.initialFilters?.dateFrom || '', dateTo: opts.initialFilters?.dateTo || '' };
    let statusClickAttached = false;

    const renderOrders = async () => {
        const [list, drivers] = await Promise.all([
            window.api.orders.getAll({ ...filters, limit: ORDERS_LIST_LIMIT }),
            getDriversCached()
        ]);
        const statNew = list.filter(o => o.Status === 'New').length;
        const statAssigned = list.filter(o => o.Status === 'AssignedToDriver').length;
        const statDelivered = list.filter(o => o.Status === 'Delivered').length;
        const statReturned = list.filter(o => isOrderReturned(o)).length;

        container.innerHTML = `
            <div class="screen active orders-screen orders-screen--v4">
                <div class="orders-layout">
                    <header class="orders-header">
                        <div class="orders-hero">
                            <div class="orders-hero-icon" aria-hidden="true"><i class="bi bi-box-seam"></i></div>
                            <div class="orders-hero-text">
                                <div class="orders-hero-title-row">
                                    <h1 class="orders-title">${title}</h1>
                                    <span class="orders-count-pill" id="ordersCount">${list.length} طلب</span>
                                </div>
                                <p class="orders-subtitle">بحث، فلترة، وتعديل الطلبات — تصدير PDF للنتائج المعروضة</p>
                            </div>
                        </div>
                        ${renderUxPipeline([
                            { count: statNew, label: 'جديد', status: 'New', mod: 'ux-pipeline__step--new' },
                            { count: statAssigned, label: 'مع السائق', status: 'AssignedToDriver', mod: 'ux-pipeline__step--driver' },
                            { count: statDelivered, label: 'تم التوصيل', status: 'Delivered', mod: 'ux-pipeline__step--done' }
                        ])}
                        <div class="orders-stats-scroll" role="status" aria-label="ملخص الحالات في النتائج">
                            <div class="orders-stats-bar">
                                <div class="orders-stat orders-stat--all"><span class="orders-stat-value">${list.length}</span><span class="orders-stat-label">في النتائج</span></div>
                                <div class="orders-stat orders-stat--new"><span class="orders-stat-value">${statNew}</span><span class="orders-stat-label">جديد</span></div>
                                <div class="orders-stat orders-stat--assigned"><span class="orders-stat-value">${statAssigned}</span><span class="orders-stat-label">مع السائق</span></div>
                                <div class="orders-stat orders-stat--done"><span class="orders-stat-value">${statDelivered}</span><span class="orders-stat-label">تم التوصيل</span></div>
                                <div class="orders-stat orders-stat--return"><span class="orders-stat-value">${statReturned}</span><span class="orders-stat-label">راجع</span></div>
                            </div>
                        </div>
                    </header>
                    <div class="orders-toolbar">
                        <section class="orders-panel orders-panel--search" aria-labelledby="orders-search-heading">
                            <h2 class="orders-panel-heading" id="orders-search-heading"><i class="bi bi-search" aria-hidden="true"></i> بحث سريع</h2>
                            <div class="orders-search-wrap">
                                <span class="orders-search-icon" aria-hidden="true"><i class="bi bi-search"></i></span>
                                <input type="text" id="search" placeholder="رقم الطلب، رقم الشحنة، الهاتف، المتجر، المستلم…" class="orders-search-input" autocomplete="off" aria-label="بحث في الطلبات">
                            </div>
                        </section>
                        <section class="orders-panel orders-panel--filters" aria-label="فلترة الطلبات">
                            <div class="orders-toolbar-grid">
                                <div class="orders-field">
                                    <label class="orders-field-label" for="filterDriver">السائق</label>
                                    <select id="filterDriver" class="orders-filter-select" title="تصفية حسب السائق">
                                        <option value="">كل السائقين</option>
                                        ${drivers.map(d => `<option value="${d.DriverID}">${d.DriverName}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="orders-field orders-field--dates">
                                    <span class="orders-field-label">نطاق التاريخ</span>
                                    <div class="orders-date-row">
                                        <input type="date" id="dateFrom" class="orders-date-input" title="من تاريخ" aria-label="من تاريخ">
                                        <span class="orders-date-sep">—</span>
                                        <input type="date" id="dateTo" class="orders-date-input" title="إلى تاريخ" aria-label="إلى تاريخ">
                                    </div>
                                </div>
                                <div class="orders-field orders-field--actions">
                                    <span class="orders-field-label orders-field-label--ghost">تطبيق</span>
                                    <div class="orders-toolbar-btns">
                                        <button type="button" class="btn btn-primary orders-btn-apply" id="btnSearch">تطبيق الفلاتر</button>
                                        <button type="button" class="btn btn-outline orders-btn-clear" id="btnClearFilters" title="مسح البحث والفلاتر">مسح الكل</button>
                                    </div>
                                </div>
                            </div>
                            <div class="orders-chips-block">
                                <span class="orders-chips-label">حالة الطلب</span>
                                <div class="orders-status-chips" role="tablist" aria-label="تصفية حسب الحالة">
                                    <button type="button" class="orders-chip ${!filters.status ? 'active' : ''}" data-status="" role="tab" aria-selected="${!filters.status}">الكل</button>
                                    <button type="button" class="orders-chip ${filters.status === 'New' ? 'active' : ''}" data-status="New" role="tab" aria-selected="${filters.status === 'New'}">جديد</button>
                                    <button type="button" class="orders-chip ${filters.status === 'AssignedToDriver' ? 'active' : ''}" data-status="AssignedToDriver" role="tab" aria-selected="${filters.status === 'AssignedToDriver'}">مع السائق</button>
                                    <button type="button" class="orders-chip ${filters.status === 'Delivered' ? 'active' : ''}" data-status="Delivered" role="tab" aria-selected="${filters.status === 'Delivered'}">تم التوصيل</button>
                                    <button type="button" class="orders-chip ${filters.status === 'Returned' ? 'active' : ''}" data-status="Returned" role="tab" aria-selected="${filters.status === 'Returned'}">راجع</button>
                                </div>
                            </div>
                        </section>
                    </div>
                    <div class="orders-table-card">
                        <div class="orders-table-headbar">
                            <span class="orders-table-headbar-title">قائمة الطلبات</span>
                            <div class="orders-table-headbar-actions">
                                <button type="button" class="btn btn-secondary btn-sm orders-btn-export-pdf" id="btnExportOrdersPDF" ${list.length === 0 ? 'disabled' : ''} title="تصدير الطلبات المعروضة حسب الفلتر">
                                    <i class="bi bi-file-earmark-pdf" aria-hidden="true"></i> تصدير PDF
                                </button>
                                <span class="orders-table-headbar-meta">${list.length} سجل</span>
                            </div>
                        </div>
                        ${list.length > 0 ? (ORDERS_MOBILE_MQ.matches
                            ? `<div class="orders-mobile-list" id="ordersMobileList">${list.map(o => renderOrderCardHtml(o)).join('')}</div>`
                            : `<div class="orders-table-wrap">
                            <table class="orders-table">
                                <thead>
                                    <tr>
                                        <th class="orders-th-order">الطلب</th>
                                        <th class="orders-th-party">المستلم والمتجر</th>
                                        <th class="col-address orders-th-address">العنوان</th>
                                        <th class="orders-th-link">موقع</th>
                                        <th class="orders-th-money">المبالغ (د.ع)</th>
                                        <th class="orders-th-ops">التشغيل</th>
                                        <th class="orders-th-actions">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody id="ordersTableBody">
                                    ${list.map(o => {
                                        const notesRaw = (o.Notes || '').trim();
                                        const notesTitle = notesRaw ? escapeHtml(notesRaw) : '';
                                        const loc = (o.CustomerLocationLink || '').replace(/"/g, '&quot;');
                                        return `
                                        <tr data-order-id="${o.OrderID}" class="${isOrderReturned(o) ? 'order-returned' : ''}">
                                            <td class="orders-cell-order">
                                                <div class="orders-shipment-row">
                                                    <span class="orders-shipment-num">${escapeHtml(o.ShipmentNumber)}</span>
                                                    ${notesRaw ? `<span class="orders-note-dot" title="${notesTitle}" aria-label="توجد ملاحظات">📝</span>` : ''}
                                                </div>
                                                <div class="orders-order-meta">
                                                    <span>#${o.OrderID}</span><span class="orders-meta-sep">·</span>
                                                    <span>${escapeHtml(o.AdminOrderNo || '—')}</span><span class="orders-meta-sep">·</span>
                                                    <span>${o.Pieces || 1} قطعة</span>
                                                </div>
                                                <span class="badge badge-${(o.Status || 'new').toLowerCase().replace('assignedtodriver','assigned').replace('delivered','delivered').replace('returned','returned')}">${STATUS_MAP[o.Status] || escapeHtml(o.Status || '') || '—'}</span>
                                                ${isOrderReturned(o) && (o.ReturnReason || '').trim() ? `<div class="orders-return-reason" title="سبب الإرجاع (السائق)"><span class="orders-return-reason-label">سبب الرجوع:</span> ${escapeHtml((o.ReturnReason || '').trim())}</div>` : ''}
                                            </td>
                                            <td class="orders-cell-party">
                                                <div class="orders-party-name">${escapeHtml(o.CustomerName || '—')}</div>
                                                <div class="orders-party-phone">${escapeHtml(o.CustomerPhone || '—')}</div>
                                                <div class="orders-party-store"><i class="bi bi-shop" aria-hidden="true"></i> ${escapeHtml(o.StoreName || '—')}</div>
                                            </td>
                                            <td class="col-address orders-cell-address" title="${escapeHtml(getFullAddress(o))}">
                                                <span class="orders-address-text">${escapeHtml(getFullAddress(o))}</span>
                                            </td>
                                            <td class="orders-cell-link">
                                                ${o.CustomerLocationLink ? `<a href="${loc}" target="_blank" rel="noopener noreferrer" class="orders-loc-pill" title="فتح رابط الموقع"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i><span>فتح</span></a>` : '<span class="orders-loc-empty">—</span>'}
                                            </td>
                                            <td class="orders-cell-money">
                                                <ul class="orders-money-list">
                                                    <li><span>فاتورة</span><strong class="iqd">${formatIQD(o.AmountIQD)}</strong></li>
                                                    <li><span>توصيل</span><strong class="iqd">${o.FreeDelivery ? 'مجاني' : formatIQD(o.DeliveryFeeIQD)}</strong></li>
                                                    <li><span>نهائي</span><strong class="iqd iqd-total">${formatIQD(o.TotalIQD)}</strong></li>
                                                    <li><span>مستحق</span><strong class="iqd">${formatIQD(getAmountDue(o))}</strong></li>
                                                </ul>
                                            </td>
                                            <td class="orders-cell-ops">
                                                <div class="orders-ops-line"><span class="orders-ops-k">سائق</span><span class="orders-ops-v">${escapeHtml(o.DriverName || '—')}</span></div>
                                                <div class="orders-ops-line"><span class="orders-ops-k">أنشأه</span><span class="orders-ops-v">${escapeHtml((o.CreatedByName || '—').toString())}</span></div>
                                                <div class="orders-ops-line"><span class="orders-ops-k">تاريخ</span><span class="orders-ops-v orders-ops-date">${escapeHtml((o.CreatedDate || '').slice(0, 16))}</span></div>
                                                <div class="orders-ops-line"><span class="orders-ops-k">ملصق</span><span class="orders-ops-v"><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'} orders-badge-tiny">${o.LabelPrinted ? 'مطبوع' : 'لم يُطبع'}</span></span></div>
                                            </td>
                                            <td class="orders-cell-actions">
                                                ${renderOrderActionsHtml(o)}
                                            </td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>`) : '<div class="orders-empty"><span class="orders-empty-icon">📋</span><p class="orders-empty-title">لا توجد طلبات</p><p class="orders-empty-hint">جرّب تغيير البحث، التاريخ، أو حالة الطلب</p></div>'}
                        ${list.length >= ORDERS_LIST_LIMIT ? `<p class="orders-limit-hint">يُعرض أحدث ${ORDERS_LIST_LIMIT} طلب — استخدم الفلاتر لتضييق النتائج</p>` : ''}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('search').value = filters.search;
        document.getElementById('filterDriver').value = filters.driverId;
        document.getElementById('dateFrom').value = filters.dateFrom;
        document.getElementById('dateTo').value = filters.dateTo;

        container.querySelectorAll('.orders-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                filters.status = chip.dataset.status || '';
                renderOrders();
            });
        });

        container.querySelectorAll('.ux-pipeline__step[data-status]').forEach(step => {
            step.addEventListener('click', () => {
                filters.status = step.dataset.status || '';
                renderOrders();
            });
        });

        const apply = () => {
            filters.search = document.getElementById('search').value;
            filters.driverId = document.getElementById('filterDriver').value;
            filters.dateFrom = document.getElementById('dateFrom').value;
            filters.dateTo = document.getElementById('dateTo').value;
            renderOrders();
        };

        document.getElementById('btnSearch').addEventListener('click', apply);
        document.getElementById('search').addEventListener('keypress', e => { if (e.key === 'Enter') apply(); });
        document.getElementById('search').addEventListener('input', debounce(apply, 350));
        document.getElementById('btnClearFilters')?.addEventListener('click', () => {
            filters.search = '';
            filters.driverId = '';
            filters.status = '';
            filters.dateFrom = '';
            filters.dateTo = '';
            renderOrders();
        });

        document.getElementById('btnExportOrdersPDF')?.addEventListener('click', async () => {
            const btn = document.getElementById('btnExportOrdersPDF');
            if (!btn || btn.disabled) return;
            const driverSelect = document.getElementById('filterDriver');
            const driverName = driverSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
            const exportFilters = {
                search: filters.search,
                driverId: filters.driverId,
                driverName: filters.driverId ? driverName : '',
                status: filters.status,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo
            };
            const prevHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn-loading">جاري التصدير...</span>';
            try {
                await window.api.orders.exportPDF(exportFilters);
            } catch (err) {
                await showMsg('فشل التصدير: ' + (err?.message || err));
            } finally {
                btn.disabled = list.length === 0;
                btn.innerHTML = prevHtml;
            }
        });

        if (!statusClickAttached) {
            statusClickAttached = true;
            container.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-status-sm');
                if (!btn) return;
                const id = parseInt(btn.dataset.orderId || btn.closest('[data-order-id]')?.dataset?.orderId, 10);
                const status = (btn.dataset.status || '').trim();
                if (!id || isNaN(id)) {
                    await showMsg('خطأ: رقم الطلب غير صالح');
                    return;
                }
                if (status === 'Returned' && !(await window.api.showConfirm('هل أنت متأكد من جعل هذا الطلب راجع؟'))) return;
                try {
                    await window.api.orders.updateStatus(id, status);
                    invalidateDashboardCache();
                    invalidateScreenCache('orders');
                    await renderOrders();
                } catch (err) {
                    await showMsg('خطأ: ' + (err.message || String(err)));
                }
            });
        }

        container.querySelectorAll('.btn-print-order').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.orderId);
                try {
                    const order = await window.api.orders.getById(id);
                    if (!order) { await showMsg('الطلب غير موجود'); return; }
                    const path = await window.api.orders.print(order);
                    const w = window.open(path, 'printLabel', 'width=800,height=700,scrollbars=yes,resizable=yes');
                    if (w) { w.onload = () => { try { w.focus(); w.print(); } catch (e) {} }; }
                    await window.api.orders.markLabelPrinted(order.OrderID).catch(() => {});
                    await renderOrders();
                } catch (err) {
                    await showMsg('خطأ في الطباعة: ' + (err.message || err));
                }
            });
        });

        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.orderId);
                const order = await window.api.orders.getById(id);
                if (!order) { await showMsg('الطلب غير موجود'); return; }
                showEditOrderModal(container, order, renderOrders);
            });
        });

        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!(await window.api.showConfirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن الحذف.'))) return;
                const id = parseInt(btn.dataset.orderId);
                const result = await window.api.orders.delete(id);
                if (result.success) {
                    await renderOrders();
                } else {
                    await showMsg(result.error || 'فشل الحذف');
                }
            });
        });
    };

    await renderOrders();
}

// ─── نوافذة إنشاء حساب أو تغيير كلمة السر (بدون توليد تلقائي) ───
function openDriverAccountModal(driver, options) {
    const { mode = 'create', onSuccess } = options || {}; // mode: 'create' | 'change'
    const isChange = mode === 'change';
    const title = isChange ? 'تغيير كلمة السر' : 'إنشاء حساب للسائق';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card drivers-modal" style="max-width:420px">
            <h3>${title}</h3>
            <p class="modal-subtitle">${(driver.DriverName || 'السائق').replace(/</g, '&lt;')}</p>
            <form class="driver-account-form" data-mode="${mode}">
                <div class="form-group">
                    <label>اسم المستخدم</label>
                    <input type="text" name="username" value="${(driver.Username || '').replace(/"/g, '&quot;')}" 
                        placeholder="مثال: driver1" ${isChange ? 'readonly' : 'required'} autocomplete="username">
                </div>
                <div class="form-group">
                    <label>كلمة السر ${isChange ? 'الجديدة' : ''}</label>
                    <input type="password" name="password" placeholder="أدخل كلمة السر ${isChange ? 'الجديدة' : ''}" 
                        required autocomplete="new-password">
                </div>
                <div class="modal-actions">
                    <button type="submit" class="btn btn-primary">${isChange ? 'حفظ كلمة السر الجديدة' : 'إنشاء الحساب'}</button>
                    <button type="button" class="btn btn-secondary" data-action="close">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) close(); };
    modal.querySelector('[data-action="close"]').onclick = close;

    modal.querySelector('.driver-account-form').onsubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const username = (form.username?.value || '').trim();
        const password = (form.password?.value || '').trim();
        if (!isChange && !username) { await showMsg('أدخل اسم المستخدم'); return; }
        if (!password) { await showMsg('أدخل كلمة السر'); return; }
        try {
            let res;
            if (isChange) {
                res = await window.api.drivers.regeneratePassword(driver.DriverID, password);
            } else {
                res = await window.api.drivers.createAccount(driver.DriverID, username, password);
            }
            close();
            await showMsg(`تم بنجاح.\n\nاسم المستخدم: ${res.username}\nكلمة السر: ${res.password}`, 'بيانات الدخول');
            if (onSuccess) onSuccess();
        } catch (err) {
            await showMsg('خطأ: ' + (err?.message || err));
        }
    };
}

// ─── نافذة عرض تفاصيل الحساب (جلب من API) ───
async function openViewCredentialsModal(driverId, driverName, onClose) {
    const name = (driverName || 'السائق').replace(/</g, '&lt;');
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card drivers-modal" style="max-width:440px">
            <h3>تفاصيل الحساب - ${name}</h3>
            <div class="credentials-loading">جاري التحميل...</div>
            <div class="credentials-content" style="display:none">
                <div class="credentials-box">
                    <div class="cred-row">
                        <span class="cred-label">اسم المستخدم:</span>
                        <span class="cred-value" data-cred="username"></span>
                        <button type="button" class="btn-copy" data-copy="username" title="نسخ">📋</button>
                    </div>
                    <div class="cred-row">
                        <span class="cred-label">كلمة السر:</span>
                        <span class="cred-value" data-cred="password"></span>
                        <button type="button" class="btn-copy" data-copy="password" title="نسخ">📋</button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" data-action="change">تغيير كلمة السر</button>
                </div>
            </div>
            <div class="modal-actions" style="margin-top:16px">
                <button type="button" class="btn btn-secondary" data-action="close">إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => { modal.remove(); onClose?.(); };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    modal.querySelector('[data-action="close"]').onclick = close;

    try {
        const cred = await window.api.drivers.getCredentials(driverId);
        const un = String(cred?.username || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const pw = String(cred?.password || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        modal.querySelector('.credentials-loading').style.display = 'none';
        const content = modal.querySelector('.credentials-content');
        content.style.display = 'block';
        content.querySelector('[data-cred="username"]').textContent = un;
        content.querySelector('[data-cred="password"]').textContent = pw;
        content.querySelector('[data-copy="username"]').onclick = () => {
            navigator.clipboard?.writeText(cred.username);
            showMsg('تم نسخ اسم المستخدم');
        };
        content.querySelector('[data-copy="password"]').onclick = () => {
            navigator.clipboard?.writeText(cred.password);
            showMsg('تم نسخ كلمة السر');
        };
        content.querySelector('[data-action="change"]').onclick = () => {
            close();
            openDriverAccountModal({ DriverID: driverId, DriverName: driverName, Username: cred.username }, {
                mode: 'change',
                onSuccess: onClose
            });
        };
    } catch (err) {
        modal.querySelector('.credentials-loading').innerHTML = 'خطأ: ' + (err?.message || err);
    }
}

function setNavActive(screenId, subTab) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('expanded'));
    if (subTab) {
        const parent = document.querySelector(`.nav-parent[data-screen="${screenId}"]`);
        const child = document.querySelector(`.nav-child[data-screen="${screenId}"][data-tab="${subTab}"]`);
        if (parent) {
            parent.closest('.nav-group')?.classList.add('expanded');
            /* لا نضيف active للقسم الرئيسي - يبقى التمييز للفرعي فقط */
        }
        if (child) child.classList.add('active');
    } else {
        const item = document.querySelector(`.nav-item[data-screen="${screenId}"]:not(.nav-child)`);
        if (item) {
            item.classList.add('active');
            item.closest('.nav-group')?.classList.add('expanded');
        }
    }
}

function initSidebarNav() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    /* إزالة المستمع السابق إن وُجد لتجنّب تكرار المعالجة عند إعادة الاستدعاء */
    const oldHandler = nav._navClickHandler;
    if (oldHandler) nav.removeEventListener('click', oldHandler);

    const handleNavClick = (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;
        e.preventDefault();
        const screen = item.dataset.screen;
        if (!screen || !screens[screen]) return;

        if (item.classList.contains('nav-parent')) {
            const group = item.closest('.nav-group');
            const wasExpanded = group?.classList.contains('expanded');
            group?.classList.toggle('expanded');
            /* عند التوسيع أو عند الضغط على قسم موسّع: عرض الفرعي الأول */
            if (group?.classList.contains('expanded')) {
                const firstChild = group.querySelector('.nav-child');
                const tab = firstChild?.dataset.tab;
                setNavActive(screen, tab);
                showScreen(screen, tab || undefined);
            }
        } else {
            setNavActive(screen, item.dataset.tab);
            showScreen(screen, item.dataset.tab);
        }
    };

    nav._navClickHandler = handleNavClick;
    nav.addEventListener('click', handleNavClick);
}

function showScreen(screenId, subTab, options = {}) {
    const key = screenCacheKey(screenId, subTab);
    setNavActive(screenId, subTab);
    updateMobileChrome(screenId, subTab);
    updateDesktopChrome(screenId, subTab);
    const container = document.getElementById('screen-container');
    if (!container) return;
    container.dataset.currentScreen = screenId || '';
    container.dataset.initialTab = subTab || '';

    container.querySelectorAll('.screen-mount').forEach(m => {
        m.classList.remove('active');
        m.hidden = true;
    });

    const cached = screenMounts.get(key);
    if (cached && !cached.stale && !options.force) {
        cached.mount.hidden = false;
        cached.mount.classList.add('active');
        return;
    }

    if (cached) {
        cached.mount.remove();
        screenMounts.delete(key);
    }

    const mount = document.createElement('div');
    mount.className = 'screen-mount active';
    mount.dataset.screenKey = key;
    container.appendChild(mount);
    screenMounts.set(key, { mount, stale: false });

    if (options.force) mount.dataset.forceRefresh = '1';
    if (options.ordersStatus) mount.dataset.ordersInitialStatus = options.ordersStatus;

    const screen = screens[screenId];
    if (screen) {
        Promise.resolve(screen.render(mount)).catch(err => {
            mount.innerHTML = `<div class="screen active screen-error"><p>خطأ في تحميل الصفحة: ${escapeHtml(err?.message || String(err))}</p></div>`;
        });
    }
}

function bindDashboardQuickNav(container) {
    container.querySelectorAll('.dash-quick-btn[data-screen]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = btn.dataset.screen;
            const tab = btn.dataset.tab;
            if (tab) {
                setNavActive(screen, tab);
                showScreen(screen, tab);
            } else {
                setNavActive(screen);
                showScreen(screen);
            }
        });
    });
    container.querySelectorAll('.dash-stat-link[data-screen]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const screen = btn.dataset.screen;
            const status = btn.dataset.status || '';
            invalidateScreenCache('orders');
            setNavActive(screen);
            showScreen(screen, undefined, { force: true, ordersStatus: status });
        });
    });
    container.querySelectorAll('.dash-fab[data-screen]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setNavActive(btn.dataset.screen);
            showScreen(btn.dataset.screen);
        });
    });
}

function bindOverrideNotifications(container) {
    if (currentUser?.Role !== 'admin') return;
    container.querySelectorAll('.btn-override-seen').forEach(btn => {
        btn.onclick = async () => {
            const id = parseInt(btn.dataset.id);
            if (!id) return;
            try {
                await window.api.notifications.markAsReviewed(id);
                btn.closest('.ovn-card')?.remove();
                invalidateDashboardCache();
                const countEl = container.querySelector('.ovn-panel-count');
                const list = container.querySelector('#overrideNotifList');
                const remaining = list?.querySelectorAll('.ovn-card').length || 0;
                if (countEl) countEl.textContent = remaining;
                if (remaining === 0 && list) {
                    list.innerHTML = '<p class="ovn-empty">لا توجد إشعارات جديدة</p>';
                }
            } catch (e) {
                await showMsg('خطأ: ' + (e?.message || e));
            }
        };
    });
}

function renderDashboardMarkup(userName, today, stats, notifList) {
    const todayOrdersCount = stats.todayCount;
    const totalOrdersCount = stats.totalOrders;
    const newCount = stats.newCount;
    const assignedCount = stats.assignedCount;
    const todayKarkh = stats.todayKarkh;
    const todayRusafa = stats.todayRusafa;
    const deliveredCount = stats.deliveredCount;
    const notifCount = notifList.length;
    const notifHtml = notifList.length > 0
        ? notifList.map(renderOverrideNotification).join('')
        : '<p class="ovn-empty">لا توجد إشعارات جديدة</p>';
    const areaTotal = Math.max(todayKarkh + todayRusafa, 1);
    const karkhPct = Math.round((todayKarkh / areaTotal) * 100);
    const rusafaPct = 100 - karkhPct;
    const completionPct = todayOrdersCount > 0 ? Math.round((deliveredCount / todayOrdersCount) * 100) : 0;
    const pipelineHtml = renderUxPipeline([
        { count: newCount, label: 'جديد', status: 'New', mod: 'ux-pipeline__step--new' },
        { count: assignedCount, label: 'مع السائق', status: 'AssignedToDriver', mod: 'ux-pipeline__step--driver' },
        { count: deliveredCount, label: 'تم التوصيل', status: 'Delivered', mod: 'ux-pipeline__step--done' }
    ]);

    return `
        <div class="screen active dashboard-screen dash-v3 dash-v4">
            <header class="dash-v3-hero dash-v4-hero">
                <div class="dash-v3-hero__content">
                    <span class="dash-v3-hero__chip"><i class="bi bi-stars" aria-hidden="true"></i> لوحة التحكم</span>
                    <h1 class="dash-v3-hero__title">مرحباً، ${userName}</h1>
                    <p class="dash-v3-hero__meta"><i class="bi bi-calendar3" aria-hidden="true"></i> ${formatDateAr(today)}</p>
                </div>
                <div class="dash-v3-hero__cards">
                    <div class="dash-v3-metric dash-v3-metric--primary">
                        <span class="dash-v3-metric__value">${todayOrdersCount}</span>
                        <span class="dash-v3-metric__label">طلبات اليوم</span>
                    </div>
                    <div class="dash-v3-metric">
                        <span class="dash-v3-metric__value">${completionPct}<small>%</small></span>
                        <span class="dash-v3-metric__label">نسبة الإنجاز</span>
                    </div>
                    <div class="dash-v3-metric dash-v3-metric--ghost">
                        <span class="dash-v3-metric__value">${todayKarkh}<span class="dash-v3-metric__sep">/</span>${todayRusafa}</span>
                        <span class="dash-v3-metric__label">كرخ / رصافة</span>
                    </div>
                </div>
            </header>

            ${pipelineHtml}

            <div class="dash-v4-insights">
                <div class="dash-v4-insight dash-v4-insight--pink">
                    <i class="bi bi-inbox" aria-hidden="true"></i>
                    <div><strong>${newCount}</strong><span>بانتظار التعيين</span></div>
                </div>
                <div class="dash-v4-insight dash-v4-insight--blue">
                    <i class="bi bi-truck" aria-hidden="true"></i>
                    <div><strong>${assignedCount}</strong><span>قيد التوصيل</span></div>
                </div>
                <div class="dash-v4-insight dash-v4-insight--green">
                    <i class="bi bi-check2-all" aria-hidden="true"></i>
                    <div><strong>${deliveredCount}</strong><span>مكتمل اليوم</span></div>
                </div>
                ${currentUser?.Role === 'admin' && notifCount > 0 ? `
                <div class="dash-v4-insight dash-v4-insight--amber">
                    <i class="bi bi-bell-fill" aria-hidden="true"></i>
                    <div><strong>${notifCount}</strong><span>إشعار توصيل مجاني</span></div>
                </div>` : ''}
            </div>

            <div class="dash-v3-bento dash-v4-bento">
                <section class="dash-v3-tile dash-v3-tile--stats" aria-label="حالة الطلبات">
                    <div class="dash-v3-tile__head">
                        <h2><i class="bi bi-bar-chart-steps" aria-hidden="true"></i> حالة الطلبات</h2>
                        <span>اضغط للفلترة</span>
                    </div>
                    <div class="dash-v3-statgrid">
                        <button type="button" class="dash-v3-stat dash-v3-stat--new dash-stat-link" data-screen="orders" data-status="New">
                            <i class="bi bi-plus-lg" aria-hidden="true"></i>
                            <strong>${newCount}</strong>
                            <span>جديد</span>
                        </button>
                        <button type="button" class="dash-v3-stat dash-v3-stat--driver dash-stat-link" data-screen="orders" data-status="AssignedToDriver">
                            <i class="bi bi-truck" aria-hidden="true"></i>
                            <strong>${assignedCount}</strong>
                            <span>مع السائق</span>
                        </button>
                        <button type="button" class="dash-v3-stat dash-v3-stat--done dash-stat-link" data-screen="orders" data-status="Delivered">
                            <i class="bi bi-check2-circle" aria-hidden="true"></i>
                            <strong>${deliveredCount}</strong>
                            <span>تم التوصيل</span>
                        </button>
                        <button type="button" class="dash-v3-stat dash-v3-stat--all dash-stat-link" data-screen="orders" data-status="">
                            <i class="bi bi-layers" aria-hidden="true"></i>
                            <strong>${totalOrdersCount}</strong>
                            <span>الكل</span>
                        </button>
                    </div>
                </section>

                <section class="dash-v3-tile dash-v3-tile--areas">
                    <div class="dash-v3-tile__head">
                        <h2><i class="bi bi-geo-alt" aria-hidden="true"></i> توزيع المناطق</h2>
                        <span class="dash-v3-pill">${todayOrdersCount} طلب</span>
                    </div>
                    <div class="dash-v3-area">
                        <div class="dash-v3-area__row">
                            <div class="dash-v3-area__info"><span>الكرخ</span><strong>${todayKarkh}</strong></div>
                            <div class="dash-v3-area__track"><div class="dash-v3-area__fill dash-v3-area__fill--karkh" style="width:${karkhPct}%"></div></div>
                            <em>${karkhPct}%</em>
                        </div>
                        <div class="dash-v3-area__row">
                            <div class="dash-v3-area__info"><span>الرصافة</span><strong>${todayRusafa}</strong></div>
                            <div class="dash-v3-area__track"><div class="dash-v3-area__fill dash-v3-area__fill--rusafa" style="width:${rusafaPct}%"></div></div>
                            <em>${rusafaPct}%</em>
                        </div>
                    </div>
                </section>

                <section class="dash-v3-tile dash-v3-tile--actions">
                    <div class="dash-v3-tile__head">
                        <h2><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> اختصارات</h2>
                    </div>
                    <nav class="dash-v3-actions" aria-label="اختصارات سريعة">
                        <button type="button" class="dash-v3-action dash-v3-action--pink dash-quick-btn" data-screen="new-order">
                            <i class="bi bi-plus-circle" aria-hidden="true"></i><span>طلب جديد</span>
                        </button>
                        <button type="button" class="dash-v3-action dash-quick-btn" data-screen="orders">
                            <i class="bi bi-box-seam" aria-hidden="true"></i><span>الطلبات</span>
                        </button>
                        <button type="button" class="dash-v3-action dash-quick-btn" data-screen="driver-receive">
                            <i class="bi bi-box-arrow-in-down" aria-hidden="true"></i><span>استلام</span>
                        </button>
                        <button type="button" class="dash-v3-action dash-quick-btn nav-admin" data-screen="reports" data-tab="driver">
                            <i class="bi bi-graph-up" aria-hidden="true"></i><span>التقارير</span>
                        </button>
                        <button type="button" class="dash-v3-action dash-quick-btn nav-admin" data-screen="users">
                            <i class="bi bi-people" aria-hidden="true"></i><span>المستخدمين</span>
                        </button>
                        <button type="button" class="dash-v3-action dash-quick-btn nav-admin" data-screen="settings" data-tab="regions">
                            <i class="bi bi-gear" aria-hidden="true"></i><span>الإعدادات</span>
                        </button>
                    </nav>
                </section>

                ${currentUser?.Role === 'admin' ? `
                <section class="ovn-panel dash-v3-tile dash-v3-tile--notif">
                    <header class="ovn-panel-head">
                        <div class="ovn-panel-icon" aria-hidden="true"><i class="bi bi-bell-fill"></i></div>
                        <div class="ovn-panel-intro">
                            <h3 class="ovn-panel-title">
                                إشعارات التوصيل المجاني
                                ${notifCount > 0 ? `<span class="ovn-panel-count">${notifCount}</span>` : ''}
                            </h3>
                            <p class="ovn-panel-desc">اسم الموظف · رقم الفاتورة · العنوان · السعر · الملاحظات</p>
                        </div>
                    </header>
                    <div id="overrideNotifList" class="ovn-list">${notifHtml}</div>
                </section>
                ` : ''}
            </div>

            <button type="button" class="dash-fab dash-quick-btn" data-screen="new-order" title="إدخال طلب جديد" aria-label="إدخال طلب جديد">
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
            </button>
        </div>
    `;
}

function renderDashboardSkeleton(userName) {
    return `
        <div class="screen active dashboard-screen dash-v3 dashboard-screen--loading">
            <header class="dash-v3-hero dash-v3-hero--loading">
                <div class="dash-v3-hero__content">
                    <div class="dash-skeleton dash-skeleton--badge"></div>
                    <div class="dash-skeleton dash-skeleton--title"></div>
                    <div class="dash-skeleton dash-skeleton--text"></div>
                </div>
                <div class="dash-v3-hero__cards">
                    <div class="dash-skeleton dash-skeleton--block"></div>
                    <div class="dash-skeleton dash-skeleton--block"></div>
                </div>
            </header>
            <div class="dash-v3-bento dash-v3-bento--loading">
                ${[1, 2, 3].map(() => '<div class="dash-v3-tile dash-v3-tile--skeleton"><div class="dash-skeleton dash-skeleton--block"></div></div>').join('')}
            </div>
            <p class="dash-loading-hint"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> جاري تحميل لوحة التحكم…</p>
        </div>
    `;
}

const screens = {
    dashboard: {
        async render(container) {
            const userName = (currentUser?.DisplayName || currentUser?.Username || 'مدير').replace(/</g, '&lt;');
            const forceRefresh = container.closest('.screen-mount')?.dataset?.forceRefresh === '1'
                || container.dataset.forceRefresh === '1';
            container.innerHTML = renderDashboardSkeleton(userName);

            let today = new Date().toISOString().split('T')[0];
            let stats = {
                totalOrders: 0, newCount: 0, assignedCount: 0, deliveredCount: 0,
                todayCount: 0, todayKarkh: 0, todayRusafa: 0, today
            };
            let notifList = [];

            try {
                const home = await getDashboardHomeCached(forceRefresh);
                today = home?.today || today;
                stats = home?.stats || stats;
                notifList = home?.notifications?.list || [];
            } catch (_) {
                try {
                    stats = await window.api.dashboard.stats(today);
                } catch (e2) { /* keep defaults */ }
            }

            container.innerHTML = renderDashboardMarkup(userName, today, stats, notifList);
            bindDashboardQuickNav(container);
            bindOverrideNotifications(container);
            const mount = container.closest('.screen-mount');
            if (mount?.dataset.forceRefresh) delete mount.dataset.forceRefresh;
        }
    },

    'new-order': {
        async render(container) {
            let regions = [];
            try {
                regions = await window.api.regions.getAll();
            } catch (_) {}

            const FREE_DELIVERY_THRESHOLD = 50000; // التوصيل مجاني تلقائياً عند 50000 أو أكثر
            let lastAmountForFreeDelivery = 0; // لتتبع تجاوز الحد من الأسفل فقط
            const calcTotal = (fromInput) => {
                const amt = parseFloat(document.getElementById('amount')?.value || 0);
                const fee = parseFloat(document.getElementById('deliveryFee')?.value || 0);
                const freeEl = document.getElementById('freeDelivery');
                // عند تجاوز 50000 من الأسفل: يتم التاشير تلقائياً. المستخدم يمكنه إزالته ولن يُعاد التاشير حتى ينزل المبلغ تحت 50000 ثم يعود
                if (fromInput && freeEl && amt >= FREE_DELIVERY_THRESHOLD && lastAmountForFreeDelivery < FREE_DELIVERY_THRESHOLD) {
                    freeEl.checked = true;
                }
                if (amt < FREE_DELIVERY_THRESHOLD) lastAmountForFreeDelivery = amt;
                else lastAmountForFreeDelivery = amt;
                const free = freeEl?.checked || false;
                // التوصيل مجاني: النهائي = الفاتورة، المستحق = max(0, الفاتورة - أجرة التوصيل)
                const total = free ? amt : (amt + fee);
                const due = free ? (Number(amt) - Number(fee)) : Number(amt);
                document.getElementById('totalDisplay').textContent = formatIQD(total);
                const dueEl = document.getElementById('totalDue');
                if (dueEl) {
                    dueEl.innerHTML = `المبلغ المستحق: <strong>${formatIQD(due)}</strong> د.ع`;
                }
                return total;
            };

            container.innerHTML = `
                <div class="screen active new-order-screen new-order-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-plus-circle',
                        title: 'إدخال طلب جديد',
                        subtitle: 'املأ بيانات المتجر والمستلم والمبالغ — يمكنك الحفظ أو طباعة الملصق مباشرة',
                        variant: 'pink'
                    })}
                    <div class="new-order-steps" aria-hidden="true">
                        <span class="new-order-step is-active"><i class="bi bi-shop"></i> المتجر</span>
                        <span class="new-order-step is-active"><i class="bi bi-person"></i> المستلم</span>
                        <span class="new-order-step is-active"><i class="bi bi-geo-alt"></i> التوصيل</span>
                        <span class="new-order-step is-active"><i class="bi bi-cash-stack"></i> المبالغ</span>
                    </div>
                    <form id="orderForm" class="new-order-form">
                        <div class="new-order-cards">
                            <div class="new-order-card new-order-card-store">
                                <div class="new-order-card-header"><i class="bi bi-shop"></i><span>بيانات المتجر</span></div>
                                <div class="new-order-card-body">
                                    <div class="new-order-field">
                                        <label>اسم المتجر <span class="required">*</span></label>
                                    <input type="text" id="storeName" required>
                                </div>
                                    <div class="new-order-field">
                                        <label>هاتف المتجر <span class="required">*</span></label>
                                        <input type="text" id="storePhone" placeholder="11 رقم" required>
                                </div>
                                </div>
                                </div>
                            <div class="new-order-credentials-customer-row">
                                <div class="new-order-card new-order-card-credentials">
                                    <div class="new-order-card-header"><i class="bi bi-key"></i><span>بيانات الدخول</span></div>
                                    <div class="new-order-card-body">
                                        <div class="new-order-field">
                                            <label>رمز الموظف <span class="required">*</span></label>
                                            <input type="password" id="employeeCode" placeholder="أدخل رمزك السري" required autocomplete="off">
                                </div>
                                        <div class="new-order-field">
                                            <label>رقم الطلب في النظام الإداري <span class="required">*</span></label>
                                            <input type="text" id="adminOrderNo" placeholder="رقم الطلب عندكم" required>
                                </div>
                                </div>
                                </div>
                                <div class="new-order-card new-order-card-customer">
                                    <div class="new-order-card-header"><i class="bi bi-person"></i><span>بيانات المستلم</span></div>
                                    <div class="new-order-card-body">
                                        <div class="new-order-field">
                                            <label>اسم المستلم (اختياري)</label>
                                            <input type="text" id="customerName" placeholder="اسم المستلم">
                                        </div>
                                        <div class="new-order-field">
                                            <label>هاتف المستلم <span class="required">*</span></label>
                                            <input type="text" id="customerPhone" placeholder="07701234567 (11 رقم)" required>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="new-order-delivery-amounts-row">
                            <div class="new-order-card new-order-card-delivery">
                                <div class="new-order-card-header"><i class="bi bi-geo-alt"></i><span>التوصيل</span></div>
                                <div class="new-order-card-body">
                                    <div class="new-order-field">
                                        <label>المنطقة <span class="required">*</span></label>
                                        <div class="region-search-wrap">
                                            <input type="text" id="regionSearchInput" class="region-search-input" placeholder="-- اختر المنطقة -- ابحث بالكتابة..." autocomplete="off">
                                            <span class="region-search-chevron"><i class="bi bi-chevron-down"></i></span>
                                            <input type="hidden" id="regionId" required>
                                            <div id="regionSearchDropdown" class="region-search-dropdown" style="display:none"></div>
                                        </div>
                                    </div>
                                    <div class="new-order-field new-order-field-full">
                                        <label>العنوان (تفاصيل العنوان) <span class="required">*</span></label>
                                        <input type="text" id="address" placeholder="اكتب تفاصيل العنوان..." required>
                                    </div>
                                </div>
                            </div>
                            <div class="new-order-card new-order-card-amounts">
                                <div class="new-order-card-header"><i class="bi bi-cash-stack"></i><span>المبالغ</span></div>
                                <div class="new-order-card-body">
                                    <div class="new-order-field">
                                        <label>عدد القطع <span class="required">*</span></label>
                                        <input type="number" id="pieces" value="1" min="1" required>
                                    </div>
                                    <div class="new-order-field">
                                        <label>مبلغ الفاتورة (د.ع) <span class="required">*</span></label>
                                        <input type="number" id="amount" min="0" step="1" placeholder="0" required>
                                    </div>
                                    <div class="new-order-field">
                                        <label>أجرة التوصيل (د.ع) <span class="required">*</span>${currentUser?.Role === 'employee' ? ' <span class="form-hint">(ثابتة حسب المنطقة)</span>' : ''}</label>
                                        <input type="number" id="deliveryFee" min="0" step="1" placeholder="0" required ${currentUser?.Role === 'employee' ? 'readonly' : ''}>
                                    </div>
                                    <div class="new-order-totals">
                                        <div class="new-order-total-row">
                                            <label>المبلغ النهائي</label>
                                            <div id="totalDisplay" class="new-order-total-value">0</div>
                                        </div>
                                        <div class="new-order-total-due" id="totalDue">المبلغ المستحق: <strong>0</strong> د.ع</div>
                                        <label class="new-order-free-label">
                                        <input type="checkbox" id="freeDelivery">
                                            <span>توصيل مجاني</span>
                                    </label>
                                </div>
                                </div>
                                </div>
                            </div>
                            </div>
                        <div class="new-order-card new-order-card-extra new-order-extra-above">
                            <div class="new-order-card-header"><i class="bi bi-link-45deg"></i><span>إضافي</span></div>
                            <div class="new-order-card-body">
                                <div class="new-order-field new-order-field-full">
                                    <label>رابط موقع الزبون (اختياري)</label>
                                    <input type="url" id="customerLocationLink" placeholder="رابط خرائط جوجل أو موقع التوصيل">
                            </div>
                                <div class="new-order-field new-order-field-full">
                                    <label>ملاحظات (اختياري)</label>
                                    <textarea id="notes" rows="2" placeholder="اكتب ملاحظة إن وجدت"></textarea>
                    </div>
                            </div>
                        </div>
                        <div class="new-order-actions">
                            <button type="submit" class="btn new-order-btn-save" id="btnSaveOrder"><i class="bi bi-check2-circle"></i><span>حفظ الطلب</span></button>
                            <button type="button" class="btn new-order-btn-print" id="btnPrint"><i class="bi bi-printer"></i><span>طباعة الملصق</span></button>
                            <button type="button" class="btn btn-secondary" id="btnClear"><i class="bi bi-x-circle"></i><span>مسح الحقول</span></button>
                        </div>
                        <div class="new-order-print-existing">
                            <input type="text" id="printShipmentNum" placeholder="رقم الشحنة لطباعة ملصق لطلب موجود">
                            <button type="button" class="btn btn-secondary" id="btnPrintExisting"><i class="bi bi-printer-fill"></i> طباعة</button>
                        </div>
                    </form>
                    <div id="lastOrderInfo" class="new-order-success-card" style="display:none"></div>
                </div>
            `;

            document.getElementById('storeName').value = localStorage.getItem('defaultStoreName') || '';
            document.getElementById('storePhone').value = localStorage.getItem('defaultStorePhone') || '';

            ['amount', 'deliveryFee'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', () => calcTotal(true));
            });
            document.getElementById('freeDelivery')?.addEventListener('change', () => calcTotal(false));
            (() => {
                const regionSearchInput = document.getElementById('regionSearchInput');
                const regionIdInput = document.getElementById('regionId');
                const dropdown = document.getElementById('regionSearchDropdown');
                const deliveryFeeInput = document.getElementById('deliveryFee');

                const applyRegionSelection = (r) => {
                    regionIdInput.value = r.RegionID;
                    regionSearchInput.value = (r.RegionName || '') + ' (' + formatIQD(r.DeliveryFeeIQD) + ' د.ع)';
                    regionSearchInput.dataset.fee = r.DeliveryFeeIQD || 0;
                    deliveryFeeInput.value = r.DeliveryFeeIQD || 0;
                    dropdown.style.display = 'none';
                    calcTotal(true);
                };

                const filterRegions = (q) => {
                    const qn = (q || '').trim().toLowerCase();
                    if (!qn) return regions;
                    return regions.filter(r => {
                        const name = (r.RegionName || '').toLowerCase();
                        const area = (r.RegionArea || '').toLowerCase();
                        return name.includes(qn) || area.includes(qn);
                    });
                };

                const renderDropdown = (list) => {
                    dropdown.innerHTML = list.length
                        ? list.map(r => `<div class="region-search-item" data-id="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}">${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)} د.ع)</div>`).join('')
                        : '<div class="region-search-item region-search-empty">لا توجد نتائج</div>';
                    dropdown.style.display = 'block';
                };

                regionSearchInput?.addEventListener('input', () => {
                    regionIdInput.value = '';
                    regionSearchInput.dataset.fee = '';
                    const list = filterRegions(regionSearchInput.value);
                    renderDropdown(list);
                });

                regionSearchInput?.addEventListener('focus', () => {
                    const list = regionIdInput.value ? regions : filterRegions(regionSearchInput.value);
                    renderDropdown(list);
                });
                regionSearchInput?.closest('.region-search-wrap')?.addEventListener('click', (e) => {
                    if (!dropdown?.contains(e.target)) {
                        regionSearchInput?.focus();
                    }
                });

                regionSearchInput?.addEventListener('keydown', (e) => {
                    const items = dropdown.querySelectorAll('.region-search-item:not(.region-search-empty)');
                    const focused = dropdown.querySelector('.region-search-item.focused');
                    if (e.key === 'Escape') {
                        dropdown.style.display = 'none';
                        return;
                    }
                    if (e.key === 'Enter' && focused && focused.dataset.id) {
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
                    if (!regionSearchInput?.contains(e.target) && !dropdown?.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });

                dropdown?.addEventListener('click', (e) => {
                    const item = e.target.closest('.region-search-item');
                    if (item?.dataset.id) {
                        const r = regions.find(x => x.RegionID == item.dataset.id);
                        if (r) applyRegionSelection(r);
                    }
                });
            })();
            calcTotal(false);

            let lastOrder = null;
            let isSubmitting = false;

            const btnSaveOrder = document.getElementById('btnSaveOrder');
            document.getElementById('orderForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (isSubmitting || btnSaveOrder?.disabled) return;

                const adminOrderNo = (document.getElementById('adminOrderNo')?.value || '').trim();
                const storeName = (document.getElementById('storeName')?.value || '').trim();
                const storePhone = (document.getElementById('storePhone')?.value || '').trim();
                const customerName = (document.getElementById('customerName')?.value || '').trim();
                const customerPhone = (document.getElementById('customerPhone')?.value || '').trim();
                const regionEl = document.getElementById('regionId');
                const address = (document.getElementById('address')?.value || '').trim();
                const amount = parseFloat(document.getElementById('amount')?.value || 0);
                const deliveryFee = parseFloat(document.getElementById('deliveryFee')?.value || 0);
                const notes = (document.getElementById('notes')?.value || '').trim();

                const employeeCode = (document.getElementById('employeeCode')?.value || '').trim();
                if (!employeeCode) { await showMsg('أدخل رمز الموظف'); return; }
                if (!adminOrderNo) { await showMsg('أدخل رقم الطلب في النظام الإداري'); return; }
                if (!storeName) { await showMsg('أدخل اسم المتجر'); return; }
                if (!storePhone) { await showMsg('أدخل هاتف المتجر'); return; }
                if (!customerPhone) { await showMsg('أدخل هاتف المستلم'); return; }
                const phoneDigits = (customerPhone || '').replace(/\D/g, '');
                if (phoneDigits.length !== 11) { await showMsg('هاتف المستلم يجب أن يكون 11 رقماً'); return; }
                if (!regionEl?.value) { await showMsg('اختر المنطقة'); return; }
                if (!address) { await showMsg('أدخل العنوان'); return; }
                if (amount < 0) { await showMsg('مبلغ الفاتورة لا يمكن أن يكون سالباً'); return; }
                if (deliveryFee < 0) { await showMsg('أدخل أجرة التوصيل'); return; }

                isSubmitting = true;
                if (btnSaveOrder) {
                    btnSaveOrder.disabled = true;
                    btnSaveOrder.classList.add('btn-saved');
                }
                const data = {
                    EmployeeCode: employeeCode,
                    AdminOrderNo: document.getElementById('adminOrderNo').value,
                    StoreName: document.getElementById('storeName').value,
                    StorePhone: document.getElementById('storePhone').value,
                    CustomerName: document.getElementById('customerName').value,
                    CustomerPhone: document.getElementById('customerPhone').value,
                    RegionID: regionEl?.value ? parseInt(regionEl.value) : null,
                    Address: document.getElementById('address').value,
                    CustomerLocationLink: (document.getElementById('customerLocationLink')?.value || '').trim() || null,
                    Pieces: parseInt(document.getElementById('pieces').value) || 1,
                    AmountIQD: parseFloat(document.getElementById('amount').value) || 0,
                    DeliveryFeeIQD: parseFloat(document.getElementById('deliveryFee').value) || 0,
                    FreeDelivery: document.getElementById('freeDelivery').checked,
                    Notes: document.getElementById('notes').value
                };
                try {
                    lastOrder = await window.api.orders.create(data);
                    invalidateDashboardCache();
                    invalidateScreenCache('orders');
                    document.getElementById('lastOrderInfo').style.display = 'block';
                    document.getElementById('lastOrderInfo').innerHTML = `
                        <strong>تم حفظ الطلب بنجاح</strong><br>
                        ${lastOrder.AdminOrderNo ? 'رقم الطلب: ' + lastOrder.AdminOrderNo + '<br>' : ''}
                        رقم الشحنة: ${lastOrder.ShipmentNumber}
                    `;
                } catch (err) {
                    await showMsg('خطأ: ' + (err.message || err));
                    isSubmitting = false;
                    if (btnSaveOrder) {
                        btnSaveOrder.disabled = false;
                        btnSaveOrder.classList.remove('btn-saved');
                    }
                }
            });

            const openPrintPopup = (path) => {
                const w = window.open(path, 'printLabel', 'width=800,height=700,scrollbars=yes,resizable=yes');
                if (w) {
                    w.onload = () => { try { w.focus(); w.print(); } catch (e) {} };
                }
            };

            document.getElementById('btnPrint').addEventListener('click', async () => {
                if (!lastOrder) {
                    await showMsg('احفظ الطلب أولاً أو استخدم حقل رقم الشحنة لطباعة ملصق لطلب موجود');
                    return;
                }
                try {
                    const path = await window.api.orders.print(lastOrder);
                    openPrintPopup(path);
                    await window.api.orders.markLabelPrinted(lastOrder.OrderID).catch(() => {});
                } catch (err) {
                    await showMsg('خطأ في الطباعة: ' + (err.message || err));
                }
            });

            document.getElementById('btnPrintExisting').addEventListener('click', async () => {
                const num = normalizeBarcodeInput(document.getElementById('printShipmentNum').value);
                if (!num) { await showMsg('أدخل رقم الشحنة'); return; }
                try {
                    const order = await window.api.orders.getByShipment(num);
                    if (!order) { await showMsg('الطلب غير موجود'); return; }
                    const path = await window.api.orders.print(order);
                    openPrintPopup(path);
                    await window.api.orders.markLabelPrinted(order.OrderID).catch(() => {});
                } catch (err) {
                    await showMsg('خطأ: ' + (err.message || err));
                }
            });

            document.getElementById('btnClear').addEventListener('click', () => {
                document.getElementById('orderForm').reset();
                document.getElementById('pieces').value = 1;
                document.getElementById('amount').value = '';
                document.getElementById('deliveryFee').value = '';
                document.getElementById('freeDelivery').checked = false;
                document.getElementById('regionSearchInput').value = '';
                document.getElementById('regionId').value = '';
                document.getElementById('storeName').value = localStorage.getItem('defaultStoreName') || '';
                document.getElementById('storePhone').value = localStorage.getItem('defaultStorePhone') || '';
                calcTotal();
                document.getElementById('lastOrderInfo').style.display = 'none';
                lastOrder = null;
                isSubmitting = false;
                if (btnSaveOrder) {
                    btnSaveOrder.disabled = false;
                    btnSaveOrder.classList.remove('btn-saved');
                }
            });
        }
    },

    orders: {
        async render(container) {
            const mount = container.closest('.screen-mount');
            const initialStatus = mount?.dataset?.ordersInitialStatus || '';
            if (mount && initialStatus) delete mount.dataset.ordersInitialStatus;
            await renderOrdersScreen(container, {
                title: 'الطلبات',
                initialFilters: { status: initialStatus }
            });
        }
    },

    drivers: {
        async render(container) {
            let drivers = [];
            try {
                drivers = await window.api.drivers.getAll({ all: true });
            } catch (err) {
                container.innerHTML = renderUxError('خطأ في تحميل السائقين', err?.message || String(err));
                return;
            }

            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            const activeDrivers = drivers.filter(d => d.Active).length;
            container.innerHTML = `
                <div class="screen active drivers-screen drivers-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-truck',
                        title: 'إدارة السائقين',
                        subtitle: 'إضافة السائقين، إنشاء الحسابات، وتفعيل أو إيقاف السائق',
                        badges: [`${drivers.length} سائق`, `${activeDrivers} نشط`]
                    })}
                    <div class="ux-panel">
                        <div class="ux-panel__head">
                            <h2><i class="bi bi-person-plus" aria-hidden="true"></i> إضافة سائق جديد</h2>
                        </div>
                        <div class="form-grid drivers-add-form ux-form-grid">
                            <div class="form-group">
                                <label>الاسم</label>
                                <input type="text" id="newDriverName" placeholder="اسم السائق">
                            </div>
                            <div class="form-group">
                                <label>الهاتف</label>
                                <input type="text" id="newDriverPhone" placeholder="07701234567">
                            </div>
                            <div class="form-group" style="align-items:flex-end">
                                <label>&nbsp;</label>
                                <button type="button" class="btn btn-primary" id="btnAddDriver">إضافة سائق</button>
                            </div>
                        </div>
                    </div>
                    <div class="ux-panel ux-panel--table">
                        <div class="ux-panel__head">
                            <h2><i class="bi bi-list-ul" aria-hidden="true"></i> قائمة السائقين</h2>
                        </div>
                        <div class="drivers-table-wrap ux-table-wrap">
                            <table class="drivers-table">
                            <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الهاتف</th>
                                        <th>الحساب</th>
                                        <th>الحالة</th>
                                        <th>إجراء</th>
                                    </tr>
                            </thead>
                                <tbody>
                                ${drivers.map(d => `
                                    <tr data-id="${d.DriverID}">
                                            <td><input type="text" class="edit-name" value="${esc(d.DriverName)}"></td>
                                            <td><input type="text" class="edit-phone" value="${esc(d.Phone)}"></td>
                                            <td class="driver-account-cell">
                                                <div class="driver-account-row">
                                                    ${d.Username ? `<span class="driver-account">${esc(d.Username)}</span>` : '<span class="no-account">لا يوجد</span>'}
                                                    ${d.Username ? `<button type="button" class="btn btn-sm btn-account-view" data-id="${d.DriverID}" data-name="${esc(d.DriverName)}" title="عرض التفاصيل">عرض</button>` : ''}
                                                    <button type="button" class="btn btn-sm ${d.Username ? 'btn-account-reset' : 'btn-account-create'}" data-id="${d.DriverID}" data-has-account="${!!d.Username}" data-name="${esc(d.DriverName)}" data-username="${esc(d.Username || '')}" title="${d.Username ? 'تغيير كلمة السر' : 'إنشاء حساب'}">${d.Username ? 'تغيير' : 'إنشاء حساب'}</button>
                                                </div>
                                            </td>
                                            <td>
                                                <label class="checkbox-label">
                                                <input type="checkbox" class="edit-active" ${d.Active ? 'checked' : ''}>
                                                نشط
                                            </label>
                                        </td>
                                        <td>
                                                <button type="button" class="btn btn-secondary btn-sm btn-save" title="حفظ">حفظ</button>
                                                <button type="button" class="btn btn-sm btn-delete btn-delete-driver" data-id="${d.DriverID}" data-name="${esc(d.DriverName)}" title="حذف">حذف</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            `;

            const refresh = () => this.render(container);

            // إضافة سائق
            container.querySelector('#btnAddDriver').onclick = async () => {
                const nameEl = container.querySelector('#newDriverName');
                const phoneEl = container.querySelector('#newDriverPhone');
                const name = nameEl?.value?.trim() || '';
                if (!name) { await showMsg('أدخل اسم السائق'); return; }
                try {
                    await window.api.drivers.create(name, phoneEl?.value || '');
                    nameEl.value = '';
                    phoneEl.value = '';
                    refresh();
                } catch (e) { await showMsg('خطأ: ' + (e?.message || e)); }
            };

            // تفويض الأحداث للجدول
            container.querySelector('.drivers-table tbody').onclick = async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                    const row = btn.closest('tr');
                const id = parseInt(row?.dataset?.id);
                const name = btn.dataset?.name || row?.querySelector('.edit-name')?.value || 'السائق';

                if (btn.classList.contains('btn-account-view')) {
                    e.stopPropagation();
                    await openViewCredentialsModal(id, name, refresh);
                    return;
                }
                if (btn.classList.contains('btn-account-create') || btn.classList.contains('btn-account-reset')) {
                    e.stopPropagation();
                    const hasAccount = btn.dataset?.hasAccount === 'true';
                    const driver = drivers.find(d => d.DriverID === id) || { DriverID: id, DriverName: name, Username: btn.dataset?.username || null };
                    openDriverAccountModal(driver, { mode: hasAccount ? 'change' : 'create', onSuccess: refresh });
                    return;
                }
                if (btn.classList.contains('btn-save')) {
                    e.stopPropagation();
                    const nameVal = row?.querySelector('.edit-name')?.value?.trim() || '';
                    const phoneVal = row?.querySelector('.edit-phone')?.value || '';
                    const active = row?.querySelector('.edit-active')?.checked ?? true;
                    if (!nameVal) { await showMsg('أدخل اسم السائق'); return; }
                    try {
                        await window.api.drivers.update(id, nameVal, phoneVal, active);
                        refresh();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                    return;
                }
                if (btn.classList.contains('btn-delete-driver')) {
                    e.stopPropagation();
                    if (!(await window.api.showConfirm(`هل تريد حذف السائق "${name}"؟ سيتم إلغاء تعيين الطلبات المرتبطة به.`))) return;
                    try {
                    await window.api.drivers.delete(id);
                        refresh();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                }
            };
        }
    },

    'driver-receive': {
        async render(container) {
            const drivers = await window.api.drivers.getActive();
            let currentDriver = null;

            const updateUI = () => {
                const step1 = container.querySelector('#receiveStep1');
                const step2 = container.querySelector('#receiveStep2');
                const driverBadge = container.querySelector('#driverBadge');
                const btnAnother = container.querySelector('#btnAnotherDriver');
                if (currentDriver) {
                    if (step1) step1.style.display = 'none';
                    if (step2) step2.style.display = 'block';
                    if (driverBadge) driverBadge.textContent = currentDriver.DriverName;
                    if (btnAnother) btnAnother.style.display = 'inline-block';
                    container.querySelector('#scanInput')?.focus();
                } else {
                    if (step1) step1.style.display = 'block';
                    if (step2) step2.style.display = 'none';
                    if (btnAnother) btnAnother.style.display = 'none';
                    container.querySelector('#driverCodeInput')?.focus();
                }
            };

            container.innerHTML = `
                <div class="screen active driver-receive-screen driver-receive-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-box-arrow-in-down',
                        title: 'استلام الطلبات للسائق',
                        subtitle: 'أدخل رمز السائق ثم امسح أو اكتب أرقام الشحنات للتعيين',
                        variant: 'teal'
                    })}
                    <div class="ux-panel ux-panel--scan">
                        ${drivers.length === 0 ? '<div class="ux-alert ux-alert--danger"><i class="bi bi-exclamation-triangle"></i> أضف سائقين من قسم السائقين أولاً</div>' : ''}
                        <div id="receiveStep1" class="receive-step">
                            <label class="ux-field-label" for="driverCodeInput">الرمز السري للسائق</label>
                            <div class="ux-scan-row">
                                <input type="password" id="driverCodeInput" class="ux-scan-input" placeholder="أدخل الرمز واضغط Enter" autocomplete="off" ${drivers.length === 0 ? 'disabled' : ''}>
                                <span class="ux-scan-hint"><i class="bi bi-key"></i> Enter للتأكيد</span>
                            </div>
                        </div>
                        <div id="receiveStep2" class="receive-step" style="display:none">
                            <div class="receive-driver-bar">
                                <span class="driver-badge ux-driver-badge" id="driverBadge"></span>
                                <button type="button" class="btn btn-secondary btn-sm" id="btnAnotherDriver" style="display:none">سائق آخر</button>
                            </div>
                            <label class="ux-field-label" for="scanInput">رقم الشحنة</label>
                            <div class="ux-scan-row">
                                <input type="text" id="scanInput" class="ux-scan-input ux-scan-input--lg" placeholder="امسح الباركود أو اكتب رقم الشحنة" autocomplete="off">
                                <button type="button" class="btn btn-primary" id="btnAssign">تعيين للسائق</button>
                            </div>
                        </div>
                        <div id="scanFeedback" class="scan-feedback ux-scan-feedback" style="display:none"></div>
                    </div>
                </div>
            `;

            const scanInput = document.getElementById('scanInput');
            const driverCodeInput = document.getElementById('driverCodeInput');
            const feedback = document.getElementById('scanFeedback');

            const verifyDriver = async () => {
                const code = (driverCodeInput?.value || '').trim();
                if (!code) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'أدخل الرمز السري';
                    return;
                }
                try {
                    const res = await window.api.drivers.verifyPassword(code);
                    if (res.success && res.driver) {
                        currentDriver = res.driver;
                        driverCodeInput.value = '';
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback success';
                        feedback.textContent = 'السائق: ' + res.driver.DriverName + ' - امسح أرقام الشحنات للتعيين';
                        updateUI();
                    }
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = err?.message || 'الرمز السري غير صحيح';
                }
            };

            const assign = async () => {
                const num = normalizeBarcodeInput(scanInput?.value || '');
                if (!num) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'أدخل رقم الشحنة';
                    return;
                }
                if (!currentDriver) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'أدخل الرمز السري أولاً';
                    return;
                }
                try {
                    const result = await window.api.orders.assignDriver(num, currentDriver.DriverID);
                    if (result.success) {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback success';
                        feedback.textContent = `تم تعيين الطلب ${num} للسائق ${currentDriver.DriverName}`;
                        scanInput.value = '';
                        scanInput.focus();
                    } else {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback error';
                        feedback.textContent = result.error || 'فشل التعيين';
                    }
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = err?.message || 'الطلب غير موجود';
                }
            };

            driverCodeInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); verifyDriver(); }
            });

            scanInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); assign(); }
            });

            document.getElementById('btnAssign')?.addEventListener('click', assign);

            document.getElementById('btnAnotherDriver')?.addEventListener('click', () => {
                currentDriver = null;
                feedback.style.display = 'none';
                updateUI();
            });

            driverCodeInput?.focus();
        }
    },

    'support-sections': {
        async render(container) {
            const initialTab = container.dataset.initialTab || 'driver-return';
            container.innerHTML = `
                <div class="screen active support-sections-screen support-sections-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-tools',
                        title: 'أقسام سانده',
                        subtitle: 'عمليات الدعم: إرجاع الطلب من السائق أو تسجيله كراجع',
                        variant: 'amber'
                    })}
                    ${renderUxSubnav([
                        { id: 'driver-return', label: 'تبديل السائق', icon: 'bi-arrow-left-right' },
                        { id: 'driver-returned', label: 'طلب راجع', icon: 'bi-x-circle' }
                    ], initialTab)}
                    <div class="support-sections-layout">
                        <main class="support-sections-panel ux-panel-stack">
                            <section class="support-section-pane ux-panel ux-panel--scan" id="support-pane-driver-return">
                                <div class="ux-panel__head">
                                    <h2><i class="bi bi-arrow-left-right" aria-hidden="true"></i> تبديل السائق</h2>
                                </div>
                                <p class="ux-panel__desc">امسح أو اكتب رقم الشحنة لإرجاع الطلب من السائق الحالي، ثم عيّنه لسائق آخر من «استلام الطلبات».</p>
                                <label class="ux-field-label" for="returnScanInput">رقم الشحنة</label>
                                <div class="ux-scan-row">
                                    <input type="text" id="returnScanInput" placeholder="امسح الباركود أو اكتب رقم الشحنة" autocomplete="off" class="ux-scan-input ux-scan-input--lg">
                                    <button type="button" class="btn btn-primary" id="btnReturnOrder"><i class="bi bi-arrow-return-left"></i> إرجاع الطلب</button>
                                </div>
                                <div id="returnFeedback" class="scan-feedback ux-scan-feedback" style="display:none"></div>
                            </section>
                            <section class="support-section-pane ux-panel ux-panel--scan" id="support-pane-driver-returned">
                                <div class="ux-panel__head">
                                    <h2><i class="bi bi-x-circle" aria-hidden="true"></i> طلب راجع</h2>
                                </div>
                                <p class="ux-panel__desc">امسح أو اكتب رقم الشحنة لتسجيل الطلب كراجع (مرفوض من الزبون).</p>
                                <label class="ux-field-label" for="returnedScanInput">رقم الشحنة</label>
                                <div class="ux-scan-row">
                                    <input type="text" id="returnedScanInput" placeholder="امسح الباركود أو اكتب رقم الشحنة" autocomplete="off" class="ux-scan-input ux-scan-input--lg">
                                    <button type="button" class="btn btn-primary" id="btnMarkReturned"><i class="bi bi-check2-circle"></i> تسجيل كراجع</button>
                                </div>
                                <div id="returnedFeedback" class="scan-feedback ux-scan-feedback" style="display:none"></div>
                            </section>
                        </main>
                    </div>
                </div>
            `;

            container.querySelectorAll('.support-section-pane').forEach(p => p.classList.remove('active'));
            container.querySelector(`#support-pane-${initialTab}`)?.classList.add('active');
            bindUxSubnav(container, {
                paneSelector: '.support-section-pane',
                panePrefix: '#support-pane-'
            });

            const scanInput = document.getElementById('returnScanInput');
            const feedback = document.getElementById('returnFeedback');

            const doReturn = async () => {
                const num = normalizeBarcodeInput(scanInput.value);
                if (!num) {
                    feedback.style.display = 'block';
                    feedback.className = 'support-scan-feedback error';
                    feedback.textContent = 'أدخل رقم الشحنة';
                    return;
                }
                try {
                    const result = await window.api.orders.returnFromDriver(num);
                    if (result.success) {
                        feedback.style.display = 'block';
                        feedback.className = 'support-scan-feedback success';
                        feedback.textContent = 'تم إرجاع الطلب ' + num + ' بنجاح. يمكنك الآن تعيينه لسائق آخر من قسم "استلام الطلبات".';
                        scanInput.value = '';
                        scanInput.focus();
                    } else {
                        feedback.style.display = 'block';
                        feedback.className = 'support-scan-feedback error';
                        feedback.textContent = result.error || 'فشل الإرجاع';
                    }
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'support-scan-feedback error';
                    feedback.textContent = 'خطأ: ' + (err.message || err);
                }
            };

            scanInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); doReturn(); }
            });

            document.getElementById('btnReturnOrder')?.addEventListener('click', doReturn);

            const returnedScanInput = document.getElementById('returnedScanInput');
            const returnedFeedback = document.getElementById('returnedFeedback');

            const markReturned = async () => {
                const num = normalizeBarcodeInput(returnedScanInput.value);
                if (!num) {
                    returnedFeedback.style.display = 'block';
                    returnedFeedback.className = 'scan-feedback error';
                    returnedFeedback.textContent = 'أدخل رقم الشحنة';
                    return;
                }
                try {
                    const order = await window.api.orders.getByShipment(num);
                    if (!order) {
                        returnedFeedback.style.display = 'block';
                        returnedFeedback.className = 'support-scan-feedback error';
                        returnedFeedback.textContent = 'الطلب غير موجود: ' + num;
                        return;
                    }
                    await window.api.orders.updateStatus(order.OrderID, 'Returned');
                    returnedFeedback.style.display = 'block';
                        returnedFeedback.className = 'support-scan-feedback success';
                        returnedFeedback.textContent = 'تم تسجيل الطلب ' + num + ' كراجع بنجاح';
                    returnedScanInput.value = '';
                    returnedScanInput.focus();
                } catch (err) {
                    returnedFeedback.style.display = 'block';
                        returnedFeedback.className = 'support-scan-feedback error';
                        returnedFeedback.textContent = 'خطأ: ' + (err.message || err);
                }
            };

            returnedScanInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); markReturned(); }
            });

            document.getElementById('btnMarkReturned')?.addEventListener('click', markReturned);

            scanInput?.focus();
        }
    },

    'receive-returned': {
        async render(container) {
            container.innerHTML = `
                <div class="screen active receive-returned-screen receive-returned-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-arrow-return-left',
                        title: 'استلام الطلب الراجع',
                        subtitle: 'تسجيل استلام الطلب الراجع عند الشركة بعد إرجاعه من السائق',
                        variant: 'orange'
                    })}
                    <div class="ux-panel ux-panel--scan">
                        <div class="ux-alert ux-alert--info">
                            <i class="bi bi-info-circle"></i>
                            <span>امسح الباركود أو اكتب رقم الشحنة — للطلبات ذات حالة «راجع» فقط</span>
                        </div>
                        <label class="ux-field-label" for="receiveReturnedScanInput">رقم الشحنة</label>
                        <div class="ux-scan-row">
                            <input type="text" id="receiveReturnedScanInput" class="ux-scan-input ux-scan-input--lg" placeholder="امسح الباركود أو اكتب رقم الشحنة" autocomplete="off">
                            <button type="button" class="btn btn-primary" id="btnReceiveReturned"><i class="bi bi-check2-circle"></i> تسجيل الاستلام</button>
                        </div>
                        <div id="receiveReturnedFeedback" class="scan-feedback ux-scan-feedback" style="display:none"></div>
                    </div>
                </div>
            `;

            const scanInput = document.getElementById('receiveReturnedScanInput');
            const feedback = document.getElementById('receiveReturnedFeedback');

            const markReceived = async () => {
                const num = normalizeBarcodeInput(scanInput.value);
                if (!num) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'أدخل رقم الشحنة';
                    return;
                }
                try {
                    const order = await window.api.orders.getByShipment(num);
                    if (!order) {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback error';
                        feedback.textContent = 'الطلب غير موجود: ' + num;
                        return;
                    }
                    if (order.Status !== 'Returned' && !/راجع|returned/i.test(String(order.Status || ''))) {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback error';
                        feedback.textContent = 'الطلب ليس راجعاً - يمكن استلام الطلبات الراجعة فقط';
                        return;
                    }
                    if (order.ReturnedOrderReceived) {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback';
                        feedback.style.background = '#e0f2fe';
                        feedback.style.color = '#0369a1';
                        feedback.textContent = 'تم استلام هذا الطلب مسبقاً عند الشركة';
                        scanInput.value = '';
                        scanInput.focus();
                        return;
                    }
                    await window.api.orders.markReturnedOrderReceived(order.OrderID);
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback success';
                    feedback.textContent = 'تم تسجيل استلام الطلب ' + num + ' عند الشركة بنجاح';
                    scanInput.value = '';
                    scanInput.focus();
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'خطأ: ' + (err.message || err);
                }
            };

            scanInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); markReceived(); }
            });

            document.getElementById('btnReceiveReturned').addEventListener('click', markReceived);

            scanInput.focus();
        }
    },

    reports: {
        async render(container) {
            const drivers = await window.api.drivers.getActive();
            let employees = [];
            try {
                const users = await window.api.users.getAll();
                employees = (users || []).filter(u => u.Role === 'employee' && u.Active !== 0);
            } catch (_) {}
            let today = new Date().toISOString().split('T')[0];
            try { const t = await window.api.settings.getToday(); today = t.today || today; } catch (_) {}

            const initialTab = container.dataset.initialTab || 'collect';
            container.innerHTML = `
                <div class="screen active reports-screen reports-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-graph-up-arrow',
                        title: 'التقارير',
                        subtitle: 'استحصال الأجور، التقارير اليومية، وتقارير السائقين والموظفين',
                        variant: 'purple'
                    })}
                    ${renderUxSubnav([
                        { id: 'collect', label: 'استحصال الأجور', icon: 'bi-cash-coin' },
                        { id: 'daily', label: 'الملخص', icon: 'bi-calendar3' },
                        { id: 'driver', label: 'تقرير السائق', icon: 'bi-truck' },
                        { id: 'employee', label: 'تقرير الموظف', icon: 'bi-person-badge' },
                        { id: 'company', label: 'التقرير العام', icon: 'bi-building' }
                    ], initialTab)}
                    <div class="reports-layout">
                        <main class="reports-panel ux-reports-panel">
                            <section class="report-pane" id="pane-collect">
                                <h3 class="report-pane-head">استحصال الأجور</h3>
                                <p class="report-pane-desc">سجّل استلام أجور التوصيل من السائق بعد إكمال الطلبات</p>
                                <div class="report-form-row">
                                    <div class="report-field">
                                <label>السائق</label>
                                        <select id="collectDriver">${drivers.map(d => `<option value="${d.DriverID}">${d.DriverName}</option>`).join('')}</select>
                            </div>
                                    <div class="report-field">
                                        <label>تاريخ الطلبات</label>
                                        <input type="date" id="collectOrderDate" value="${today}">
                            </div>
                                    <button type="button" class="btn btn-outline" id="btnLoadCollectAmount">عرض المبلغ</button>
                            </div>
                                <div id="collectAmountBox" class="report-collect-box">
                                    <div class="report-collect-label">المبلغ المستحق لهذا اليوم:</div>
                                    <div id="collectTotalDue" class="report-collect-value"></div>
                                    <div id="collectOrderCount" class="report-collect-count"></div>
                                    <div id="collectAlreadyPaidMsg" class="report-collect-error">تم دفع المبلغ - لا يمكن الدفع مرتين</div>
                                    <div id="collectUnreceivedReturnedMsg" class="report-collect-error" style="display:none">لا يمكن استحصال الأجور: يوجد طلب راجع في ذلك اليوم لم يُسلّم من السائق بعد. سجّل استلام الطلب الراجع أولاً.</div>
                            </div>
                                <div class="report-form-row" id="collectFormRow">
                                    <div class="report-field report-field-wide">
                                        <label>المبلغ المستحصل</label>
                                        <input type="text" id="collectAmountInput" placeholder="أدخل المبلغ بالأرقام (سالب إذا كان المستحق سالباً)" inputmode="numeric">
                        </div>
                                    <button type="button" class="btn btn-primary btn-lg" id="btnCollectFees">استحصال الأجور</button>
                        </div>
                                <div id="collectFeedback" class="scan-feedback report-feedback"></div>
                            </section>
                            <section class="report-pane" id="pane-daily">
                                <h3 class="report-pane-head">التقرير الملخص</h3>
                                <p class="report-pane-desc">ملخص سريع لكل سائق - المبالغ والتسديد دون تفاصيل الطلبات</p>
                                <div class="report-form-row report-form-wrap">
                                    <div class="report-field report-field-drivers">
                                        <label>السائقين</label>
                                        <div class="driver-checkboxes">
                                            <label class="checkbox-label"><input type="checkbox" id="dailySummaryAll" checked> الكل</label>
                                            ${drivers.map(d => `<label class="checkbox-label"><input type="checkbox" class="dailySummaryDriver" value="${d.DriverID}" ${drivers.length <= 5 ? 'checked' : ''}> ${(d.DriverName||'').replace(/</g,'&lt;')}</label>`).join('')}
                    </div>
                            </div>
                                    <div class="report-field report-field--full">
                                        ${dateRangePickerHtml('dailySummary', today, { fromId: 'dailySummaryFrom', toId: 'dailySummaryTo', singleDayDefault: true })}
                                    </div>
                                    <button type="button" class="btn btn-primary" id="btnDailySummary">عرض التقرير</button>
                            </div>
                                <div id="dailySummaryContent"></div>
                                <div id="dailySummaryActions" class="report-actions" style="display:none"><button type="button" class="btn btn-secondary" id="btnDailySummaryPDF">تصدير PDF</button></div>
                            </section>
                            <section class="report-pane" id="pane-driver">
                                <h3 class="report-pane-head">تقرير السائق</h3>
                                <p class="report-pane-desc">تفاصيل كاملة لطلبات سائق محدد مع المبالغ والإحصائيات</p>
                                <div class="report-form-row">
                                    <div class="report-field">
                                        <label>السائق</label>
                                        <select id="reportDriver">${drivers.map(d => `<option value="${d.DriverID}">${d.DriverName}</option>`).join('')}</select>
                            </div>
                                    <div class="report-field report-field--full">
                                        ${dateRangePickerHtml('report', today)}
                                    </div>
                                    <button class="btn btn-primary" id="btnDriverReport">عرض التقرير</button>
                                </div>
                                <div id="driverReportContent"></div>
                                <div id="driverReportActions" class="report-actions" style="display:none"><button class="btn btn-primary" id="btnPrintDriverReport">طباعة</button><button class="btn btn-secondary" id="btnExportDriverPDF">تصدير PDF</button></div>
                            </section>
                            <section class="report-pane" id="pane-employee">
                                <h3 class="report-pane-head">تقرير الموظف</h3>
                                <p class="report-pane-desc">طلبات أنشأها موظف محدد في الفترة المحددة — فلترة حسب من أدخل الطلب</p>
                                <div class="report-form-row">
                                    <div class="report-field">
                                        <label>الموظف</label>
                                        <select id="reportEmployee">
                                            ${employees.length
                                                ? employees.map(e => `<option value="${e.UserID}">${(e.DisplayName || e.Username || 'موظف').replace(/</g, '&lt;')}</option>`).join('')
                                                : '<option value="">لا يوجد موظفون</option>'}
                                        </select>
                                    </div>
                                    <div class="report-field report-field--full">
                                        ${dateRangePickerHtml('employee', today)}
                                    </div>
                                    <button class="btn btn-primary" id="btnEmployeeReport" ${employees.length ? '' : 'disabled'}>عرض التقرير</button>
                                </div>
                                <div id="employeeReportContent"></div>
                                <div id="employeeReportActions" class="report-actions" style="display:none">
                                    <button class="btn btn-primary" id="btnPrintEmployeeReport">طباعة</button>
                                    <button class="btn btn-secondary" id="btnExportEmployeePDF">تصدير PDF</button>
                                </div>
                            </section>
                            <section class="report-pane" id="pane-company">
                                <h3 class="report-pane-head">التقرير العام</h3>
                                <p class="report-pane-desc">ملخص شامل لجميع السائقين والطلبات في الفترة المحددة</p>
                                <div class="report-form-row">
                                    <div class="report-field report-field--full">
                                        ${dateRangePickerHtml('company', today)}
                                    </div>
                                    <button class="btn btn-primary" id="btnCompanyReport">عرض التقرير</button>
                        </div>
                        <div id="companyReportContent"></div>
                                <div id="companyReportActions" class="report-actions" style="display:none"><button class="btn btn-secondary" id="btnExportCompanyPDF">تصدير PDF</button></div>
                            </section>
                        </main>
                        </div>
                </div>
            `;

            container.querySelectorAll('.report-pane').forEach(x => x.classList.remove('active'));
            container.querySelector('#pane-' + initialTab)?.classList.add('active');
            bindUxSubnav(container, {
                paneSelector: '.report-pane',
                panePrefix: '#pane-'
            });
            initAllDateRangePickers(container);

            let collectExpectedAmount = null;
            let collectAlreadyPaid = false;
            let collectBlockedUnreceived = false;
            const hideCollectAmount = () => {
                document.getElementById('collectAmountBox').style.display = 'none';
                document.getElementById('collectAlreadyPaidMsg').style.display = 'none';
                document.getElementById('collectUnreceivedReturnedMsg').style.display = 'none';
                document.getElementById('collectAmountInput').disabled = false;
                document.getElementById('btnCollectFees').disabled = false;
                collectExpectedAmount = null;
                collectAlreadyPaid = false;
                collectBlockedUnreceived = false;
            };
            document.getElementById('collectDriver').addEventListener('change', hideCollectAmount);
            document.getElementById('collectOrderDate').addEventListener('change', hideCollectAmount);

            document.getElementById('btnLoadCollectAmount').addEventListener('click', async () => {
                const driverId = document.getElementById('collectDriver').value;
                const orderDate = document.getElementById('collectOrderDate').value;
                const feedback = document.getElementById('collectFeedback');
                const amountBox = document.getElementById('collectAmountBox');
                const totalEl = document.getElementById('collectTotalDue');
                const countEl = document.getElementById('collectOrderCount');
                if (!orderDate) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'اختر تاريخ الطلبات';
                    return;
                }
                feedback.style.display = 'none';
                try {
                    const [report, status] = await Promise.all([
                        window.api.reports.driverByRange(parseInt(driverId), orderDate, orderDate),
                        window.api.drivers.getFeesCollectedStatus(driverId, orderDate)
                    ]);
                    collectAlreadyPaid = status.collected || false;
                    collectBlockedUnreceived = !!(report && report.hasUnreceivedReturned);
                    const alreadyPaidMsg = document.getElementById('collectAlreadyPaidMsg');
                    const unreceivedMsg = document.getElementById('collectUnreceivedReturnedMsg');
                    const amountInput = document.getElementById('collectAmountInput');
                    const btnCollect = document.getElementById('btnCollectFees');
                    if (collectAlreadyPaid) {
                        alreadyPaidMsg.style.display = 'block';
                        unreceivedMsg.style.display = 'none';
                        amountInput.disabled = true;
                        btnCollect.disabled = true;
                        amountInput.value = '';
                    } else if (collectBlockedUnreceived) {
                        alreadyPaidMsg.style.display = 'none';
                        unreceivedMsg.style.display = 'block';
                        amountInput.disabled = true;
                        btnCollect.disabled = true;
                        amountInput.value = '';
                    } else {
                        alreadyPaidMsg.style.display = 'none';
                        unreceivedMsg.style.display = 'none';
                        amountInput.disabled = false;
                        btnCollect.disabled = false;
                    }
                    if (!report || report.orders.length === 0) {
                        amountBox.style.display = 'block';
                        totalEl.textContent = '0 د.ع';
                        countEl.textContent = 'لا توجد طلبات لهذا اليوم';
                        collectExpectedAmount = 0;
                    } else {
                        collectExpectedAmount = Math.round(report.totalDue || 0);
                        amountBox.style.display = 'block';
                        totalEl.textContent = formatIQD(collectExpectedAmount) + ' د.ع';
                        countEl.textContent = 'عدد الطلبات: ' + report.count + (report.countReturned ? ' | مرتجعات: ' + report.countReturned : '');
                        document.getElementById('collectAmountInput').value = '';
                    }
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = err?.message || 'فشل تحميل البيانات';
                    amountBox.style.display = 'none';
                    collectExpectedAmount = null;
                }
            });

            document.getElementById('btnCollectFees').addEventListener('click', async () => {
                const driverId = document.getElementById('collectDriver').value;
                const orderDate = document.getElementById('collectOrderDate').value;
                const amountInput = document.getElementById('collectAmountInput').value.trim();
                const feedback = document.getElementById('collectFeedback');
                if (!orderDate) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'اختر تاريخ الطلبات';
                    return;
                }
                if (collectExpectedAmount == null) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'اضغط "عرض المبلغ المستحق" أولاً';
                    return;
                }
                if (collectAlreadyPaid) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'تم دفع المبلغ مسبقاً - لا يمكن الدفع مرتين';
                    return;
                }
                if (collectBlockedUnreceived) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'لا يمكن استحصال الأجور: يوجد طلب راجع في ذلك اليوم لم يُسلّم من السائق بعد. سجّل استلام الطلب الراجع أولاً.';
                    return;
                }
                const raw = String(amountInput).trim();
                const isNegative = raw.startsWith('-');
                const digits = raw.replace(/\D/g, '');
                const enteredNum = (isNegative ? -1 : 1) * (parseInt(digits, 10) || 0);
                if (enteredNum !== collectExpectedAmount) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'المبلغ المستحصل (' + formatIQD(enteredNum) + ') لا يساوي المبلغ المستحق (' + formatIQD(collectExpectedAmount) + ')';
                    return;
                }
                try {
                    const res = await window.api.drivers.collectFees(driverId, orderDate);
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback success';
                    feedback.textContent = res.alreadyRecorded ? 'تم تسجيل الاستحصال مسبقاً لهذا اليوم' : 'تم تسجيل استحصال الأجور بنجاح';
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = err?.message || 'فشل التسجيل';
                }
            });

            document.getElementById('dailySummaryAll')?.addEventListener('change', (e) => {
                document.querySelectorAll('.dailySummaryDriver').forEach(cb => { cb.checked = e.target.checked; });
            });
            document.querySelectorAll('.dailySummaryDriver').forEach(cb => {
                cb.addEventListener('change', () => {
                    const anyUnchecked = [...document.querySelectorAll('.dailySummaryDriver')].some(c => !c.checked);
                    document.getElementById('dailySummaryAll').checked = !anyUnchecked;
                });
            });

            document.getElementById('btnDailySummary')?.addEventListener('click', async () => {
                const dateFrom = document.getElementById('dailySummaryFrom').value;
                let dateTo = document.getElementById('dailySummaryTo').value;
                if (!dateTo || dateTo < dateFrom) dateTo = dateFrom;
                const useAll = document.getElementById('dailySummaryAll')?.checked;
                const driverIds = useAll ? [] : [...document.querySelectorAll('.dailySummaryDriver:checked')].map(c => c.value);
                try {
                    const report = await window.api.reports.dailySummary(dateFrom, dateTo, driverIds);
                    currentDailySummaryReport = report;
                    const content = document.getElementById('dailySummaryContent');
                    const actions = document.getElementById('dailySummaryActions');
                    if (!report.rows.length) {
                        content.innerHTML = '<div class="report-empty">لا توجد بيانات في الفترة المحددة</div>';
                        actions.style.display = 'none';
                        return;
                    }
                    actions.style.display = 'flex';
                    content.innerHTML = `
                        <div class="report-view">
                            <div class="report-view-title">التقرير الملخص - ${dateFrom} إلى ${dateTo}</div>
                            <div class="report-table-wrap report-table-wrap--scrollable report-table-wrap--compact">
                                <table class="report-table report-table--compact">
                                    <thead><tr>
                                        <th>التاريخ</th><th>السائق</th><th>عدد الطلبات</th><th>مرتجعات</th>
                                        <th>إجمالي الفواتير</th><th>أجور التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th>
                                        <th>سداد الأجور</th><th>مجاني</th><th>غير مجاني</th><th>تفصيل الأجور</th>
                                    </tr></thead>
                                    <tbody>
                                        ${report.rows.map(r => {
                                            const freeDetail = Object.entries(r.freeDeliveryBreakdown || {})
                                                .sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))
                                                .map(([amt,c]) => 'مجاني '+formatIQD(amt)+': '+c).join(' | ');
                                            const paidDetail = Object.entries(r.deliveryFeeBreakdown || {})
                                                .sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))
                                                .map(([fee,c]) => formatIQD(fee)+': '+c).join(' | ');
                                            const feeDetail = [freeDetail, paidDetail].filter(Boolean).join(' | ') || '-';
                                            return `<tr>
                                                <td>${r.orderDate}</td><td>${(r.driverName||'').replace(/</g,'&lt;')}</td>
                                                <td>${r.count}</td><td>${r.countReturned}</td>
                                                <td class="iqd">${formatIQD(r.totalAmount)}</td><td class="iqd">${formatIQD(r.totalDelivery)}</td>
                                                <td class="iqd iqd-total">${formatIQD(r.net)}</td><td class="iqd">${formatIQD(r.totalDue)}</td>
                                                <td><span class="badge ${r.feesCollected ? 'badge-delivered' : 'badge-new'}">${r.feesCollected ? 'تم' : 'لم يُسد'}</span></td>
                                                <td>${r.countFreeDelivery}</td><td>${r.countPaidDelivery}</td>
                                                <td style="font-size:0.85rem;max-width:180px" title="${feeDetail.replace(/"/g,'&quot;')}">${feeDetail}</td>
                                            </tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                        </div>
                    </div>
                `;
                } catch (err) {
                    document.getElementById('dailySummaryContent').innerHTML = `<div class="scan-feedback error">${err?.message || 'فشل تحميل التقرير'}</div>`;
                    document.getElementById('dailySummaryActions').style.display = 'none';
                }
            });

            let currentDailySummaryReport = null;
            document.getElementById('btnDailySummaryPDF')?.addEventListener('click', async () => {
                if (!currentDailySummaryReport) return;
                try {
                    await window.api.reports.dailySummaryReportPDF(currentDailySummaryReport);
                } catch (err) {
                    await showMsg('فشل التصدير: ' + (err?.message || err));
                }
            });

            let currentDriverReport = null;

            document.getElementById('btnDriverReport').addEventListener('click', async () => {
                const driverId = document.getElementById('reportDriver').value;
                const dateFrom = document.getElementById('reportDateFrom').value;
                let dateTo = document.getElementById('reportDateTo').value;
                if (!dateTo || dateTo < dateFrom) dateTo = dateFrom;
                const report = await window.api.reports.driverByRange(parseInt(driverId), dateFrom, dateTo);
                currentDriverReport = report;

                const content = document.getElementById('driverReportContent');
                const actions = document.getElementById('driverReportActions');

                if (!report || report.orders.length === 0) {
                    content.innerHTML = '<div class="report-empty">لا توجد طلبات لهذا السائق في الفترة المحددة</div>';
                    actions.style.display = 'none';
                    return;
                }

                const driverAmt = o => o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);
                content.innerHTML = `
                    <div class="report-view">
                        <div class="report-view-title">تقرير السائق - ${report.driver.DriverName}${report.driver.Phone ? ' | ' + report.driver.Phone : ''}</div>
                        <div class="report-summary-cards">
                            <div class="report-summary-card"><div class="label">التاريخ</div><div class="value">${report.date}</div></div>
                            <div class="report-summary-card"><div class="label">عدد الطلبات</div><div class="value">${report.count}</div></div>
                            <div class="report-summary-card"><div class="label">عدد المرتجعات</div><div class="value">${report.countReturned || 0}</div></div>
                            <div class="report-summary-card"><div class="label">إجمالي الفواتير</div><div class="value">${formatIQD(report.totalAmount)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--system">
                                <div class="label">سعر النظام</div>
                                <div class="value">${formatIQD(report.systemInvoiceTotal || 0)}</div>
                            </div>
                            <div class="report-summary-card"><div class="label">أجور التوصيل</div><div class="value">${formatIQD(report.totalDelivery)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ النهائي</div><div class="value">${formatIQD(report.net)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ المستحق</div><div class="value">${formatIQD(report.totalDue)} د.ع</div></div>
                        </div>
                        <div class="report-section-title">إحصائيات أجور التوصيل</div>
                        <div class="report-summary-cards report-fee-cards">
                            <div class="report-summary-card"><div class="label">مجاني</div><div class="value">${report.countFreeDelivery || 0}</div></div>
                            <div class="report-summary-card"><div class="label">غير مجاني</div><div class="value">${report.countPaidDelivery || 0}</div></div>
                            ${Object.entries(report.freeDeliveryBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([amt,c]) => `<div class="report-summary-card"><div class="label">مجاني أجر ${formatIQD(amt)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                            ${Object.entries(report.deliveryFeeBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([fee,c]) => `<div class="report-summary-card"><div class="label">أجر ${formatIQD(fee)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                        </div>
                        <div class="report-section-title">تفاصيل الطلبات <span class="report-count-badge">${report.orders.length} طلب</span></div>
                        <div class="report-table-wrap report-table-wrap--scrollable report-table-wrap--orders">
                            <table class="report-table report-table--orders">
                                <thead><tr><th>الحالة</th><th>رقم</th><th>الشحنة</th><th>المتجر</th><th>المستلم</th><th>هاتف</th><th class="col-address">العنوان</th><th>رابط</th><th>قطع</th><th>فاتورة</th><th>توصيل</th><th>نهائي</th><th>مستحق</th><th>سداد</th><th>طبع</th><th>استلام</th><th>أنشأه</th><th class="col-notes">ملاحظات</th></tr></thead>
                                <tbody>
                                    ${report.orders.map(o => {
                                        const returned = isOrderReturned(o);
                                        const statusTxt = STATUS_MAP[o.Status || o.status] || (o.Status || o.status) || '-';
                                        const labelPrinted = o.LabelPrinted ? 'تم' : 'لم يُطبع';
                                        const receiveTxt = returned ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';
                                        return `<tr class="${returned ? 'order-returned' : ''}">
                                            <td>${statusTxt}</td>
                                            <td>${o.AdminOrderNo || '-'}</td>
                                            <td>${o.ShipmentNumber}</td>
                                            <td>${o.StoreName || '-'}</td>
                                            <td>${o.CustomerName || '-'}</td>
                                            <td>${o.CustomerPhone || '-'}</td>
                                            <td class="col-address"><span class="report-cell-multiline">${escapeHtml(getFullAddress(o))}</span></td>
                                            <td>${o.CustomerLocationLink ? `<a href="${(o.CustomerLocationLink || '').replace(/"/g, '&quot;')}" target="_blank" rel="noopener" title="فتح رابط الموقع">📍 فتح</a>` : '-'}</td>
                                            <td>${o.Pieces || 1}</td>
                                            <td class="iqd">${formatIQD(o.AmountIQD)}</td>
                                            <td class="iqd">${o.FreeDelivery ? 'مجاني ' + formatIQD(driverAmt(o)) : formatIQD(driverAmt(o))}</td>
                                            <td class="iqd iqd-total">${formatIQD(o.TotalIQD)}</td>
                                            <td class="iqd">${formatIQD(getAmountDue(o))}</td>
                                            <td><span class="badge ${o.FeesCollected ? 'badge-delivered' : 'badge-new'}">${o.FeesCollected ? 'تم' : 'لم يُسد'}</span></td>
                                            <td><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'}">${labelPrinted}</span></td>
                                            <td><span class="badge ${returned ? (o.ReturnedOrderReceived ? 'badge-delivered' : 'badge-returned') : ''}" title="${returned ? (o.ReturnedOrderReceived ? 'تم استلامه عند الشركة' : 'لم يُسلّم للشركة بعد') : ''}">${receiveTxt}</span></td>
                                            <td>${(o.CreatedByName || '-').toString().replace(/</g, '&lt;')}</td>
                                            <td class="col-notes" title="${escapeHtml((o.Notes || '').toString())}"><span class="report-cell-multiline">${(o.Notes && String(o.Notes).trim()) ? escapeHtml(o.Notes) : '-'}</span></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                actions.style.display = 'flex';
            });

            let currentEmployeeReport = null;
            document.getElementById('btnEmployeeReport')?.addEventListener('click', async () => {
                const employeeId = document.getElementById('reportEmployee').value;
                const dateFrom = document.getElementById('employeeDateFrom').value;
                let dateTo = document.getElementById('employeeDateTo').value;
                if (!employeeId) {
                    await showMsg('اختر موظفاً');
                    return;
                }
                if (!dateTo || dateTo < dateFrom) dateTo = dateFrom;
                const report = await window.api.reports.employeeByRange(parseInt(employeeId, 10), dateFrom, dateTo);
                currentEmployeeReport = report;

                const content = document.getElementById('employeeReportContent');
                const actions = document.getElementById('employeeReportActions');
                const driverAmt = o => o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);

                if (!report || report.orders.length === 0) {
                    content.innerHTML = '<div class="report-empty">لا توجد طلبات لهذا الموظف في الفترة المحددة</div>';
                    actions.style.display = 'none';
                    return;
                }

                content.innerHTML = `
                    <div class="report-view">
                        <div class="report-view-title">تقرير الموظف - ${escapeHtml(report.employeeName || report.employee?.DisplayName || '')}</div>
                        <div class="report-summary-cards">
                            <div class="report-summary-card"><div class="label">التاريخ</div><div class="value">${report.date}</div></div>
                            <div class="report-summary-card"><div class="label">عدد الطلبات</div><div class="value">${report.count}</div></div>
                            <div class="report-summary-card"><div class="label">عدد المرتجعات</div><div class="value">${report.countReturned || 0}</div></div>
                            <div class="report-summary-card"><div class="label">إجمالي الفواتير</div><div class="value">${formatIQD(report.totalAmount)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--system">
                                <div class="label">سعر النظام</div>
                                <div class="value">${formatIQD(report.systemInvoiceTotal || 0)}</div>
                            </div>
                            <div class="report-summary-card"><div class="label">أجور التوصيل</div><div class="value">${formatIQD(report.totalDelivery)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ النهائي</div><div class="value">${formatIQD(report.net)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ المستحق</div><div class="value">${formatIQD(report.totalDue)} د.ع</div></div>
                        </div>
                        <div class="report-section-title">إحصائيات أجور التوصيل</div>
                        <div class="report-summary-cards report-fee-cards">
                            <div class="report-summary-card"><div class="label">مجاني</div><div class="value">${report.countFreeDelivery || 0}</div></div>
                            <div class="report-summary-card"><div class="label">غير مجاني</div><div class="value">${report.countPaidDelivery || 0}</div></div>
                            ${Object.entries(report.freeDeliveryBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([amt,c]) => `<div class="report-summary-card"><div class="label">مجاني أجر ${formatIQD(amt)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                            ${Object.entries(report.deliveryFeeBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([fee,c]) => `<div class="report-summary-card"><div class="label">أجر ${formatIQD(fee)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                        </div>
                        <div class="report-section-title">تفاصيل الطلبات <span class="report-count-badge">${report.orders.length} طلب</span></div>
                        <div class="report-table-wrap report-table-wrap--scrollable report-table-wrap--orders">
                            <table class="report-table report-table--orders">
                                <thead><tr><th>الحالة</th><th>رقم</th><th>الشحنة</th><th>السائق</th><th>المتجر</th><th>المستلم</th><th>هاتف</th><th class="col-address">العنوان</th><th>قطع</th><th>فاتورة</th><th>توصيل</th><th>نهائي</th><th>مستحق</th><th>طبع</th><th class="col-notes">ملاحظات</th></tr></thead>
                                <tbody>
                                    ${report.orders.map(o => {
                                        const returned = isOrderReturned(o);
                                        const statusTxt = STATUS_MAP[o.Status || o.status] || (o.Status || o.status) || '-';
                                        const labelPrinted = o.LabelPrinted ? 'تم' : 'لم يُطبع';
                                        return `<tr class="${returned ? 'order-returned' : ''}">
                                            <td>${statusTxt}</td>
                                            <td>${o.AdminOrderNo || '-'}</td>
                                            <td>${o.ShipmentNumber}</td>
                                            <td>${escapeHtml(o.DriverName || '—')}</td>
                                            <td>${o.StoreName || '-'}</td>
                                            <td>${o.CustomerName || '-'}</td>
                                            <td>${o.CustomerPhone || '-'}</td>
                                            <td class="col-address"><span class="report-cell-multiline">${escapeHtml(getFullAddress(o))}</span></td>
                                            <td>${o.Pieces || 1}</td>
                                            <td class="iqd">${formatIQD(o.AmountIQD)}</td>
                                            <td class="iqd">${o.FreeDelivery ? 'مجاني ' + formatIQD(driverAmt(o)) : formatIQD(driverAmt(o))}</td>
                                            <td class="iqd iqd-total">${formatIQD(o.TotalIQD)}</td>
                                            <td class="iqd">${formatIQD(getAmountDue(o))}</td>
                                            <td><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'}">${labelPrinted}</span></td>
                                            <td class="col-notes" title="${escapeHtml((o.Notes || '').toString())}"><span class="report-cell-multiline">${(o.Notes && String(o.Notes).trim()) ? escapeHtml(o.Notes) : '-'}</span></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                actions.style.display = 'flex';
            });

            document.getElementById('btnPrintEmployeeReport')?.addEventListener('click', () => {
                if (!currentEmployeeReport) return;
                const w = window.open('', 'printEmployeeReport', 'width=800,height=700,scrollbars=yes,resizable=yes');
                if (!w) return;
                const da = o => o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);
                w.document.write(`
                    <html dir="rtl"><head><title>تقرير الموظف</title>
                    <style>body{font-family:Tahoma,Arial,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{background:#eee}</style>
                    </head><body>
                    <h2>تقرير الموظف - ${(currentEmployeeReport.employeeName || '').replace(/</g, '&lt;')}</h2>
                    <p>التاريخ: ${currentEmployeeReport.date} | الطلبات: ${currentEmployeeReport.count} | المستحق: ${formatIQD(currentEmployeeReport.totalDue)} د.ع</p>
                    <table>
                    <tr><th>رقم الطلب</th><th>رقم الشحنة</th><th>السائق</th><th>اسم المستلم</th><th>مبلغ التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th><th>الطباعة</th><th>ملاحظات</th></tr>
                    ${currentEmployeeReport.orders.map(o => {
                        return `<tr><td>${o.AdminOrderNo || '-'}</td><td>${o.ShipmentNumber}</td><td>${o.DriverName || '-'}</td><td>${o.CustomerName}</td><td>${o.FreeDelivery ? 'مجاني ' + formatIQD(da(o)) : formatIQD(da(o))}</td><td>${formatIQD(o.TotalIQD)}</td><td>${formatIQD(getAmountDue(o))}</td><td>${o.LabelPrinted ? 'تم' : 'لم يُطبع'}</td><td>${(o.Notes || '-').toString().replace(/</g, '&lt;')}</td></tr>`;
                    }).join('')}
                    </table></body></html>
                `);
                w.document.close();
                w.print();
            });

            document.getElementById('btnExportEmployeePDF')?.addEventListener('click', async () => {
                if (!currentEmployeeReport) return;
                try {
                    await window.api.reports.employeeReportPDF(currentEmployeeReport);
                    await showMsg('تم تصدير التقرير بنجاح');
                } catch (err) {
                    await showMsg('فشل التصدير: ' + (err?.message || err), 'خطأ');
                }
            });

            let currentCompanyReport = null;
            const driverAmt = o => o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);
            document.getElementById('btnCompanyReport').addEventListener('click', async () => {
                const dateFrom = document.getElementById('companyDateFrom').value;
                let dateTo = document.getElementById('companyDateTo').value;
                if (!dateTo || dateTo < dateFrom) dateTo = dateFrom;
                const report = await window.api.reports.companyByRange(dateFrom, dateTo);
                currentCompanyReport = report;

                const grandTotal = report.summary.reduce((s, x) => s + x.net, 0);
                const grandDue = report.summary.reduce((s, x) => s + (x.totalDue || 0), 0);
                const allOrders = report.summary.flatMap(s => s.orders);
                const hasAnyOrders = (report.totalOrders || 0) > 0 || (report.totalReturned || 0) > 0;

                document.getElementById('companyReportContent').innerHTML = !hasAnyOrders
                    ? '<div class="report-empty">لا توجد طلبات في الفترة المحددة</div>'
                    : `
                    <div class="report-view">
                        <div class="report-view-title">التقرير العام - ${report.date}</div>
                        <div class="report-summary-cards">
                            <div class="report-summary-card"><div class="label">إجمالي الطلبات</div><div class="value">${report.totalOrders}</div></div>
                            <div class="report-summary-card"><div class="label">عدد المرتجعات</div><div class="value">${report.totalReturned || 0}</div></div>
                            <div class="report-summary-card"><div class="label">عدد السائقين</div><div class="value">${report.summary.length}</div></div>
                            <div class="report-summary-card"><div class="label">إجمالي الفواتير</div><div class="value">${formatIQD(report.summary.reduce((a,x)=>a+x.totalAmount,0))} د.ع</div></div>
                            <div class="report-summary-card"><div class="label">أجور التوصيل</div><div class="value">${formatIQD(report.summary.reduce((a,x)=>a+x.totalDelivery,0))} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ النهائي</div><div class="value">${formatIQD(grandTotal)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ المستحق</div><div class="value">${formatIQD(grandDue)} د.ع</div></div>
                        </div>
                        <div class="report-section-title">إحصائيات أجور التوصيل</div>
                        <div class="report-summary-cards report-fee-cards">
                            <div class="report-summary-card"><div class="label">مجاني</div><div class="value">${report.countFreeDelivery || 0}</div></div>
                            <div class="report-summary-card"><div class="label">غير مجاني</div><div class="value">${report.countPaidDelivery || 0}</div></div>
                            ${Object.entries(report.freeDeliveryBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([amt,c]) => `<div class="report-summary-card"><div class="label">مجاني أجر ${formatIQD(amt)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                            ${Object.entries(report.deliveryFeeBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([fee,c]) => `<div class="report-summary-card"><div class="label">أجر ${formatIQD(fee)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                        </div>
                        <div class="report-section-title">ملخص حسب السائق</div>
                        <div class="report-table-wrap report-table-wrap--scrollable report-table-wrap--compact">
                            <table class="report-table report-table--compact">
                                <thead><tr><th>اسم السائق</th><th>عدد الطلبات</th><th>عدد المرتجعات</th><th>إجمالي الفواتير</th><th>أجور التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th></tr></thead>
                                <tbody>
                                    ${report.summary.map(s => `
                                        <tr>
                                            <td>${s.driverName}</td>
                                            <td>${s.count}</td>
                                            <td>${s.countReturned || 0}</td>
                                            <td class="iqd">${formatIQD(s.totalAmount)}</td>
                                            <td class="iqd">${formatIQD(s.totalDelivery)}</td>
                                            <td class="iqd iqd-total">${formatIQD(s.net)}</td>
                                            <td class="iqd">${formatIQD(s.totalDue)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="report-details-section">
                            <div class="report-section-title">تفاصيل الطلبات <span class="report-count-badge">${allOrders.length} طلب</span></div>
                            <div class="report-table-wrap report-table-wrap--scrollable report-table-wrap--orders">
                                <table class="report-table report-table--orders">
                                <thead><tr><th>الحالة</th><th>رقم</th><th>الشحنة</th><th>السائق</th><th>المتجر</th><th>المستلم</th><th>هاتف</th><th class="col-address">العنوان</th><th>فاتورة</th><th>توصيل</th><th>نهائي</th><th>مستحق</th><th>سداد</th><th>طبع</th><th>استلام</th><th>أنشأه</th><th class="col-notes">ملاحظات الطلب</th><th class="col-notes">سبب الإرجاع</th></tr></thead>
                                <tbody>
                                    ${allOrders.map(o => {
                                        const returned = isOrderReturned(o);
                                        const statusTxt = STATUS_MAP[o.Status || o.status] || (o.Status || o.status) || '-';
                                        const labelPrinted = o.LabelPrinted ? 'تم' : 'لم يُطبع';
                                        const receiveTxt = returned ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';
                                        const esc = (t) => (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                        const notesCell = (o.Notes && String(o.Notes).trim()) ? esc(o.Notes) : '-';
                                        const returnReasonCell = returned ? esc((o.ReturnReason || '').trim() || '-') : '-';
                                        const addrCell = `<span class="report-cell-multiline">${esc(getFullAddress(o))}</span>`;
                                        return `<tr class="${returned ? 'order-returned' : ''}">
                                            <td>${statusTxt}</td>
                                            <td>${o.AdminOrderNo || '-'}</td>
                                            <td>${o.ShipmentNumber}</td>
                                            <td>${o.DriverName || 'غير معين'}</td>
                                            <td>${o.StoreName || '-'}</td>
                                            <td>${o.CustomerName || '-'}</td>
                                            <td>${o.CustomerPhone || '-'}</td>
                                            <td class="col-address">${addrCell}</td>
                                            <td class="iqd">${formatIQD(o.AmountIQD)}</td>
                                            <td class="iqd">${o.FreeDelivery ? 'مجاني ' + formatIQD(driverAmt(o)) : formatIQD(driverAmt(o))}</td>
                                            <td class="iqd iqd-total">${formatIQD(o.TotalIQD)}</td>
                                            <td class="iqd">${formatIQD(getAmountDue(o))}</td>
                                            <td><span class="badge ${o.FeesCollected ? 'badge-delivered' : 'badge-new'}">${o.FeesCollected ? 'تم' : 'لم يُسد'}</span></td>
                                            <td><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'}">${labelPrinted}</span></td>
                                            <td><span class="badge ${returned ? (o.ReturnedOrderReceived ? 'badge-delivered' : 'badge-returned') : ''}" title="${returned ? (o.ReturnedOrderReceived ? 'تم استلامه عند الشركة' : 'لم يُسلّم للشركة بعد') : ''}">${receiveTxt}</span></td>
                                            <td>${(o.CreatedByName || '-').toString().replace(/</g, '&lt;')}</td>
                                            <td class="col-notes" title="${esc(o.Notes || '')}"><span class="report-cell-multiline">${notesCell}</span></td>
                                            <td class="col-notes" title="${returned ? esc((o.ReturnReason || '').trim()) : ''}"><span class="report-cell-multiline">${returnReasonCell}</span></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                `;
                document.getElementById('companyReportActions').style.display = hasAnyOrders ? 'flex' : 'none';
            });

            document.getElementById('btnPrintDriverReport').addEventListener('click', () => {
                if (currentDriverReport) {
                    const da = o => o.FreeDelivery ? (o.WaivedDeliveryIQD || 0) : (o.DeliveryFeeIQD || 0);
                    const w = window.open('', '_blank');
                    w.document.write(`
                        <html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير السائق</title></head>
                        <body style="font-family:Tajawal,sans-serif;padding:20px">
                        <h2>تقرير السائق اليومي - ${currentDriverReport.driver.DriverName}</h2>
                        <p>التاريخ: ${currentDriverReport.date} | عدد الطلبات: ${currentDriverReport.count}</p>
                        <p>المبلغ النهائي: ${formatIQD(currentDriverReport.net)} د.ع | المبلغ المستحق: ${formatIQD(currentDriverReport.totalDue)} د.ع</p>
                        <table border="1" style="width:100%;border-collapse:collapse;margin-top:16px">
                        <tr><th>رقم الطلب</th><th>رقم الشحنة</th><th>اسم المستلم</th><th>مبلغ التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th><th>الطباعة</th><th>استلام</th><th>أنشأه</th></tr>
                        ${currentDriverReport.orders.map(o => {
                            const ret = isOrderReturned(o);
                            const rec = ret ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';
                            return `<tr><td>${o.AdminOrderNo || '-'}</td><td>${o.ShipmentNumber}</td><td>${o.CustomerName}</td><td>${o.FreeDelivery ? 'مجاني ' + formatIQD(da(o)) : formatIQD(da(o))}</td><td>${formatIQD(o.TotalIQD)}</td><td>${formatIQD(getAmountDue(o))}</td><td>${o.LabelPrinted ? 'تم' : 'لم يُطبع'}</td><td>${rec}</td><td>${o.CreatedByName || '-'}</td></tr>`;
                        }).join('')}
                        </table>
                        </body></html>
                    `);
                    w.document.close();
                    w.print();
                }
            });

            document.getElementById('btnExportDriverPDF').addEventListener('click', async () => {
                if (!currentDriverReport) return;
                const pdf = await window.api.reports.driverReportPDF(currentDriverReport);
                const name = `تقرير-سائق-${currentDriverReport.driver.DriverName}-${currentDriverReport.date}.pdf`;
                const res = await window.api.reports.savePDF({ base64: pdf, defaultName: name });
                if (res.saved) await showMsg('تم حفظ الملف: ' + res.path);
            });

            document.getElementById('btnExportCompanyPDF').addEventListener('click', async () => {
                if (!currentCompanyReport) return;
                const btn = document.getElementById('btnExportCompanyPDF');
                const origText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="btn-loading">جاري التصدير...</span>';
                try {
                    await window.api.reports.companyReportPDF(currentCompanyReport);
                    await showMsg('تم تصدير التقرير بنجاح');
                } catch (err) {
                    await showMsg('فشل التصدير: ' + (err?.message || err), 'خطأ');
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = origText;
                }
            });
        }
    },

    settings: {
        async render(container) {
            let defaults = { storeName: localStorage.getItem('defaultStoreName') || '', storePhone: localStorage.getItem('defaultStorePhone') || '', dayStartHour: 0 };
            try {
                const s = await window.api.settings.getDefaults();
                if (s.storeName || s.storePhone || s.dayStartHour !== undefined) defaults = { ...defaults, ...s };
                else if (defaults.storeName || defaults.storePhone) {
                    window.api.settings.updateDefaults(defaults).catch(() => {});
                }
            } catch (_) {}
            let regions = [];
            try {
                regions = await window.api.regions.getAll();
            } catch (_) {}
            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const initialTab = container.dataset.initialTab || 'regions';
            container.innerHTML = `
                <div class="screen active settings-screen settings-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-gear-wide-connected',
                        title: 'الإعدادات',
                        subtitle: 'المناطق، القيم الافتراضية، التوقيت، ومعلومات النظام',
                        variant: 'slate'
                    })}
                    ${renderUxSubnav([
                        { id: 'regions', label: 'المناطق', icon: 'bi-geo-alt' },
                        { id: 'defaults', label: 'القيم الافتراضية', icon: 'bi-sliders' },
                        { id: 'time', label: 'التوقيت', icon: 'bi-clock' },
                        { id: 'about', label: 'حول النظام', icon: 'bi-info-circle' }
                    ], initialTab)}
                    <div class="settings-layout">
                        <main class="settings-panel ux-panel-stack">
                            <section class="settings-pane settings-pane-regions" id="settings-pane-regions">
                                <div class="settings-pane-hero">
                                    <div class="settings-pane-icon-wrap"><i class="bi bi-geo-alt-fill"></i></div>
                                    <h2 class="settings-pane-title">المناطق وتكلفة التوصيل</h2>
                                    <p class="settings-pane-lead">أضف المناطق وتكلفة توصيل كل منطقة. تظهر في قائمة منسدلة عند إدخال الطلب.</p>
                                </div>
                                <div class="settings-form-card">
                                    <div class="settings-form-header"><i class="bi bi-plus-circle"></i><span>إضافة منطقة جديدة</span></div>
                                    <div class="settings-add-region">
                                        <div class="settings-field">
                                            <label>اسم المنطقة</label>
                                            <input type="text" id="newRegionName" placeholder="مثال: الكرادة">
                                        </div>
                                        <div class="settings-field">
                                            <label>الجانب</label>
                                            <select id="newRegionArea">
                                                <option value="الكرخ">الكرخ</option>
                                                <option value="الرصافة">الرصافة</option>
                                            </select>
                                        </div>
                                        <div class="settings-field">
                                            <label>تكلفة التوصيل (د.ع)</label>
                                            <input type="number" id="newRegionFee" min="0" placeholder="0">
                                        </div>
                                        <button type="button" class="btn settings-action-btn" id="btnAddRegion"><i class="bi bi-plus-lg"></i><span>إضافة</span></button>
                                    </div>
                                </div>
                                <div class="settings-table-card">
                                    <div class="settings-table-header"><i class="bi bi-list-ul"></i><span>قائمة المناطق</span></div>
                                    <div class="settings-table-wrap">
                                        <table class="settings-table">
                                            <thead><tr><th>اسم المنطقة</th><th>الجانب</th><th>تكلفة التوصيل (د.ع)</th><th>إجراء</th></tr></thead>
                                            <tbody>
                                                ${regions.length ? regions.map(r => `
                                                    <tr data-id="${r.RegionID}">
                                                        <td><input type="text" class="edit-region-name" value="${esc(r.RegionName)}" placeholder="اسم المنطقة"></td>
                                                        <td>
                                                            <select class="edit-region-area">
                                                                <option value="الكرخ" ${(r.RegionArea || '') === 'الكرخ' ? 'selected' : ''}>الكرخ</option>
                                                                <option value="الرصافة" ${(r.RegionArea || '') === 'الرصافة' ? 'selected' : ''}>الرصافة</option>
                                                            </select>
                                                        </td>
                                                        <td><input type="number" class="edit-region-fee" value="${r.DeliveryFeeIQD || 0}" min="0"></td>
                                                        <td>
                                                            <div class="cell-actions">
                                                                <button type="button" class="btn btn-primary btn-sm btn-save-region">حفظ</button>
                                                                <button type="button" class="btn btn-sm btn-delete btn-delete-region" data-id="${r.RegionID}" data-name="${esc(r.RegionName)}">حذف</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('') : '<tr><td colspan="4" class="empty-table-msg">لا توجد مناطق. أضف منطقة جديدة أعلاه.</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                            <section class="settings-pane settings-pane-defaults" id="settings-pane-defaults">
                                <div class="settings-pane-hero">
                                    <div class="settings-pane-icon-wrap"><i class="bi bi-sliders"></i></div>
                                    <h2 class="settings-pane-title">القيم الافتراضية للطلبات</h2>
                                    <p class="settings-pane-lead">تُعرض تلقائياً عند إدخال طلب جديد ويمكن تغييرها في نموذج الطلب.</p>
                                </div>
                                <div class="settings-form-card">
                                    <div class="settings-form-header"><i class="bi bi-pencil-square"></i><span>تعديل القيم الافتراضية</span></div>
                                    <div class="settings-defaults-form">
                                        <div class="settings-field">
                                <label>اسم المتجر الافتراضي</label>
                                <input type="text" id="defaultStoreName" value="${(defaults.storeName || '').replace(/"/g, '&quot;')}" placeholder="مثال: متجر ديما الحياة">
                            </div>
                                        <div class="settings-field">
                                <label>هاتف المتجر الافتراضي</label>
                                <input type="text" id="defaultStorePhone" value="${(defaults.storePhone || '').replace(/"/g, '&quot;')}" placeholder="مثال: 07701234567">
                            </div>
                                        <button type="button" class="btn settings-action-btn" id="btnSaveDefaults"><i class="bi bi-check2-circle"></i><span>حفظ القيم الافتراضية</span></button>
                        </div>
                    </div>
                            </section>
                            <section class="settings-pane settings-pane-time" id="settings-pane-time">
                                <div class="settings-pane-hero">
                                    <div class="settings-pane-icon-wrap"><i class="bi bi-clock-fill"></i></div>
                                    <h2 class="settings-pane-title">التوقيت</h2>
                                    <p class="settings-pane-lead">وقت بداية اليوم بتوقيت العراق — يُحدد متى يبدأ اليوم الجديد (للإحصائيات والتقارير)</p>
                                </div>
                                <div class="settings-form-card">
                                    <div class="settings-form-header"><i class="bi bi-sunrise"></i><span>وقت بداية اليوم</span></div>
                                    <div class="settings-defaults-form">
                                        <div class="settings-field">
                                            <label>بداية اليوم (بتوقيت بغداد)</label>
                                            <select id="dayStartHour">
                                                <option value="0" ${(defaults.dayStartHour || 0) == 0 ? 'selected' : ''}>00:00 (منتصف الليل)</option>
                                                <option value="6" ${(defaults.dayStartHour || 0) == 6 ? 'selected' : ''}>06:00 (صبحاً)</option>
                                                <option value="12" ${(defaults.dayStartHour || 0) == 12 ? 'selected' : ''}>12:00 (ظهراً)</option>
                                                <option value="18" ${(defaults.dayStartHour || 0) == 18 ? 'selected' : ''}>18:00 (مساءً)</option>
                                            </select>
                                        </div>
                                        <button type="button" class="btn settings-action-btn" id="btnSaveTime"><i class="bi bi-check2-circle"></i><span>حفظ إعدادات التوقيت</span></button>
                                    </div>
                                </div>
                            </section>
                            <section class="settings-pane settings-pane-about" id="settings-pane-about">
                                <div class="settings-pane-hero">
                                    <div class="settings-pane-icon-wrap"><i class="bi bi-info-circle-fill"></i></div>
                                    <h2 class="settings-pane-title">حول النظام</h2>
                                    <p class="settings-pane-lead">معلومات عن نظام إدارة التوصيل</p>
                                </div>
                                <div class="settings-about-card">
                                    <div class="settings-about-logo"><i class="bi bi-building"></i> شركة ديما الحياة</div>
                                    <p class="settings-about-tagline">نظام إدارة التوصيل</p>
                                    <div class="settings-about-meta">
                                        <span><i class="bi bi-tag"></i> الإصدار 1.0</span>
                                        <span><i class="bi bi-currency-exchange"></i> الدينار العراقي (IQD)</span>
                                    </div>
                                    <div class="settings-about-badges">
                                        <span class="settings-badges-label">حالات الطلبات</span>
                                        <div class="settings-badges-list">
                                            <span class="badge badge-new">جديد</span>
                            <span class="badge badge-assigned">مع السائق</span>
                            <span class="badge badge-delivered">تم التوصيل</span>
                                            <span class="badge badge-returned">راجع</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </main>
                    </div>
                </div>
            `;

            container.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
            container.querySelector(`#settings-pane-${initialTab}`)?.classList.add('active');
            bindUxSubnav(container, {
                paneSelector: '.settings-pane',
                panePrefix: '#settings-pane-'
            });

            document.getElementById('btnSaveDefaults').addEventListener('click', async () => {
                const storeName = document.getElementById('defaultStoreName').value.trim();
                const storePhone = document.getElementById('defaultStorePhone').value;
                localStorage.setItem('defaultStoreName', storeName);
                localStorage.setItem('defaultStorePhone', storePhone);
                try { await window.api.settings.updateDefaults({ storeName, storePhone }); } catch (_) {}
                await showMsg('تم حفظ القيم الافتراضية');
            });
            container.querySelector('#btnSaveTime')?.addEventListener('click', async () => {
                const dayStartHour = parseInt(container.querySelector('#dayStartHour')?.value || '0', 10);
                try {
                    await window.api.settings.updateDefaults({ dayStartHour });
                    await showMsg('تم حفظ إعدادات التوقيت');
                } catch (_) { await showMsg('خطأ في الحفظ'); }
            });

            const refreshRegions = () => screens.settings.render(container);
            container.querySelector('#btnAddRegion')?.addEventListener('click', async () => {
                const name = (container.querySelector('#newRegionName')?.value || '').trim();
                const area = (container.querySelector('#newRegionArea')?.value || 'الرصافة').trim();
                const fee = parseFloat(container.querySelector('#newRegionFee')?.value || 0);
                if (!name) { await showMsg('أدخل اسم المنطقة'); return; }
                try {
                    await window.api.regions.create(name, fee, area);
                    refreshRegions();
                } catch (e) { await showMsg('خطأ: ' + (e?.message || e)); }
            });
            container.querySelector('.settings-table tbody')?.addEventListener('click', async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const row = btn.closest('tr');
                const id = parseInt(row?.dataset?.id);
                if (btn.classList.contains('btn-save-region')) {
                    const name = (row?.querySelector('.edit-region-name')?.value || '').trim();
                    const area = (row?.querySelector('.edit-region-area')?.value || 'الكرخ').trim();
                    const fee = parseFloat(row?.querySelector('.edit-region-fee')?.value || 0);
                    if (!name) { await showMsg('أدخل اسم المنطقة'); return; }
                    try {
                        await window.api.regions.update(id, name, fee, area);
                        refreshRegions();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                } else if (btn.classList.contains('btn-delete-region')) {
                    if (!(await window.api.showConfirm('حذف المنطقة "' + (btn.dataset.name || '') + '"؟'))) return;
                    try {
                        await window.api.regions.delete(id);
                        refreshRegions();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                }
            });
        }
    },

    users: {
        async render(container) {
            let users = [];
            try {
                users = await window.api.users.getAll();
            } catch (err) {
                container.innerHTML = renderUxError('خطأ في تحميل المستخدمين', err?.message || String(err));
                return;
            }
            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            container.innerHTML = `
                <div class="screen active users-screen users-screen--v4">
                    ${renderUxHero({
                        icon: 'bi-people',
                        title: 'إدارة المستخدمين',
                        subtitle: 'إضافة حسابات الموظفين والمديرين مع تحديد الأدوار والصلاحيات',
                        badges: [`${users.length} مستخدم`]
                    })}
                    <div class="users-layout">
                        <div class="users-content">
                            <section class="users-add-section">
                                <div class="users-add-card">
                                    <div class="users-add-head">
                                        <span class="users-add-icon">👤</span>
                                        <h3>إضافة مستخدم جديد</h3>
                                    </div>
                                    <p class="users-add-desc">أضف مستخدماً جديداً للنظام مع تحديد الدور والصلاحيات.</p>
                                    <div class="users-add-form">
                                        <div class="form-group">
                                            <label>اسم المستخدم</label>
                                            <input type="text" id="newUserUsername" placeholder="مثال: employee1">
                                        </div>
                                        <div class="form-group">
                                            <label>كلمة السر</label>
                                            <input type="password" id="newUserPassword" placeholder="كلمة السر">
                                        </div>
                                        <div class="form-group">
                                            <label>الاسم المعروض</label>
                                            <input type="text" id="newUserDisplayName" placeholder="مثال: أحمد محمد">
                                        </div>
                                        <div class="form-group">
                                            <label>الدور</label>
                                            <select id="newUserRole">
                                                <option value="employee">موظف</option>
                                                <option value="admin">مدير</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label>رمز الموظف</label>
                                            <input type="text" id="newUserSecretCode" placeholder="مثال: 1234">
                                        </div>
                                        <button type="button" class="btn btn-primary" id="btnAddUser">إضافة مستخدم</button>
                                    </div>
                                </div>
                            </section>
                            <section class="users-list-section">
                                <div class="users-list-card">
                                    <div class="users-list-head">
                                        <span class="users-list-icon">📋</span>
                                        <h3>قائمة المستخدمين</h3>
                                    </div>
                                    <p class="users-list-desc">إدارة المستخدمين وتعديل الأدوار والحالة.</p>
                                    ${users.length > 0 ? `
                                    <div class="users-table-wrap">
                                        <table class="users-table">
                                            <thead>
                                                <tr><th>اسم المستخدم</th><th>الاسم المعروض</th><th>الدور</th><th>رمز الموظف</th><th>الحالة</th><th>إجراء</th></tr>
                                            </thead>
                                            <tbody>
                                                ${users.map(u => `
                                                    <tr data-id="${u.UserID}" class="${u.Active ? '' : 'user-inactive'}">
                                                        <td><strong class="users-username">${esc(u.Username)}</strong></td>
                                                        <td><input type="text" class="edit-display-name" value="${esc(u.DisplayName || '')}" placeholder="الاسم المعروض"></td>
                                                        <td>
                                                            <select class="edit-role">
                                                                <option value="employee" ${u.Role === 'employee' ? 'selected' : ''}>موظف</option>
                                                                <option value="admin" ${u.Role === 'admin' ? 'selected' : ''}>مدير</option>
                                                            </select>
                                                        </td>
                                                        <td><input type="text" class="edit-secret-code" value="${esc(u.SecretCode || '')}" placeholder="رمز الموظف"></td>
                                                        <td><label class="checkbox-label"><input type="checkbox" class="edit-active" ${u.Active ? 'checked' : ''}> نشط</label></td>
                                                        <td>
                                                            <div class="cell-actions">
                                                                <button type="button" class="btn btn-primary btn-sm btn-save-user">حفظ</button>
                                                                <button type="button" class="btn btn-sm btn-delete btn-delete-user" data-id="${u.UserID}" data-username="${esc(u.Username)}">حذف</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                    ` : '<div class="users-empty"><span class="users-empty-icon">👥</span><p>لا يوجد مستخدمون. أضف مستخدماً جديداً أعلاه.</p></div>'}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            `;
            const refresh = () => this.render(container);
            container.querySelector('#btnAddUser')?.addEventListener('click', async () => {
                const username = (container.querySelector('#newUserUsername').value || '').trim();
                const password = (container.querySelector('#newUserPassword').value || '').trim();
                const displayName = (container.querySelector('#newUserDisplayName').value || '').trim();
                const role = container.querySelector('#newUserRole').value;
                const secretCode = (container.querySelector('#newUserSecretCode').value || '').trim() || undefined;
                if (!username || !password) { await showMsg('أدخل اسم المستخدم وكلمة السر'); return; }
                try {
                    await window.api.users.create(username, password, displayName, role, secretCode);
                    container.querySelector('#newUserUsername').value = '';
                    container.querySelector('#newUserPassword').value = '';
                    container.querySelector('#newUserDisplayName').value = '';
                    container.querySelector('#newUserSecretCode').value = '';
                    refresh();
                } catch (e) { await showMsg('خطأ: ' + (e?.message || e)); }
            });
            container.querySelector('.users-table tbody')?.addEventListener('click', async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const row = btn.closest('tr');
                const id = parseInt(row?.dataset?.id);
                if (btn.classList.contains('btn-save-user')) {
                    const data = {
                        displayName: row.querySelector('.edit-display-name')?.value?.trim(),
                        role: row.querySelector('.edit-role')?.value,
                        secretCode: (row.querySelector('.edit-secret-code')?.value || '').trim() || null,
                        active: row.querySelector('.edit-active')?.checked ?? true
                    };
                    const pw = prompt('كلمة سر جديدة (اترك فارغاً للإبقاء على الحالية):');
                    if (pw !== null && pw) data.password = pw;
                    try {
                        await window.api.users.update(id, data);
                        refresh();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                } else if (btn.classList.contains('btn-delete-user')) {
                    if (!(await window.api.showConfirm('حذف المستخدم "' + (btn.dataset.username || '') + '"؟'))) return;
                    try {
                        await window.api.users.delete(id);
                        refresh();
                    } catch (err) { await showMsg('خطأ: ' + (err?.message || err)); }
                }
            });
        }
    }
};

const SIDEBAR_STORAGE = 'appSidebarCollapsed';
const MOBILE_NAV_MQ = window.matchMedia('(max-width: 900px)');

function isMobileNav() {
    return MOBILE_NAV_MQ.matches;
}

function setMobileNavOpen(open) {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    if (open) {
        appBody.classList.remove('sidebar-collapsed');
        appBody.classList.add('mobile-nav-open');
    } else {
        appBody.classList.add('sidebar-collapsed');
        appBody.classList.remove('mobile-nav-open');
        if (!isMobileNav()) {
            localStorage.setItem(SIDEBAR_STORAGE, '1');
        }
    }
}

function applySidebarForViewport() {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    if (isMobileNav()) {
        appBody.classList.add('sidebar-collapsed');
        appBody.classList.remove('mobile-nav-open');
    } else {
        appBody.classList.remove('mobile-nav-open');
        const saved = localStorage.getItem(SIDEBAR_STORAGE);
        if (saved === '1') appBody.classList.add('sidebar-collapsed');
        else appBody.classList.remove('sidebar-collapsed');
    }
}

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    if (isMobileNav()) {
        const willOpen = appBody.classList.contains('sidebar-collapsed');
        setMobileNavOpen(willOpen);
        return;
    }
    const collapsed = appBody.classList.toggle('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_STORAGE, collapsed ? '1' : '0');
});

document.getElementById('appBody')?.addEventListener('click', (e) => {
    const appBody = document.getElementById('appBody');
    if (!appBody || !isMobileNav() || !appBody.classList.contains('mobile-nav-open')) return;
    if (e.target.closest('.sidebar') || e.target.closest('.sidebar-toggle')) return;
    setMobileNavOpen(false);
});

document.getElementById('mainNav')?.addEventListener('click', (e) => {
    if (!isMobileNav()) return;
    const link = e.target.closest('a.nav-item');
    if (link) setMobileNavOpen(false);
});

MOBILE_NAV_MQ.addEventListener('change', () => {
    applySidebarForViewport();
    const container = document.getElementById('screen-container');
    if (container?.dataset.currentScreen) {
        updateDesktopChrome(container.dataset.currentScreen, container.dataset.initialTab || '');
    }
});
applySidebarForViewport();

document.getElementById('btnRefreshScreen')?.addEventListener('click', () => {
    const container = document.getElementById('screen-container');
    const screenId = container?.dataset.currentScreen;
    const subTab = container?.dataset.initialTab || '';
    if (!screenId) return;
    if (screenId === 'dashboard') invalidateDashboardCache();
    if (screenId === 'drivers') invalidateDriversCache();
    invalidateScreenCache(screenId);
    showScreen(screenId, subTab || undefined, { force: true });
});

const MOBILE_SCREEN_TITLES = {
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    'new-order': 'طلب جديد',
    drivers: 'السائقين',
    'driver-receive': 'استلام الطلبات',
    'support-sections': 'أقسام سانده',
    'receive-returned': 'استلام الراجع',
    reports: 'التقارير',
    users: 'المستخدمين',
    settings: 'الإعدادات'
};

const DESKTOP_SCREEN_SUBTITLES = {
    reports: {
        collect: 'استحصال الأجور',
        daily: 'التقرير الملخص',
        driver: 'تقرير السائق',
        employee: 'تقرير الموظف',
        company: 'التقرير العام'
    },
    settings: {
        regions: 'إدارة المناطق',
        defaults: 'القيم الافتراضية',
        time: 'إعدادات التوقيت',
        about: 'حول النظام'
    },
    'support-sections': {
        'driver-return': 'تبديل السائق',
        'driver-returned': 'طلب راجع'
    }
};

function updateDesktopChrome(screenId, subTab) {
    const topbar = document.getElementById('contentTopbar');
    if (!topbar) return;
    topbar.hidden = isMobileNav();
    const titleEl = document.getElementById('contentTopbarTitle');
    const subtitleEl = document.getElementById('contentTopbarSubtitle');
    const crumbEl = document.getElementById('contentTopbarCrumb');
    const mainTitle = MOBILE_SCREEN_TITLES[screenId] || 'ديما الحياة';
    const sub = subTab && DESKTOP_SCREEN_SUBTITLES[screenId]?.[subTab];
    if (titleEl) titleEl.textContent = sub || mainTitle;
    if (subtitleEl) {
        subtitleEl.textContent = sub
            ? `قسم ${mainTitle} — شركة ديما الحياة`
            : 'نظام إدارة التوصيل — شركة ديما الحياة';
    }
    if (crumbEl) {
        crumbEl.innerHTML = sub
            ? `<span>${mainTitle}</span><i class="bi bi-chevron-left" aria-hidden="true"></i><span>${sub}</span>`
            : `<span>${mainTitle}</span>`;
    }
}

function updateMobileChrome(screenId) {
    const titleEl = document.getElementById('mobileTopbarTitle');
    if (titleEl) titleEl.textContent = MOBILE_SCREEN_TITLES[screenId] || 'ديما الحياة';
    document.querySelectorAll('.mobile-bottom-nav__item[data-screen]').forEach(el => {
        el.classList.toggle('active', el.dataset.screen === screenId);
    });
}

document.getElementById('mobileBottomNav')?.addEventListener('click', (e) => {
    if (e.target.closest('#mobileBottomMenu')) {
        e.preventDefault();
        setMobileNavOpen(true);
        return;
    }
    const link = e.target.closest('.mobile-bottom-nav__item[data-screen]');
    if (!link) return;
    e.preventDefault();
    showScreen(link.dataset.screen);
});

document.getElementById('btnLogout')?.addEventListener('click', async () => {
    try {
        await window.api.auth.logout();
    } catch (_) {}
    window.api.auth.setToken('');
    try {
        const res = await window.api.auth.employeeSession();
        if (res && res.token) {
            window.api.auth.setToken(res.token);
            currentUser = res.user || { DisplayName: 'موظف', Role: 'employee' };
            showApp();
        } else showLogin();
    } catch (_) { showLogin(); }
});

document.getElementById('btnAdminLogin')?.addEventListener('click', () => {
    document.body.classList.add('is-login-screen');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
});

document.getElementById('btnLoginCancel')?.addEventListener('click', () => {
    document.body.classList.remove('is-login-screen');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'flex';
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('btnLogin');
    errEl.style.display = 'none';
    const username = (document.getElementById('loginUsername').value || '').trim();
    const password = document.getElementById('loginPassword').value || '';
    if (!username || !password) {
        errEl.textContent = 'أدخل اسم المستخدم وكلمة السر';
        errEl.style.display = 'block';
        return;
    }
    btn.disabled = true;
    try {
        const res = await window.api.auth.login(username, password);
        window.api.auth.setToken(res.token);
        currentUser = res.user;
        showApp();
    } catch (err) {
        errEl.textContent = err?.message || 'فشل تسجيل الدخول';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
    }
});

(async () => {
    let ok = await checkAuth();
    if (!ok) {
        try {
            const res = await window.api.auth.employeeSession();
            if (res && res.token) {
                window.api.auth.setToken(res.token);
                currentUser = res.user || { DisplayName: 'موظف', Role: 'employee' };
                ok = true;
            }
        } catch (_) {}
    }
    if (ok) showApp();
    else showLogin();
})();
