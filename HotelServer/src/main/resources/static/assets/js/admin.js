/**
 * Luna Cove — admin.js
 * Backend contract preserved exactly from the original admin console:
 *   /api/tables, /api/reservations, /api/payments, /api/feedbacks,
 *   /api/auth/users, /api/menu (all verbs unchanged).
 */
(() => {
    const sectionMeta = {
        dashboard: { title: "Dashboard", subtitle: "Monitor restaurant activity and open each section to manage records." },
        floor: { title: "Live Floor Status", subtitle: "Real-time seating map — auto-refreshes as guests are seated and served." },
        users: { title: "Guest Registry", subtitle: "Review registered accounts and update roles or profile details." },
        menu: { title: "Provisions Catalog", subtitle: "Maintain food and drink entries with the Menu Management controls." },
        tables: { title: "Seating Inventory", subtitle: "Track table inventory and add new tables from Table Management." },
        feedbacks: { title: "Guest Sentiment", subtitle: "Read guest ratings and feedback connected to reservations." },
        payments: { title: "Settlement Registry", subtitle: "Inspect payment amounts, methods, statuses, and linked reservations." },
        reservations: { title: "Active Dockets", subtitle: "Manage active bookings and cancel invalid reservations when needed." }
    };

    const state = {
        activeSection: "dashboard",
        tables: [], reservations: [], payments: [], feedbacks: [], menuItems: [], users: [],
        page: { users: 1, menu: 1, tables: 1, feedbacks: 1, payments: 1, reservations: 1 },
        search: { users: "", menu: "", tables: "", feedbacks: "", payments: "", reservations: "" }
    };
    const PAGE_SIZE = 8;

    const els = {
        status: document.getElementById("adminStatus"),
        sectionTitle: document.getElementById("sectionTitle"),
        sectionSubtitle: document.getElementById("sectionSubtitle"),
        sessionLabel: document.getElementById("adminSessionLabel"),
        accessBanner: document.getElementById("accessBanner"),
        refreshButton: document.getElementById("refreshAdmin"),
        panels: {
            dashboard: document.getElementById("dashboardPanel"),
            floor: document.getElementById("floorPanel"),
            users: document.getElementById("usersPanel"),
            menu: document.getElementById("menuPanel"),
            tables: document.getElementById("tablesPanel"),
            feedbacks: document.getElementById("feedbacksPanel"),
            payments: document.getElementById("paymentsPanel"),
            reservations: document.getElementById("reservationsPanel")
        }
    };

    function esc(v) { return window.Luna.escapeHtml(v); }
    function money(v) { return `LKR ${window.Luna.currency(v)}`; }
    function setStatus(message, isError = false) {
        if (!els.status) return;
        els.status.textContent = message;
        els.status.style.color = isError ? "var(--color-danger)" : "var(--color-gold-light)";
    }

    /* ---------------- Generic managed table: search + pagination ---------------- */
    function renderManagedTable(sectionKey, target, columns, rows, emptyMessage, searchableFields) {
        if (!target) return;
        const search = (state.search[sectionKey] || "").toLowerCase();

        const filtered = search
            ? rows.filter((row) => searchableFields.some((f) => String(f(row) ?? "").toLowerCase().includes(search)))
            : rows;

        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        state.page[sectionKey] = Math.min(state.page[sectionKey] || 1, totalPages);
        const start = (state.page[sectionKey] - 1) * PAGE_SIZE;
        const pageRows = filtered.slice(start, start + PAGE_SIZE);

        if (filtered.length === 0) {
            target.innerHTML = `<div class="empty-state">${esc(emptyMessage)}</div>`;
            return;
        }

        const headerHtml = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
        const rowHtml = pageRows.map((row) => `<tr>${columns.map((c) => `<td>${c.render(row)}</td>`).join("")}</tr>`).join("");

        const paginationHtml = totalPages > 1 ? `
            <div class="pagination-row" data-pagination="${sectionKey}">
                <button class="page-btn" data-page-action="prev" ${state.page[sectionKey] === 1 ? "disabled" : ""}>&lsaquo;</button>
                ${Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => `<button class="page-btn ${p === state.page[sectionKey] ? "is-active" : ""}" data-page-num="${p}">${p}</button>`).join("")}
                <button class="page-btn" data-page-action="next" ${state.page[sectionKey] === totalPages ? "disabled" : ""}>&rsaquo;</button>
            </div>
        ` : "";

        target.innerHTML = `
            <div class="table-wrap"><table class="data-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table></div>
            ${paginationHtml}
        `;

        target.querySelectorAll("[data-page-num]").forEach((btn) => {
            btn.addEventListener("click", () => { state.page[sectionKey] = Number(btn.dataset.pageNum); renderAdmin(); });
        });
        target.querySelectorAll("[data-page-action]").forEach((btn) => {
            btn.addEventListener("click", () => {
                state.page[sectionKey] += btn.dataset.pageAction === "next" ? 1 : -1;
                renderAdmin();
            });
        });
    }

    function bindSearchInput(sectionKey, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = state.search[sectionKey] || "";
        input.addEventListener("input", (e) => {
            state.search[sectionKey] = e.target.value;
            state.page[sectionKey] = 1;
            renderAdmin();
        });
    }

    /* ---------------- Dashboard ---------------- */
    function renderCounts() {
        document.getElementById("adminTablesCount").textContent = state.tables.length;
        document.getElementById("adminReservationsCount").textContent = state.reservations.length;
        document.getElementById("adminPaymentsCount").textContent = state.payments.length;
        document.getElementById("adminFeedbacksCount").textContent = state.feedbacks.length;
        document.getElementById("adminMenuCount").textContent = state.menuItems.length;
        document.getElementById("adminUsersCount").textContent = state.users.length;
    }

    function renderRevenueChart() {
        const chartEl = document.getElementById("revenueChart");
        if (!chartEl) return;
        const byMethod = { CARD: 0, CASH: 0 };
        state.payments.forEach((p) => { byMethod[p.method === "CASH" ? "CASH" : "CARD"] += Number(p.amount || 0); });

        const byTableType = { SOLO: 0, DOUBLE: 0, DELUXE: 0 };
        state.reservations.forEach((r) => { const t = r.table?.type; if (t && byTableType[t] !== undefined) byTableType[t] += 1; });

        const maxVal = Math.max(1, ...Object.values(byTableType));
        chartEl.innerHTML = Object.entries(byTableType).map(([label, val]) => `
            <div class="bar-col">
                <strong style="font-size:0.72rem; color: var(--color-gold-dark);">${val}</strong>
                <div class="bar" style="height:${Math.max(6, (val / maxVal) * 120)}px;"></div>
                <span class="bar-label">${label}</span>
            </div>
        `).join("");

        const revenueLabel = document.getElementById("revenueByMethod");
        if (revenueLabel) {
            revenueLabel.innerHTML = `
                <div class="summary-row"><span>Card Revenue</span><span>${money(byMethod.CARD)}</span></div>
                <div class="summary-row"><span>Cash / QR Revenue</span><span>${money(byMethod.CASH)}</span></div>
            `;
        }
    }

    function renderDashboardTables() {
        renderManagedTable("dashboardReservations", document.getElementById("dashboardReservationsTable"),
            [
                { label: "ID", render: (r) => esc(r.id) },
                { label: "Guest", render: (r) => esc(r.customerName) },
                { label: "Date", render: (r) => esc(r.date) },
                { label: "Table", render: (r) => esc(r.table?.tableNumber) }
            ], state.reservations.slice(0, 5), "No active reservations.", []);

        renderManagedTable("dashboardPayments", document.getElementById("dashboardPaymentsTable"),
            [
                { label: "ID", render: (p) => esc(p.id) },
                { label: "Amount", render: (p) => money(p.amount) },
                { label: "Method", render: (p) => esc(p.method) },
                { label: "Status", render: (p) => `<span class="badge ${p.status === "PAID" ? "badge-success" : "badge-neutral"}">${esc(p.status || "N/A")}</span>` }
            ], state.payments.slice(0, 5), "No payments recorded.", []);
    }

    /* ---------------- Section tables ---------------- */
    function renderTablesSection() {
        renderManagedTable("tables", document.getElementById("tablesList"),
            [
                { label: "ID", render: (t) => esc(t.id) },
                { label: "Number", render: (t) => esc(t.tableNumber) },
                { label: "Type", render: (t) => `<span class="badge badge-gold">${esc(t.type)}</span>` },
                { label: "Capacity", render: (t) => esc(t.capacity) },
                { label: "Price", render: (t) => money(t.price) },
                { label: "Status", render: (t) => `<span class="badge ${t.available ? "badge-success" : "badge-danger"}">${t.available ? "Available" : "Booked"}</span>` },
                { label: "Actions", render: (t) => `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-edit-table="${t.id}">Edit</button><button class="btn btn-danger btn-sm" data-delete-table="${t.id}">Delete</button></div>` }
            ], state.tables, "No tables found.", [(t) => t.tableNumber, (t) => t.type]);
    }

    function renderReservationsSection() {
        renderManagedTable("reservations", document.getElementById("adminReservationsList"),
            [
                { label: "ID", render: (r) => esc(r.id) },
                { label: "Customer", render: (r) => esc(r.customerName) },
                { label: "Table", render: (r) => esc(r.table?.tableNumber) },
                { label: "Type", render: (r) => esc(r.table?.type) },
                { label: "Date", render: (r) => esc(r.date) },
                { label: "Time", render: (r) => esc(r.time || r.ctime) },
                { label: "Actions", render: (r) => `<button class="btn btn-danger btn-sm" data-delete-reservation="${r.id}">Cancel</button>` }
            ], state.reservations, "No active reservations.", [(r) => r.customerName, (r) => r.table?.tableNumber]);
    }

    function renderPaymentsSection() {
        renderManagedTable("payments", document.getElementById("paymentsList"),
            [
                { label: "ID", render: (p) => esc(p.id) },
                { label: "Reservation", render: (p) => esc(p.reservation?.id) },
                { label: "Customer", render: (p) => esc(p.reservation?.customerName) },
                { label: "Amount", render: (p) => money(p.amount) },
                { label: "Method", render: (p) => esc(p.method) },
                { label: "Status", render: (p) => `<span class="badge ${p.status === "PAID" ? "badge-success" : "badge-neutral"}">${esc(p.status || "N/A")}</span>` },
                { label: "Actions", render: (p) => `<button class="btn btn-danger btn-sm" data-delete-payment="${p.id}">Delete</button>` }
            ], state.payments, "No payments recorded.", [(p) => p.reservation?.customerName, (p) => p.method]);
    }

    function renderFeedbacksSection() {
        renderManagedTable("feedbacks", document.getElementById("feedbacksList"),
            [
                { label: "ID", render: (f) => esc(f.id) },
                { label: "Reservation", render: (f) => esc(f.reservation?.id) },
                { label: "Customer", render: (f) => esc(f.reservation?.customerName) },
                { label: "Table", render: (f) => esc(f.reservation?.table?.tableNumber) },
                { label: "Rating", render: (f) => `<span class="badge badge-gold">${esc(f.rating || 0)}/5</span>` },
                { label: "Message", render: (f) => esc(f.message || "No message provided.") },
                { label: "Actions", render: (f) => `<button class="btn btn-danger btn-sm" data-delete-feedback="${f.id}">Delete</button>` }
            ], state.feedbacks, "No feedback available.", [(f) => f.reservation?.customerName, (f) => f.message]);
    }

    function renderMenuSection() {
        renderManagedTable("menu", document.getElementById("adminMenuList"),
            [
                { label: "ID", render: (m) => esc(m.id) },
                { label: "Name", render: (m) => esc(m.name) },
                { label: "Category", render: (m) => `<span class="badge badge-gold">${esc(m.category)}</span>` },
                { label: "Price", render: (m) => money(m.price) },
                { label: "Actions", render: (m) => `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-edit-menu="${m.id}">Edit</button><button class="btn btn-danger btn-sm" data-delete-menu="${m.id}">Delete</button></div>` }
            ], state.menuItems, "No menu items found.", [(m) => m.name, (m) => m.category]);
    }

    function renderUsersSection() {
        renderManagedTable("users", document.getElementById("adminUsersList"),
            [
                { label: "ID", render: (u) => esc(u.id) },
                { label: "Name", render: (u) => esc(u.name) },
                { label: "Email", render: (u) => esc(u.email) },
                { label: "Role", render: (u) => `<span class="badge ${u.userRole === "ADMIN" ? "badge-gold" : "badge-neutral"}">${esc(u.userRole || "CUSTOMER")}</span>` },
                { label: "Actions", render: (u) => `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-edit-user="${u.id}">Edit</button><button class="btn btn-danger btn-sm" data-delete-user="${u.id}">Delete</button></div>` }
            ], state.users, "No users found.", [(u) => u.name, (u) => u.email]);
    }

    /* ---------------- Live Floor Status ---------------- */
    function getLatestReservationForTable(tableId) {
        const matches = state.reservations.filter((r) => String(r.table?.id) === String(tableId));
        if (matches.length === 0) return null;
        return matches.reduce((latest, r) => (!latest || Number(r.id) > Number(latest.id) ? r : latest), null);
    }

    function getPaymentForReservation(reservationId) {
        return state.payments.find((p) => String(p.reservation?.id) === String(reservationId)) || null;
    }

    function getTableFloorStatus(table) {
        if (table.available) return { status: "available", reservation: null };
        const reservation = getLatestReservationForTable(table.id);
        const payment = reservation ? getPaymentForReservation(reservation.id) : null;
        if (payment && payment.status === "PAID") return { status: "occupied", reservation };
        return { status: "reserved", reservation };
    }

    function renderFloorMap(targetId, compact) {
        const target = document.getElementById(targetId);
        if (!target) return;

        if (state.tables.length === 0) {
            target.innerHTML = `<div class="empty-state">No tables configured yet.</div>`;
            return;
        }

        const statusLabel = { available: "Available", reserved: "Reserved", occupied: "Occupied" };
        const sorted = [...state.tables].sort((a, b) => a.tableNumber - b.tableNumber);
        const list = compact ? sorted.slice(0, 12) : sorted;

        target.innerHTML = list.map((table) => {
            const { status, reservation } = getTableFloorStatus(table);
            const tooltip = reservation
                ? `Table ${table.tableNumber} — ${statusLabel[status]} — ${reservation.customerName || "Guest"} @ ${reservation.time || "N/A"}`
                : `Table ${table.tableNumber} — ${statusLabel[status]}`;
            return `
                <button type="button" class="floor-block floor-${status}" data-floor-table="${table.id}" title="${esc(tooltip)}">
                    <span class="floor-block-number">${esc(table.tableNumber)}</span>
                    <span class="floor-block-label">${statusLabel[status]}</span>
                </button>
            `;
        }).join("");
    }

    function showFloorTableDetail(tableId) {
        const table = state.tables.find((t) => String(t.id) === String(tableId));
        if (!table) return;
        const { status, reservation } = getTableFloorStatus(table);
        const statusLabel = { available: "Available", reserved: "Reserved — awaiting arrival", occupied: "Occupied — order paid" };

        const bodyHtml = reservation ? `
            <div style="text-align:left;">
                <div class="summary-row"><span>Status</span><span>${statusLabel[status]}</span></div>
                <div class="summary-row"><span>Reservation</span><span>#${reservation.id}</span></div>
                <div class="summary-row"><span>Guest</span><span>${esc(reservation.customerName)}</span></div>
                <div class="summary-row"><span>Time</span><span>${esc(reservation.date)} @ ${esc(reservation.time || "N/A")}</span></div>
            </div>
        ` : `<p>This table is currently free and ready to be booked.</p>`;

        window.Luna.showModal({ title: `Table ${table.tableNumber}`, bodyHtml, closeLabel: "Close" });
    }

    function renderAdmin() {
        renderCounts();
        renderRevenueChart();
        renderFloorMap("floorGrid");
        renderFloorMap("dashboardFloorPreview", true);
        renderDashboardTables();
        renderTablesSection();
        renderReservationsSection();
        renderPaymentsSection();
        renderFeedbacksSection();
        renderMenuSection();
        renderUsersSection();
    }

    /* ---------------- Data load ---------------- */
    async function loadAdminData(silent) {
        if (!silent) setStatus("Refreshing dashboard…");
        try {
            const [tables, reservations, payments, feedbacks, users, menuItems] = await Promise.all([
                window.LunaApi.get("/api/tables"),
                window.LunaApi.get("/api/reservations"),
                window.LunaApi.get("/api/payments"),
                window.LunaApi.get("/api/feedbacks"),
                window.LunaApi.get("/api/auth/users"),
                window.LunaApi.get("/api/menu")
            ]);
            state.tables = tables || []; state.reservations = reservations || []; state.payments = payments || [];
            state.feedbacks = feedbacks || []; state.menuItems = menuItems || []; state.users = users || [];
            renderAdmin();
            updateSession();
            if (!silent) setStatus("Dashboard synced successfully.");
        } catch (error) {
            if (!silent) setStatus(error.message || "Dashboard refresh failed.", true);
        }
    }

    function updateSession() {
        const auth = window.Luna.getAuth();
        if (!els.sessionLabel) return;
        if (!auth?.jwt) { els.sessionLabel.textContent = "No admin session detected."; if (els.accessBanner) els.accessBanner.hidden = false; return; }
        els.sessionLabel.textContent = `Signed in as ${auth.userRole || "CUSTOMER"} — ${auth.name || auth.email || "user"}.`;
        if (els.accessBanner) els.accessBanner.hidden = auth.userRole === "ADMIN";
    }

    /* ---------------- Section switching ---------------- */
    function switchSection(section) {
        if (!sectionMeta[section]) return;
        state.activeSection = section;
        if (els.sectionTitle) els.sectionTitle.textContent = sectionMeta[section].title;
        if (els.sectionSubtitle) els.sectionSubtitle.textContent = sectionMeta[section].subtitle;
        Object.entries(els.panels).forEach(([key, panel]) => { if (panel) panel.hidden = key !== section; });
        document.querySelectorAll("[data-section]").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.section === section));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* ---------------- Form handlers ---------------- */
    function resetForm(formId, idFieldId, submitId, cancelId, defaultLabel) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.reset();
        document.getElementById(idFieldId).value = "";
        document.getElementById(submitId).textContent = defaultLabel;
        document.getElementById(cancelId).hidden = true;
    }

    async function handleMenuSubmit(event) {
        event.preventDefault();
        const id = document.getElementById("menuItemId").value;
        const payload = {
            name: document.getElementById("menuItemName").value.trim(),
            category: document.getElementById("menuItemCategory").value,
            price: Number(document.getElementById("menuItemPrice").value)
        };
        try {
            await (id ? window.LunaApi.put(`/api/menu/${id}`, payload) : window.LunaApi.post("/api/menu", payload));
            resetForm("menuForm", "menuItemId", "menuSubmitButton", "menuCancelEdit", "Commit Provision Entry");
            window.Luna.toast(id ? "Menu item updated." : "Menu item added.", "success");
            await loadAdminData();
        } catch (error) { window.Luna.toast(error.message || "Failed to save menu item.", "error"); }
    }

    function editMenuItem(id) {
        const item = state.menuItems.find((m) => String(m.id) === String(id));
        if (!item) return;
        switchSection("menu");
        document.getElementById("menuItemId").value = item.id;
        document.getElementById("menuItemName").value = item.name || "";
        document.getElementById("menuItemCategory").value = item.category || "FOOD";
        document.getElementById("menuItemPrice").value = item.price || 0;
        document.getElementById("menuSubmitButton").textContent = "Update Menu Item";
        document.getElementById("menuCancelEdit").hidden = false;
        document.getElementById("menuForm").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function deleteMenuItem(id) {
        const ok = await window.Luna.confirmDialog({ title: "Delete menu item?", message: "This item will be permanently removed from the menu.", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/menu/${id}`); window.Luna.toast("Menu item deleted.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to delete menu item.", "error"); }
    }

    async function handleTableSubmit(event) {
        event.preventDefault();
        const id = document.getElementById("tableId").value;
        const payload = {
            tableNumber: Number(document.getElementById("tableNumber").value),
            capacity: Number(document.getElementById("tableCapacity").value),
            type: document.getElementById("tableType").value,
            available: document.getElementById("tableAvailable").value === "true",
            price: Number(document.getElementById("tablePrice").value)
        };
        try {
            await (id ? window.LunaApi.put(`/api/tables/${id}`, payload) : window.LunaApi.post("/api/tables", payload));
            resetForm("tableForm", "tableId", "tableSubmitButton", "tableCancelEdit", "Save Table Blueprint");
            window.Luna.toast(id ? "Table updated." : "Table added.", "success");
            await loadAdminData();
        } catch (error) { window.Luna.toast(error.message || "Failed to save table.", "error"); }
    }

    function editTable(id) {
        const table = state.tables.find((t) => String(t.id) === String(id));
        if (!table) return;
        switchSection("tables");
        document.getElementById("tableId").value = table.id;
        document.getElementById("tableNumber").value = table.tableNumber || "";
        document.getElementById("tableCapacity").value = table.capacity || "";
        document.getElementById("tableType").value = table.type || "SOLO";
        document.getElementById("tablePrice").value = table.price || 0;
        document.getElementById("tableAvailable").value = String(Boolean(table.available));
        document.getElementById("tableSubmitButton").textContent = "Update Table";
        document.getElementById("tableCancelEdit").hidden = false;
        document.getElementById("tableForm").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function deleteTable(id) {
        const ok = await window.Luna.confirmDialog({ title: "Delete this table?", message: "Any linked reservations may be affected. This cannot be undone.", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/tables/${id}`); window.Luna.toast("Table deleted.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to delete table.", "error"); }
    }

    function editUser(id) {
        const user = state.users.find((u) => String(u.id) === String(id));
        if (!user) return;
        switchSection("users");
        document.getElementById("userId").value = user.id;
        document.getElementById("userName").value = user.name || "";
        document.getElementById("userEmail").value = user.email || "";
        document.getElementById("userRole").value = user.userRole || "CUSTOMER";
        document.getElementById("userSubmitButton").textContent = "Update User";
        document.getElementById("userCancelEdit").hidden = false;
        document.getElementById("userForm").scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function handleUserSubmit(event) {
        event.preventDefault();
        const id = document.getElementById("userId").value;
        if (!id) { window.Luna.toast("Choose a user to edit first.", "error"); return; }
        const payload = {
            name: document.getElementById("userName").value.trim(),
            email: document.getElementById("userEmail").value.trim(),
            userRole: document.getElementById("userRole").value
        };
        try {
            await window.LunaApi.put(`/api/auth/users/${id}`, payload);
            resetForm("userForm", "userId", "userSubmitButton", "userCancelEdit", "Update Account Authority");
            window.Luna.toast("User updated.", "success");
            await loadAdminData();
        } catch (error) { window.Luna.toast(error.message || "Failed to update user.", "error"); }
    }

    async function deleteUser(id) {
        const ok = await window.Luna.confirmDialog({ title: "Delete this user?", message: "Their account and access will be permanently removed.", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/auth/users/${id}`); window.Luna.toast("User deleted.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to delete user.", "error"); }
    }

    async function deleteReservation(id) {
        const ok = await window.Luna.confirmDialog({ title: "Cancel this reservation?", message: "The guest's booking will be removed from the system.", confirmLabel: "Cancel Booking", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/reservations/${id}`); window.Luna.toast("Reservation cancelled.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to cancel reservation.", "error"); }
    }

    async function deletePayment(id) {
        const ok = await window.Luna.confirmDialog({ title: "Delete this payment record?", message: "This removes the settlement entry permanently.", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/payments/${id}`); window.Luna.toast("Payment deleted.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to delete payment.", "error"); }
    }

    async function deleteFeedback(id) {
        const ok = await window.Luna.confirmDialog({ title: "Delete this feedback?", message: "This guest review will be permanently removed.", confirmLabel: "Delete", danger: true });
        if (!ok) return;
        try { await window.LunaApi.del(`/api/feedbacks/${id}`); window.Luna.toast("Feedback deleted.", "success"); await loadAdminData(); }
        catch (error) { window.Luna.toast(error.message || "Failed to delete feedback.", "error"); }
    }

    function handleClicks(event) {
        const sectionBtn = event.target.closest("[data-section]");
        if (sectionBtn) { switchSection(sectionBtn.dataset.section); return; }

        const floorBtn = event.target.closest("[data-floor-table]");
        if (floorBtn) { showFloorTableDetail(floorBtn.dataset.floorTable); return; }

        const map = [
            ["data-edit-table", editTable], ["data-delete-table", deleteTable],
            ["data-edit-menu", editMenuItem], ["data-delete-menu", deleteMenuItem],
            ["data-edit-user", editUser], ["data-delete-user", deleteUser],
            ["data-delete-reservation", deleteReservation],
            ["data-delete-payment", deletePayment],
            ["data-delete-feedback", deleteFeedback]
        ];
        for (const [attr, handler] of map) {
            const btn = event.target.closest(`[${attr}]`);
            if (btn) { handler(btn.getAttribute(attr)); return; }
        }
    }

    function init() {
        document.addEventListener("click", handleClicks);
        els.refreshButton?.addEventListener("click", loadAdminData);
        document.getElementById("tableForm")?.addEventListener("submit", handleTableSubmit);
        document.getElementById("menuForm")?.addEventListener("submit", handleMenuSubmit);
        document.getElementById("userForm")?.addEventListener("submit", handleUserSubmit);
        document.getElementById("tableCancelEdit")?.addEventListener("click", () => resetForm("tableForm", "tableId", "tableSubmitButton", "tableCancelEdit", "Save Table Blueprint"));
        document.getElementById("menuCancelEdit")?.addEventListener("click", () => resetForm("menuForm", "menuItemId", "menuSubmitButton", "menuCancelEdit", "Commit Provision Entry"));
        document.getElementById("userCancelEdit")?.addEventListener("click", () => resetForm("userForm", "userId", "userSubmitButton", "userCancelEdit", "Update Account Authority"));

        bindSearchInput("users", "usersSearch");
        bindSearchInput("menu", "menuSearch");
        bindSearchInput("tables", "tablesSearch");
        bindSearchInput("feedbacks", "feedbacksSearch");
        bindSearchInput("payments", "paymentsSearch");
        bindSearchInput("reservations", "reservationsSearch");

        updateSession();
        switchSection("dashboard");
        loadAdminData();
        startFloorAutoRefresh();
    }

    let floorRefreshTimer = null;
    function startFloorAutoRefresh() {
        if (floorRefreshTimer) return;
        floorRefreshTimer = setInterval(() => {
            if (document.hidden) return;
            loadAdminData(true);
        }, 6000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
