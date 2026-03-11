// ─── المصادقة والصلاحيات ───
let currentUser = null;

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
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'flex';
    const appMain = document.getElementById('app-main');
    if (currentUser) {
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
            : `<div>${(currentUser.DisplayName || currentUser.Username || '').replace(/</g, '&lt;')}</div>
               <div class="user-role">${currentUser.Role === 'admin' ? 'مدير' : 'موظف'}</div>`;
        document.querySelectorAll('.nav-admin').forEach(el => {
            el.style.display = currentUser.Role === 'admin' ? '' : 'none';
        });
        const btnAdmin = document.getElementById('btnAdminLogin');
        if (btnAdmin) btnAdmin.style.display = currentUser.Role === 'admin' ? 'none' : '';
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const defaultScreen = currentUser.Role === 'admin' ? 'dashboard' : 'new-order';
        const navItem = document.querySelector(`[data-screen="${defaultScreen}"]`);
        if (navItem) navItem.classList.add('active');
        showScreen(defaultScreen);
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
    currentUser = null;
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

function getAmountDue(o) {
    if (o.FreeDelivery) return Math.max(0, (o.AmountIQD || 0) - (o.WaivedDeliveryIQD || 0));
    return o.AmountIQD || 0;
}

function getFullAddress(o) {
    const region = (o.RegionName || '').trim();
    const addr = (o.Address || '').trim();
    if (region && addr) return region + ' - ' + addr;
    return region || addr || '-';
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
                        <label>المتجر</label>
                        <input type="text" id="editStoreName" value="${(order.StoreName || '').replace(/"/g, '&quot;')}" required>
                    </div>
                    <div class="form-group">
                        <label>هاتف المتجر</label>
                        <input type="text" id="editStorePhone" value="${(order.StorePhone || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div class="form-group">
                        <label>اسم المستلم</label>
                        <input type="text" id="editCustomerName" value="${(order.CustomerName || '').replace(/"/g, '&quot;')}" required>
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
                        <label>أجرة التوصيل (د.ع)</label>
                        <input type="number" id="editDeliveryFee" value="${driverDelivery || 0}" min="0" step="1">
                    </div>
                    <div class="form-group">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                            <input type="checkbox" id="editFreeDelivery" ${order.FreeDelivery ? 'checked' : ''}>
                            توصيل مجاني
                        </label>
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

    document.getElementById('editRegionId')?.addEventListener('change', () => {
        const sel = document.getElementById('editRegionId');
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.value) {
            document.getElementById('editDeliveryFee').value = parseFloat(opt.dataset.fee || 0);
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
        const list = await window.api.orders.getAll(filters);
        const drivers = await window.api.drivers.getAll();

        container.innerHTML = `
            <div class="screen active orders-screen">
                <div class="orders-layout">
                    <header class="orders-header">
                        <div class="orders-header-top">
                            <h1 class="orders-title">${title}</h1>
                            <span class="orders-count" id="ordersCount">${list.length} طلب</span>
                        </div>
                        <p class="orders-subtitle">إدارة وعرض جميع الطلبات مع البحث والفلترة</p>
                    </header>
                    <div class="orders-toolbar">
                        <div class="orders-search-row">
                            <div class="orders-search-wrap">
                                <span class="orders-search-icon">🔍</span>
                                <input type="text" id="search" placeholder="بحث: رقم الطلب، رقم الشحنة، الهاتف، المتجر..." class="orders-search-input">
                            </div>
                            <div class="orders-filters">
                                <select id="filterDriver" class="orders-filter-select" title="السائق">
                                    <option value="">كل السائقين</option>
                                    ${drivers.map(d => `<option value="${d.DriverID}">${d.DriverName}</option>`).join('')}
                                </select>
                                <input type="date" id="dateFrom" class="orders-date-input" title="من تاريخ">
                                <input type="date" id="dateTo" class="orders-date-input" title="إلى تاريخ">
                                <button class="btn btn-primary" id="btnSearch">بحث</button>
                            </div>
                        </div>
                        <div class="orders-status-chips">
                            <button type="button" class="orders-chip ${!filters.status ? 'active' : ''}" data-status="">الكل</button>
                            <button type="button" class="orders-chip ${filters.status === 'New' ? 'active' : ''}" data-status="New">جديد</button>
                            <button type="button" class="orders-chip ${filters.status === 'AssignedToDriver' ? 'active' : ''}" data-status="AssignedToDriver">مع السائق</button>
                            <button type="button" class="orders-chip ${filters.status === 'Delivered' ? 'active' : ''}" data-status="Delivered">تم التوصيل</button>
                            <button type="button" class="orders-chip ${filters.status === 'Returned' ? 'active' : ''}" data-status="Returned">راجع</button>
                        </div>
                    </div>
                    <div class="orders-table-card">
                        ${list.length > 0 ? `<div class="orders-table-wrap">
                            <table class="orders-table">
                                <thead>
                                    <tr>
                                        <th>رقم</th><th>رقم الطلب</th><th>رقم الشحنة</th><th>المتجر</th><th>هاتف المستلم</th>
                                        <th class="col-address">العنوان</th><th>رابط</th><th>القطع</th><th>الفاتورة</th><th>التوصيل</th>
                                        <th>النهائي</th><th>المستحق</th><th>السائق</th><th>الحالة</th><th>الطباعة</th><th>أنشأه</th><th>التاريخ</th><th>ملاحظات</th><th>إجراء</th>
                                    </tr>
                                </thead>
                                <tbody id="ordersTableBody">
                                    ${list.map(o => `
                                        <tr data-order-id="${o.OrderID}">
                                            <td class="orders-id">${o.OrderID}</td>
                                            <td>${o.AdminOrderNo || '-'}</td>
                                            <td><strong>${o.ShipmentNumber}</strong></td>
                                            <td>${o.StoreName || '-'}</td>
                                            <td>${o.CustomerPhone || '-'}</td>
                                            <td class="col-address">${getFullAddress(o)}</td>
                                            <td>${o.CustomerLocationLink ? `<a href="${(o.CustomerLocationLink || '').replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer" title="فتح رابط الموقع" class="orders-link">📍</a>` : '-'}</td>
                                            <td>${o.Pieces || 1}</td>
                                            <td class="iqd">${formatIQD(o.AmountIQD)}</td>
                                            <td class="iqd">${o.FreeDelivery ? 'مجاني' : formatIQD(o.DeliveryFeeIQD)}</td>
                                            <td class="iqd iqd-total">${formatIQD(o.TotalIQD)}</td>
                                            <td class="iqd">${formatIQD(getAmountDue(o))}</td>
                                            <td>${o.DriverName || '-'}</td>
                                            <td><span class="badge badge-${(o.Status || 'new').toLowerCase().replace('assignedtodriver','assigned').replace('delivered','delivered').replace('returned','returned')}">${STATUS_MAP[o.Status] || o.Status}</span></td>
                                            <td><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'}" title="${o.LabelPrinted ? 'تم طباعة الملصق' : 'لم يُطبع الملصق'}">${o.LabelPrinted ? 'تم' : '—'}</span></td>
                                            <td>${(o.CreatedByName || '-').toString().replace(/</g, '&lt;')}</td>
                                            <td class="orders-date">${(o.CreatedDate || '').slice(0, 16)}</td>
                                            <td class="col-notes" title="${(o.Notes || '').replace(/"/g, '&quot;')}">${(o.Notes || '-').toString().slice(0, 40)}${(o.Notes || '').length > 40 ? '…' : ''}</td>
                                            <td>
                                                <div class="order-actions">
                                                    <button type="button" class="btn btn-sm btn-edit" data-order-id="${o.OrderID}" title="تعديل">تعديل</button>
                                                    ${currentUser?.Role === 'admin' ? `
                                                    <div class="status-quick-btns">
                                                        <button type="button" class="btn-status-sm" data-order-id="${o.OrderID}" data-status="Delivered" title="تم التوصيل">✓</button>
                                                        <button type="button" class="btn-status-sm" data-order-id="${o.OrderID}" data-status="Returned" title="راجع">⊙</button>
                                                    </div>
                                                    <button type="button" class="btn btn-sm btn-delete" data-order-id="${o.OrderID}" title="حذف">حذف</button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>` : '<div class="orders-empty"><span class="orders-empty-icon">📋</span><p>لا توجد طلبات تطابق البحث</p></div>'}
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

        const apply = () => {
            filters.search = document.getElementById('search').value;
            filters.driverId = document.getElementById('filterDriver').value;
            filters.dateFrom = document.getElementById('dateFrom').value;
            filters.dateTo = document.getElementById('dateTo').value;
            renderOrders();
        };

        document.getElementById('btnSearch').addEventListener('click', apply);
        document.getElementById('search').addEventListener('keypress', e => { if (e.key === 'Enter') apply(); });

        if (!statusClickAttached) {
            statusClickAttached = true;
            container.addEventListener('click', async (e) => {
                const btn = e.target.closest('.btn-status-sm');
                if (!btn) return;
                const id = parseInt(btn.dataset.orderId || btn.closest('tr')?.dataset?.orderId, 10);
                const status = (btn.dataset.status || '').trim();
                if (!id || isNaN(id)) {
                    await showMsg('خطأ: رقم الطلب غير صالح');
                    return;
                }
                if (status === 'Returned' && !(await window.api.showConfirm('هل أنت متأكد من جعل هذا الطلب راجع؟'))) return;
                try {
                    await window.api.orders.updateStatus(id, status);
                    await renderOrders();
                } catch (err) {
                    await showMsg('خطأ: ' + (err.message || String(err)));
                }
            });
        }

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

function showScreen(screenId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-screen="${screenId}"]`)?.classList.add('active');
    const container = document.getElementById('screen-container');
    container.innerHTML = '';
    container.dataset.currentScreen = screenId || '';
    const screen = screens[screenId];
    if (screen) screen.render(container);
}

const screens = {
    dashboard: {
        async render(container) {
            const orders = await window.api.orders.getAll({ limit: 5000 });
            const today = new Date().toISOString().split('T')[0];
            const todayOrders = orders.filter(o => (o.CreatedDate || '').startsWith(today));
            const newCount = orders.filter(o => o.Status === 'New').length;
            const assignedCount = orders.filter(o => o.Status === 'AssignedToDriver').length;
            const todayKarkh = todayOrders.filter(o => (o.RegionArea || '').trim() === 'الكرخ').length;
            const todayRusafa = todayOrders.filter(o => (o.RegionArea || 'الرصافة').trim() === 'الرصافة').length;

            container.innerHTML = `
                <div class="screen active">
                    <h1 class="page-title">لوحة التحكم</h1>
                    <div class="stat-cards">
                        <div class="stat-card">
                            <div class="value">${orders.length}</div>
                            <div class="label">إجمالي الطلبات</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${todayOrders.length}</div>
                            <div class="label">طلبات اليوم</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${newCount}</div>
                            <div class="label">طلبات جديدة</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${assignedCount}</div>
                            <div class="label">مع السائقين</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${todayKarkh}</div>
                            <div class="label">الكرخ اليوم</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${todayRusafa}</div>
                            <div class="label">الرصافة اليوم</div>
                        </div>
                    </div>
                    <div class="card">
                        <p>مرحباً بك في نظام إدارة التوصيل - شركة ديما الحياة</p>
                        <p class="status-map" style="margin-top:12px">استخدم القائمة الجانبية للتنقل بين الأقسام</p>
                    </div>
                </div>
            `;
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
                // التوصيل مجاني: النهائي = الفاتورة، المستحق = الفاتورة - أجرة التوصيل | غير مجاني: النهائي = فاتورة + توصيل، المستحق = الفاتورة
                const total = free ? amt : (amt + fee);
                const due = free ? Math.max(0, amt - fee) : amt;
                document.getElementById('totalDisplay').textContent = formatIQD(total);
                const dueEl = document.getElementById('totalDue');
                if (dueEl) {
                    dueEl.innerHTML = `المبلغ المستحق: <strong>${formatIQD(due)}</strong> د.ع`;
                }
                return total;
            };

            container.innerHTML = `
                <div class="screen active">
                    <h1 class="page-title">إدخال طلب جديد</h1>
                    <div class="card">
                        <form id="orderForm">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>رمز الموظف <span class="required">*</span></label>
                                    <input type="password" id="employeeCode" placeholder="أدخل رمزك السري" required autocomplete="off">
                                </div>
                                <div class="form-group">
                                    <label>رقم الطلب في النظام الإداري <span class="required">*</span></label>
                                    <input type="text" id="adminOrderNo" placeholder="رقم الطلب عندكم" required>
                                </div>
                                <div class="form-group">
                                    <label>اسم المتجر <span class="required">*</span></label>
                                    <input type="text" id="storeName" required>
                                </div>
                                <div class="form-group">
                                    <label>هاتف المتجر <span class="required">*</span></label>
                                    <input type="text" id="storePhone" placeholder="11 رقم" required>
                                </div>
                                <div class="form-group">
                                    <label>اسم المستلم (اختياري)</label>
                                    <input type="text" id="customerName" placeholder="اسم المستلم">
                                </div>
                                <div class="form-group">
                                    <label>هاتف المستلم <span class="required">*</span></label>
                                    <input type="text" id="customerPhone" placeholder="11 رقم (مثال: 07701234567)" required>
                                </div>
                                <div class="form-group">
                                    <label>المنطقة <span class="required">*</span></label>
                                    <select id="regionId" required>
                                        <option value="">-- اختر المنطقة --</option>
                                        ${regions.map(r => `<option value="${r.RegionID}" data-fee="${r.DeliveryFeeIQD || 0}">${(r.RegionName || '').replace(/</g, '&lt;')} (${formatIQD(r.DeliveryFeeIQD)} د.ع)</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group full">
                                    <label>العنوان (تفاصيل العنوان يدوياً) <span class="required">*</span></label>
                                    <input type="text" id="address" placeholder="اكتب تفاصيل العنوان..." required>
                                </div>
                                <div class="form-group">
                                    <label>عدد القطع <span class="required">*</span></label>
                                    <input type="number" id="pieces" value="1" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label>مبلغ الفاتورة (د.ع) <span class="required">*</span></label>
                                    <input type="number" id="amount" min="0" step="1" placeholder="0" required>
                                </div>
                                <div class="form-group">
                                    <label>أجرة التوصيل (د.ع) <span class="required">*</span></label>
                                    <input type="number" id="deliveryFee" min="0" step="1" placeholder="0" required>
                                </div>
                                <div class="form-group amounts-row">
                                    <div class="amounts-block">
                                        <label>المبلغ النهائي (د.ع)</label>
                                        <div id="totalDisplay" class="total-display">0</div>
                                        <div id="totalDue" class="final-price-box">المبلغ المستحق: <strong>0</strong> د.ع</div>
                                    </div>
                                    <label class="free-delivery-label">
                                        <input type="checkbox" id="freeDelivery">
                                        توصيل مجاني
                                    </label>
                                </div>
                                <div class="form-group full">
                                    <label>رابط موقع الزبون (اختياري)</label>
                                    <input type="url" id="customerLocationLink" placeholder="رابط خرائط جوجل أو موقع التوصيل">
                                </div>
                                <div class="form-group full">
                                    <label>ملاحظات (اختياري)</label>
                                    <textarea id="notes" rows="2" placeholder="اكتب ملاحظة إن وجدت"></textarea>
                                </div>
                            </div>
                            <div class="btn-group">
                                <button type="submit" class="btn btn-primary" id="btnSaveOrder">حفظ الطلب</button>
                                <button type="button" class="btn btn-primary" id="btnPrint">طباعة الملصق</button>
                                <button type="button" class="btn btn-secondary" id="btnClear">مسح الحقول</button>
                            </div>
                            <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
                                <input type="text" id="printShipmentNum" placeholder="رقم الشحنة لطباعة ملصق لطلب موجود" style="flex:1;max-width:300px;padding:8px">
                                <button type="button" class="btn btn-secondary" id="btnPrintExisting">طباعة</button>
                            </div>
                        </form>
                    </div>
                    <div id="lastOrderInfo" class="card" style="display:none"></div>
                </div>
            `;

            document.getElementById('storeName').value = localStorage.getItem('defaultStoreName') || '';
            document.getElementById('storePhone').value = localStorage.getItem('defaultStorePhone') || '';

            ['amount', 'deliveryFee'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', () => calcTotal(true));
            });
            document.getElementById('freeDelivery')?.addEventListener('change', () => calcTotal(false));
            document.getElementById('regionId')?.addEventListener('change', () => {
                const sel = document.getElementById('regionId');
                const opt = sel?.options[sel.selectedIndex];
                if (opt && opt.value) {
                    const fee = parseFloat(opt.dataset.fee || 0);
                    document.getElementById('deliveryFee').value = fee;
                }
                calcTotal(true);
            });
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
                if (amount <= 0) { await showMsg('أدخل مبلغ الفاتورة'); return; }
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
            await renderOrdersScreen(container, { title: 'الطلبات' });
        }
    },

    drivers: {
        async render(container) {
            let drivers = [];
            try {
                drivers = await window.api.drivers.getAll({ all: true });
            } catch (err) {
                container.innerHTML = `<div class="screen active"><div class="card"><p style="color:#b91c1c">خطأ في تحميل السائقين: ${err?.message || err}</p></div></div>`;
                return;
            }

            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            container.innerHTML = `
                <div class="screen active drivers-screen">
                    <h1 class="page-title">السائقين</h1>
                    <div class="card drivers-card">
                        <h3>إضافة سائق جديد</h3>
                        <div class="form-grid drivers-add-form">
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
                        <div class="drivers-table-wrap">
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
                <div class="screen active">
                    <h1 class="page-title">استلام الطلبات للسائق</h1>
                    <div class="card driver-scan-area">
                        ${drivers.length === 0 ? '<p style="color:#b91c1c;margin-bottom:16px">أضف سائقين من قسم السائقين أولاً</p>' : ''}
                        <p style="color:#64748b;margin-bottom:16px;font-size:0.9rem">أدخل الرمز السري للسائق واضغط Enter لإظهار اسمه، ثم امسح أو اكتب أرقام الشحنات للتعيين.</p>
                        <div id="receiveStep1">
                            <div class="form-group" style="margin-bottom:16px">
                                <label>الرمز السري للسائق</label>
                                <input type="password" id="driverCodeInput" placeholder="أدخل الرمز السري واضغط Enter" autocomplete="off" style="width:100%;padding:12px" ${drivers.length === 0 ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div id="receiveStep2" style="display:none">
                            <div class="form-group" style="margin-bottom:16px;display:flex;align-items:center;gap:12px">
                                <span class="driver-badge" id="driverBadge"></span>
                                <button type="button" class="btn btn-secondary btn-sm" id="btnAnotherDriver" style="display:none">سائق آخر</button>
                            </div>
                            <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
                                <div style="flex:1">
                                    <label>امسح الباركود أو اكتب رقم الشحنة ثم Enter</label>
                                    <input type="text" id="scanInput" placeholder="رقم الشحنة" autocomplete="off">
                                </div>
                                <button type="button" class="btn btn-primary" id="btnAssign" style="height:42px;white-space:nowrap">تعيين للسائق</button>
                            </div>
                        </div>
                        <div id="scanFeedback" class="scan-feedback" style="display:none"></div>
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
            container.innerHTML = `
                <div class="screen active support-sections-screen">
                    <div class="support-sections-layout">
                        <header class="support-sections-tabs">
                            <h2 class="support-sections-title"><i class="bi bi-headset"></i> أقسام سانده</h2>
                            <nav class="support-sections-nav">
                                <button type="button" class="support-section-tab active" data-tab="driver-return">
                                    <span class="support-section-tab-icon-wrap support-section-icon-swap"><i class="bi bi-arrow-left-right support-section-tab-icon"></i></span>
                                    <span class="support-section-tab-text">تبديل السائق</span>
                                </button>
                                <button type="button" class="support-section-tab" data-tab="driver-returned">
                                    <span class="support-section-tab-icon-wrap support-section-icon-returned"><i class="bi bi-arrow-return-left support-section-tab-icon"></i></span>
                                    <span class="support-section-tab-text">طلب راجع</span>
                                </button>
                            </nav>
                        </header>
                        <main class="support-sections-panel">
                            <section class="support-section-pane active" id="support-pane-driver-return">
                                <div class="support-pane-inner">
                                    <h3 class="support-pane-head">تبديل السائق</h3>
                                    <p class="support-pane-desc">امسح الباركود أو اكتب رقم الشحنة لإرجاع الطلب من السائق الحالي. يمكنك بعدها تعيينه لسائق آخر من قسم "استلام الطلبات".</p>
                                    <div class="driver-scan-area">
                                        <div class="form-group support-scan-row">
                                            <div class="support-scan-field">
                                                <label><i class="bi bi-upc-scan"></i> امسح الباركود أو اكتب رقم الشحنة</label>
                                                <input type="text" id="returnScanInput" placeholder="أدخل رقم الشحنة..." autocomplete="off">
                                            </div>
                                            <button type="button" class="btn btn-primary" id="btnReturnOrder"><i class="bi bi-arrow-return-left"></i> إرجاع الطلب</button>
                                        </div>
                                        <div id="returnFeedback" class="scan-feedback" style="display:none"></div>
                                    </div>
                                </div>
                            </section>
                            <section class="support-section-pane" id="support-pane-driver-returned">
                                <div class="support-pane-inner">
                                    <h3 class="support-pane-head">طلب راجع</h3>
                                    <p class="support-pane-desc">امسح الباركود أو اكتب رقم الشحنة لتسجيل الطلب كراجع (مرفوض من الزبون).</p>
                                    <div class="driver-scan-area">
                                        <div class="form-group support-scan-row">
                                            <div class="support-scan-field">
                                                <label><i class="bi bi-upc-scan"></i> امسح الباركود أو اكتب رقم الشحنة</label>
                                                <input type="text" id="returnedScanInput" placeholder="أدخل رقم الشحنة..." autocomplete="off">
                                            </div>
                                            <button type="button" class="btn btn-primary" id="btnMarkReturned"><i class="bi bi-x-circle"></i> تسجيل كراجع</button>
                                        </div>
                                        <div id="returnedFeedback" class="scan-feedback" style="display:none"></div>
                                    </div>
                                </div>
                            </section>
                        </main>
                    </div>
                </div>
            `;

            container.querySelectorAll('.support-section-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    container.querySelectorAll('.support-section-tab').forEach(b => b.classList.remove('active'));
                    container.querySelectorAll('.support-section-pane').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    container.querySelector(`#support-pane-${tab}`)?.classList.add('active');
                });
            });

            const scanInput = document.getElementById('returnScanInput');
            const feedback = document.getElementById('returnFeedback');

            const doReturn = async () => {
                const num = normalizeBarcodeInput(scanInput.value);
                if (!num) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
                    feedback.textContent = 'أدخل رقم الشحنة';
                    return;
                }
                try {
                    const result = await window.api.orders.returnFromDriver(num);
                    if (result.success) {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback success';
                        feedback.textContent = 'تم إرجاع الطلب ' + num + ' بنجاح. يمكنك الآن تعيينه لسائق آخر من قسم "استلام الطلبات".';
                        scanInput.value = '';
                        scanInput.focus();
                    } else {
                        feedback.style.display = 'block';
                        feedback.className = 'scan-feedback error';
                        feedback.textContent = result.error || 'فشل الإرجاع';
                    }
                } catch (err) {
                    feedback.style.display = 'block';
                    feedback.className = 'scan-feedback error';
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
                        returnedFeedback.className = 'scan-feedback error';
                        returnedFeedback.textContent = 'الطلب غير موجود: ' + num;
                        return;
                    }
                    await window.api.orders.updateStatus(order.OrderID, 'Returned');
                    returnedFeedback.style.display = 'block';
                    returnedFeedback.className = 'scan-feedback success';
                    returnedFeedback.textContent = 'تم تسجيل الطلب ' + num + ' كراجع بنجاح';
                    returnedScanInput.value = '';
                    returnedScanInput.focus();
                } catch (err) {
                    returnedFeedback.style.display = 'block';
                    returnedFeedback.className = 'scan-feedback error';
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
                <div class="screen active">
                    <h1 class="page-title">استلام الطلب الراجع</h1>
                    <div class="card driver-scan-area">
                        <p style="margin-bottom:16px;color:#64748b;text-align:center">امسح الباركود أو اكتب رقم الشحنة لتسجيل استلام الطلب الراجع عند الشركة (هل أرجع السائق الطلب الراجع المرفوض من الزبون وسلمه؟)</p>
                        <div class="form-group" style="display:flex;gap:8px;align-items:flex-end">
                            <div style="flex:1">
                                <label>امسح الباركود أو اكتب رقم الشحنة</label>
                                <input type="text" id="receiveReturnedScanInput" placeholder="رقم الشحنة" autocomplete="off">
                            </div>
                            <button type="button" class="btn btn-primary" id="btnReceiveReturned" style="height:42px;white-space:nowrap">تسجيل الاستلام</button>
                        </div>
                        <div id="receiveReturnedFeedback" class="scan-feedback" style="display:none"></div>
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
            const today = new Date().toISOString().split('T')[0];

            container.innerHTML = `
                <div class="screen active reports-screen">
                    <div class="reports-layout">
                        <header class="reports-tabs-horizontal">
                            <h2 class="reports-tabs-title">التقارير</h2>
                            <nav class="reports-tabs-nav">
                                <button type="button" class="reports-tab active" data-tab="collect" title="استحصال أجور السائقين">
                                    <span class="reports-tab-icon-wrap reports-tab-icon-collect"><i class="bi bi-cash-stack reports-tab-icon"></i></span>
                                    <span class="reports-tab-text">استحصال الأجور</span>
                                </button>
                                <button type="button" class="reports-tab" data-tab="daily" title="ملخص يومي">
                                    <span class="reports-tab-icon-wrap reports-tab-icon-daily"><i class="bi bi-clipboard-data reports-tab-icon"></i></span>
                                    <span class="reports-tab-text">التقرير الملخص</span>
                                </button>
                                <button type="button" class="reports-tab" data-tab="driver" title="تقرير سائق محدد">
                                    <span class="reports-tab-icon-wrap reports-tab-icon-driver"><i class="bi bi-person-vcard reports-tab-icon"></i></span>
                                    <span class="reports-tab-text">تقرير السائق</span>
                                </button>
                                <button type="button" class="reports-tab" data-tab="company" title="التقرير الشامل">
                                    <span class="reports-tab-icon-wrap reports-tab-icon-company"><i class="bi bi-pie-chart-fill reports-tab-icon"></i></span>
                                    <span class="reports-tab-text">التقرير العام</span>
                                </button>
                            </nav>
                        </header>
                        <main class="reports-panel">
                            <section class="report-pane active" id="pane-collect">
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
                                </div>
                                <div class="report-form-row" id="collectFormRow">
                                    <div class="report-field report-field-wide">
                                        <label>المبلغ المستحصل</label>
                                        <input type="text" id="collectAmountInput" placeholder="أدخل المبلغ بالأرقام" inputmode="numeric">
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
                                    <div class="report-field"><label>من تاريخ</label><input type="date" id="dailySummaryFrom" value="${today}"></div>
                                    <div class="report-field"><label>إلى تاريخ</label><input type="date" id="dailySummaryTo" value="${today}"></div>
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
                                    <div class="report-field"><label>من تاريخ</label><input type="date" id="reportDateFrom" value="${today}"></div>
                                    <div class="report-field"><label>إلى تاريخ</label><input type="date" id="reportDateTo" value="${today}"></div>
                                    <button class="btn btn-primary" id="btnDriverReport">عرض التقرير</button>
                                </div>
                                <div id="driverReportContent"></div>
                                <div id="driverReportActions" class="report-actions" style="display:none"><button class="btn btn-primary" id="btnPrintDriverReport">طباعة</button><button class="btn btn-secondary" id="btnExportDriverPDF">تصدير PDF</button></div>
                            </section>
                            <section class="report-pane" id="pane-company">
                                <h3 class="report-pane-head">التقرير العام</h3>
                                <p class="report-pane-desc">ملخص شامل لجميع السائقين والطلبات في الفترة المحددة</p>
                                <div class="report-form-row">
                                    <div class="report-field"><label>من تاريخ</label><input type="date" id="companyDateFrom" value="${today}"></div>
                                    <div class="report-field"><label>إلى تاريخ</label><input type="date" id="companyDateTo" value="${today}"></div>
                                    <button class="btn btn-primary" id="btnCompanyReport">عرض التقرير</button>
                                </div>
                                <div id="companyReportContent"></div>
                                <div id="companyReportActions" class="report-actions" style="display:none"><button class="btn btn-secondary" id="btnExportCompanyPDF">تصدير PDF</button></div>
                            </section>
                        </main>
                    </div>
                </div>
            `;

            document.querySelectorAll('.reports-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const t = tab.dataset.tab;
                    document.querySelectorAll('.reports-tab').forEach(x => x.classList.remove('active'));
                    document.querySelectorAll('.report-pane').forEach(x => x.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById('pane-' + t)?.classList.add('active');
                });
            });

            let collectExpectedAmount = null;
            let collectAlreadyPaid = false;
            const hideCollectAmount = () => {
                document.getElementById('collectAmountBox').style.display = 'none';
                document.getElementById('collectAlreadyPaidMsg').style.display = 'none';
                document.getElementById('collectAmountInput').disabled = false;
                document.getElementById('btnCollectFees').disabled = false;
                collectExpectedAmount = null;
                collectAlreadyPaid = false;
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
                    const alreadyPaidMsg = document.getElementById('collectAlreadyPaidMsg');
                    const amountInput = document.getElementById('collectAmountInput');
                    const btnCollect = document.getElementById('btnCollectFees');
                    if (collectAlreadyPaid) {
                        alreadyPaidMsg.style.display = 'block';
                        amountInput.disabled = true;
                        btnCollect.disabled = true;
                        amountInput.value = '';
                    } else {
                        alreadyPaidMsg.style.display = 'none';
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
                const enteredNum = parseInt(String(amountInput).replace(/\D/g, ''), 10) || 0;
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
                            <div class="report-table-wrap">
                                <table class="report-table">
                                    <thead><tr>
                                        <th>التاريخ</th><th>السائق</th><th>عدد الطلبات</th><th>مرتجعات</th>
                                        <th>إجمالي الفواتير</th><th>أجور التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th>
                                        <th>سداد الأجور</th><th>مجاني</th><th>غير مجاني</th><th>تفصيل الأجور</th>
                                    </tr></thead>
                                    <tbody>
                                        ${report.rows.map(r => {
                                            const feeDetail = Object.entries(r.deliveryFeeBreakdown || {})
                                                .sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))
                                                .map(([fee,c]) => formatIQD(fee)+': '+c).join(' | ') || '-';
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
                            <div class="report-summary-card"><div class="label">أجور التوصيل</div><div class="value">${formatIQD(report.totalDelivery)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ النهائي</div><div class="value">${formatIQD(report.net)} د.ع</div></div>
                            <div class="report-summary-card report-summary-card--primary"><div class="label">المبلغ المستحق</div><div class="value">${formatIQD(report.totalDue)} د.ع</div></div>
                        </div>
                        <div class="report-section-title">إحصائيات أجور التوصيل</div>
                        <div class="report-summary-cards report-fee-cards">
                            <div class="report-summary-card"><div class="label">مجاني</div><div class="value">${report.countFreeDelivery || 0}</div></div>
                            <div class="report-summary-card"><div class="label">غير مجاني</div><div class="value">${report.countPaidDelivery || 0}</div></div>
                            ${Object.entries(report.deliveryFeeBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([fee,c]) => `<div class="report-summary-card"><div class="label">أجر ${formatIQD(fee)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                        </div>
                        <div class="report-section-title">تفاصيل الطلبات</div>
                        <div class="report-table-wrap">
                            <table class="report-table">
                                <thead><tr><th>الحالة</th><th>رقم الطلب</th><th>رقم الشحنة</th><th>المتجر</th><th>اسم المستلم</th><th>هاتف المستلم</th><th class="col-address">العنوان</th><th>رابط الموقع</th><th>القطع</th><th>مبلغ الفاتورة</th><th>مبلغ التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th><th>سداد الأجور</th><th>الطباعة</th><th>استلام</th><th>أنشأه</th><th class="col-notes">ملاحظات</th></tr></thead>
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
                                            <td class="col-address">${getFullAddress(o)}</td>
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
                                            <td class="col-notes" title="${(o.Notes || '').replace(/"/g, '&quot;')}">${(o.Notes || '-').toString().slice(0, 30)}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                actions.style.display = 'flex';
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

                document.getElementById('companyReportContent').innerHTML = report.totalOrders === 0
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
                            ${Object.entries(report.deliveryFeeBreakdown || {}).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0])).map(([fee,c]) => `<div class="report-summary-card"><div class="label">أجر ${formatIQD(fee)} د.ع</div><div class="value">${c}</div></div>`).join('')}
                        </div>
                        <div class="report-section-title">ملخص حسب السائق</div>
                        <div class="report-table-wrap">
                            <table class="report-table">
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
                        <div class="report-section-title">تفاصيل الطلبات</div>
                        <div class="report-table-wrap">
                            <table class="report-table">
                                <thead><tr><th>الحالة</th><th>رقم الطلب</th><th>رقم الشحنة</th><th>السائق</th><th>المتجر</th><th>المستلم</th><th>الهاتف</th><th class="col-address">العنوان</th><th>مبلغ الفاتورة</th><th>مبلغ التوصيل</th><th>المبلغ النهائي</th><th>المبلغ المستحق</th><th>سداد الأجور</th><th>الطباعة</th><th>استلام</th><th>أنشأه</th></tr></thead>
                                <tbody>
                                    ${allOrders.map(o => {
                                        const returned = isOrderReturned(o);
                                        const statusTxt = STATUS_MAP[o.Status || o.status] || (o.Status || o.status) || '-';
                                        const labelPrinted = o.LabelPrinted ? 'تم' : 'لم يُطبع';
                                        const receiveTxt = returned ? (o.ReturnedOrderReceived ? 'تم' : 'لم يُسلّم') : '-';
                                        return `<tr class="${returned ? 'order-returned' : ''}">
                                            <td>${statusTxt}</td>
                                            <td>${o.AdminOrderNo || '-'}</td>
                                            <td>${o.ShipmentNumber}</td>
                                            <td>${o.DriverName || 'غير معين'}</td>
                                            <td>${o.StoreName || '-'}</td>
                                            <td>${o.CustomerName || '-'}</td>
                                            <td>${o.CustomerPhone || '-'}</td>
                                            <td class="col-address">${getFullAddress(o)}</td>
                                            <td class="iqd">${formatIQD(o.AmountIQD)}</td>
                                            <td class="iqd">${o.FreeDelivery ? 'مجاني ' + formatIQD(driverAmt(o)) : formatIQD(driverAmt(o))}</td>
                                            <td class="iqd iqd-total">${formatIQD(o.TotalIQD)}</td>
                                            <td class="iqd">${formatIQD(getAmountDue(o))}</td>
                                            <td><span class="badge ${o.FeesCollected ? 'badge-delivered' : 'badge-new'}">${o.FeesCollected ? 'تم' : 'لم يُسد'}</span></td>
                                            <td><span class="badge ${o.LabelPrinted ? 'badge-delivered' : 'badge-new'}">${labelPrinted}</span></td>
                                            <td><span class="badge ${returned ? (o.ReturnedOrderReceived ? 'badge-delivered' : 'badge-returned') : ''}" title="${returned ? (o.ReturnedOrderReceived ? 'تم استلامه عند الشركة' : 'لم يُسلّم للشركة بعد') : ''}">${receiveTxt}</span></td>
                                            <td>${(o.CreatedByName || '-').toString().replace(/</g, '&lt;')}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                document.getElementById('companyReportActions').style.display = report.totalOrders > 0 ? 'flex' : 'none';
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
                const pdf = await window.api.reports.companyReportPDF(currentCompanyReport);
                const name = `تقرير-يومي-${currentCompanyReport.date}.pdf`;
                const res = await window.api.reports.savePDF({ base64: pdf, defaultName: name });
                if (res.saved) await showMsg('تم حفظ الملف: ' + res.path);
            });
        }
    },

    settings: {
        async render(container) {
            const defaults = {
                storeName: localStorage.getItem('defaultStoreName') || '',
                storePhone: localStorage.getItem('defaultStorePhone') || ''
            };
            let regions = [];
            try {
                regions = await window.api.regions.getAll();
            } catch (_) {}
            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            container.innerHTML = `
                <div class="screen active settings-screen">
                    <div class="settings-layout">
                        <header class="settings-tabs-horizontal">
                            <h2 class="settings-tabs-title">الإعدادات</h2>
                            <nav class="settings-tabs-nav">
                                <button type="button" class="settings-tab active" data-tab="regions" title="المناطق وتكلفة التوصيل">
                                    <span class="settings-tab-icon">📍</span>
                                    <span class="settings-tab-text">المناطق والتوصيل</span>
                                </button>
                                <button type="button" class="settings-tab" data-tab="defaults" title="القيم الافتراضية للطلبات">
                                    <span class="settings-tab-icon">⚙️</span>
                                    <span class="settings-tab-text">القيم الافتراضية</span>
                                </button>
                                <button type="button" class="settings-tab" data-tab="about" title="معلومات النظام">
                                    <span class="settings-tab-icon">ℹ️</span>
                                    <span class="settings-tab-text">حول النظام</span>
                                </button>
                            </nav>
                        </header>
                        <main class="settings-panel">
                            <section class="settings-pane active" id="settings-pane-regions">
                                <div class="settings-pane-inner">
                                    <h3 class="settings-pane-head">المناطق وتكلفة التوصيل</h3>
                                    <p class="settings-pane-desc">أضف المناطق وتكلفة توصيل كل منطقة. تظهر في قائمة منسدلة عند إدخال الطلب.</p>
                                    <div class="settings-add-region">
                                        <div class="form-group">
                                            <label>اسم المنطقة</label>
                                            <input type="text" id="newRegionName" placeholder="مثال: الكرادة">
                                        </div>
                                        <div class="form-group">
                                            <label>الجانب</label>
                                            <select id="newRegionArea">
                                                <option value="الكرخ">الكرخ</option>
                                                <option value="الرصافة">الرصافة</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label>تكلفة التوصيل (د.ع)</label>
                                            <input type="number" id="newRegionFee" min="0" placeholder="0">
                                        </div>
                                        <button type="button" class="btn btn-primary" id="btnAddRegion">إضافة منطقة</button>
                                    </div>
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
                            <section class="settings-pane" id="settings-pane-defaults">
                                <div class="settings-pane-inner">
                                    <h3 class="settings-pane-head">القيم الافتراضية للطلبات</h3>
                                    <p class="settings-pane-desc">تُعرض تلقائياً عند إدخال طلب جديد ويمكن تغييرها في نموذج الطلب.</p>
                                    <div class="settings-defaults-form">
                                        <div class="form-group">
                                            <label>اسم المتجر الافتراضي</label>
                                            <input type="text" id="defaultStoreName" value="${(defaults.storeName || '').replace(/"/g, '&quot;')}" placeholder="مثال: متجر ديما الحياة">
                                        </div>
                                        <div class="form-group">
                                            <label>هاتف المتجر الافتراضي</label>
                                            <input type="text" id="defaultStorePhone" value="${(defaults.storePhone || '').replace(/"/g, '&quot;')}" placeholder="مثال: 07701234567">
                                        </div>
                                        <button type="button" class="btn btn-primary btn-lg" id="btnSaveDefaults">حفظ القيم الافتراضية</button>
                                    </div>
                                </div>
                            </section>
                            <section class="settings-pane" id="settings-pane-about">
                                <div class="settings-pane-inner">
                                    <h3 class="settings-pane-head">حول النظام</h3>
                                    <div class="settings-about-card">
                                        <div class="settings-about-logo">شركة ديما الحياة</div>
                                        <p class="settings-about-tagline">نظام إدارة التوصيل</p>
                                        <div class="settings-about-meta">
                                            <span>الإصدار 1.0</span>
                                            <span>·</span>
                                            <span>العملة: الدينار العراقي (IQD)</span>
                                        </div>
                                        <div class="settings-about-badges">
                                            <span class="settings-badges-label">حالات الطلبات:</span>
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

            container.querySelectorAll('.settings-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.dataset.tab;
                    container.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
                    container.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    container.querySelector(`#settings-pane-${tab}`)?.classList.add('active');
                });
            });

            document.getElementById('btnSaveDefaults').addEventListener('click', async () => {
                const storeName = document.getElementById('defaultStoreName').value.trim();
                const storePhone = document.getElementById('defaultStorePhone').value;
                localStorage.setItem('defaultStoreName', storeName);
                localStorage.setItem('defaultStorePhone', storePhone);
                await showMsg('تم حفظ القيم الافتراضية');
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
                container.innerHTML = `<div class="screen active"><div class="card"><p style="color:#b91c1c">خطأ: ${err?.message || err}</p></div></div>`;
                return;
            }
            const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            container.innerHTML = `
                <div class="screen active users-screen">
                    <div class="users-layout">
                        <header class="users-header">
                            <div class="users-header-top">
                                <h1 class="users-title">إدارة المستخدمين</h1>
                                <span class="users-count" id="usersCount">${users.length} مستخدم</span>
                            </div>
                            <p class="users-subtitle">إضافة وإدارة حسابات المستخدمين مع تحديد الأدوار والصلاحيات</p>
                        </header>
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

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const screenId = item.dataset.screen;
        if (screenId && screens[screenId]) showScreen(screenId);
    });
});

const SIDEBAR_STORAGE = 'appSidebarCollapsed';
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const appBody = document.getElementById('appBody');
    if (!appBody) return;
    const collapsed = appBody.classList.toggle('sidebar-collapsed');
    localStorage.setItem(SIDEBAR_STORAGE, collapsed ? '1' : '0');
});

(function applySidebarState() {
    const saved = localStorage.getItem(SIDEBAR_STORAGE);
    const appBody = document.getElementById('appBody');
    if (appBody && saved === '1') appBody.classList.add('sidebar-collapsed');
})();

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
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
});

document.getElementById('btnLoginCancel')?.addEventListener('click', () => {
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
