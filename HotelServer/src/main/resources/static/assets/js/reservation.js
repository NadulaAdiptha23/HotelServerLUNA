/**
 * Luna Cove — reservation.js
 * Powers reservations.html: table+date/time booking flow, confirmation,
 * and the "my reservations" dashboard. Feedback management lives on
 * profile.html (assets/js/profile.js).
 * Backend contract preserved: POST /api/reservations { customerName, date, time, ctime, table:{id} }
 */
(() => {
    const state = {
        tables: [],
        reservations: [],
        activeType: "SOLO",
        selectedTableId: null,
        guestCount: 2,
        lastConfirmed: null
    };
    const els = {};

    function auth() { return window.Luna.getAuth(); }
    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }

    function cacheEls() {
        els.typeTabs = document.getElementById("typeTabs");
        els.tablePicker = document.getElementById("miniTablePicker");
        els.form = document.getElementById("reservationForm");
        els.customerName = document.getElementById("customerName");
        els.date = document.getElementById("reservationDate");
        els.time = document.getElementById("reservationTime");
        els.checkoutTime = document.getElementById("checkoutTime");
        els.guestCount = document.getElementById("guestCountValue");
        els.summaryTable = document.getElementById("summaryTable");
        els.summaryType = document.getElementById("summaryType");
        els.summaryGuests = document.getElementById("summaryGuests");
        els.summaryPrice = document.getElementById("summaryPrice");
        els.bookingStep = document.getElementById("bookingStep");
        els.confirmationStep = document.getElementById("confirmationStep");
        els.confirmDetails = document.getElementById("confirmationDetails");
        els.confirmOrderLink = document.getElementById("confirmOrderLink");
        els.confirmEmailNote = document.getElementById("confirmEmailNote");
        els.confirmQrCode = document.getElementById("confirmQrCode");
        els.reservationList = document.getElementById("reservationList");
        els.reservationPill = document.getElementById("reservationPill");
    }

    function isOwnReservation(reservation) {
        const a = auth();
        if (!a?.userId || !reservation) return false;
        if (reservation.userId !== undefined && reservation.userId !== null) return String(reservation.userId) === String(a.userId);
        if (reservation.user?.id !== undefined && reservation.user?.id !== null) return String(reservation.user.id) === String(a.userId);
        const owners = (() => { try { return JSON.parse(localStorage.getItem("hotelReservationOwners") || "{}"); } catch (e) { return {}; } })();
        if ((owners[a.userId] || []).map(String).includes(String(reservation.id))) return true;
        return String(reservation.customerName || "").trim().toLowerCase() === String(a.name || "").trim().toLowerCase();
    }

    function rememberOwnership(reservationId) {
        const a = auth();
        if (!a?.userId) return;
        const owners = (() => { try { return JSON.parse(localStorage.getItem("hotelReservationOwners") || "{}"); } catch (e) { return {}; } })();
        const set = new Set((owners[a.userId] || []).map(String));
        set.add(String(reservationId));
        owners[a.userId] = Array.from(set);
        localStorage.setItem("hotelReservationOwners", JSON.stringify(owners));
    }

    /* ---------------- Table picker ---------------- */
    function tablesByType(type) { return state.tables.filter((t) => t.type === type); }

    function renderTypeTabs() {
        if (!els.typeTabs) return;
        els.typeTabs.querySelectorAll("[data-res-type]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.resType === state.activeType);
        });
    }

    function renderTablePicker() {
        if (!els.tablePicker) return;
        const options = tablesByType(state.activeType);
        if (options.length === 0) {
            els.tablePicker.innerHTML = `<div class="empty-state">No tables in this category.</div>`;
            return;
        }
        els.tablePicker.innerHTML = options.map((t) => `
            <div class="mini-table-option ${!t.available ? "is-disabled" : ""} ${String(state.selectedTableId) === String(t.id) ? "is-selected" : ""}" data-select-table="${t.id}">
                <strong>#${esc(t.tableNumber)}</strong><br>
                <span style="color:var(--color-ink-soft);">${t.capacity} guests &middot; LKR ${currency(t.price)}</span>
            </div>
        `).join("");
        renderSummary();
    }

    function getSelectedTable() {
        return state.tables.find((t) => String(t.id) === String(state.selectedTableId));
    }

    function renderSummary() {
        const table = getSelectedTable();
        if (els.summaryTable) els.summaryTable.textContent = table ? `Table ${table.tableNumber}` : "Not selected";
        if (els.summaryType) els.summaryType.textContent = state.activeType;
        if (els.summaryGuests) els.summaryGuests.textContent = state.guestCount;
        if (els.summaryPrice) els.summaryPrice.textContent = currency(table?.price || 0);
    }

    /* ---------------- Guest stepper ---------------- */
    function changeGuestCount(delta) {
        state.guestCount = Math.max(1, Math.min(20, state.guestCount + delta));
        if (els.guestCount) els.guestCount.textContent = state.guestCount;
        renderSummary();
    }

    /* ---------------- Booking submit ---------------- */
    async function handleSubmit(event) {
        event.preventDefault();
        if (!window.Luna.isLoggedIn()) {
            window.Luna.toast("Please sign in to confirm your reservation.", "info");
            setTimeout(() => { window.location.href = "login.html?bookingRequired=1"; }, 500);
            return;
        }
        if (!state.selectedTableId) {
            window.Luna.toast("Please select a table before confirming.", "error");
            return;
        }

        const payload = {
            customerName: els.customerName.value.trim() || auth()?.name || auth()?.email,
            email: auth()?.email,
            date: els.date.value,
            time: els.time.value,
            ctime: els.checkoutTime.value,
            table: { id: state.selectedTableId }
        };

        const submitBtn = els.form.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner" style="border-color: rgba(26,20,9,0.25); border-top-color:#1a1409;"></span>&nbsp; Confirming…`;

        try {
            const result = await window.LunaApi.post("/api/reservations", payload);
            rememberOwnership(result.id);
            state.lastConfirmed = result;
            window.Luna.toast("Reservation confirmed! We can't wait to host you.", "success");
            renderConfirmation(result);
            await loadAll();
        } catch (error) {
            window.Luna.toast(error.message || "Could not confirm the reservation. Please try again.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirm Reservation";
        }
    }

    function renderConfirmation(reservation) {
        if (!els.bookingStep || !els.confirmationStep) return;
        els.bookingStep.hidden = true;
        els.confirmationStep.hidden = false;
        const table = reservation.table;
        els.confirmDetails.innerHTML = `
            <div class="summary-row"><span>Reservation</span><span>#${reservation.id}</span></div>
            <div class="summary-row"><span>Guest Name</span><span>${esc(reservation.customerName)}</span></div>
            <div class="summary-row"><span>Table</span><span>Table ${table?.tableNumber ?? "N/A"}</span></div>
            <div class="summary-row"><span>Date</span><span>${esc(reservation.date)}</span></div>
            <div class="summary-row"><span>Time</span><span>${esc(reservation.time || "N/A")}</span></div>
        `;
        if (els.confirmOrderLink) els.confirmOrderLink.href = `table-order.html?reservationId=${reservation.id}`;
        if (els.confirmEmailNote) {
            els.confirmEmailNote.hidden = !reservation.email;
            if (reservation.email) {
                els.confirmEmailNote.textContent = `A confirmation email is on its way to ${reservation.email}.`;
            }
        }
        if (els.confirmQrCode && window.LunaQR) {
            const orderUrl = new URL(`table-order.html?reservationId=${reservation.id}`, window.location.href).href;
            window.LunaQR.renderInto(els.confirmQrCode, orderUrl);
        }
        els.confirmationStep.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ---------------- My reservations dashboard ---------------- */
    function renderMyReservations() {
        if (!els.reservationList) return;
        const mine = state.reservations.filter(isOwnReservation);
        if (els.reservationPill) els.reservationPill.textContent = `${mine.length} active`;

        if (mine.length === 0) {
            els.reservationList.innerHTML = `<div class="empty-state">No reservations registered under your account yet.</div>`;
            return;
        }

        els.reservationList.innerHTML = mine.map((r) => `
            <article class="reservation-item-card">
                <div class="item-head"><h4 style="margin:0; font-size:1.05rem;">Reservation #${r.id}</h4><span class="badge badge-gold">Active</span></div>
                <p><strong>Guest:</strong> ${esc(r.customerName)}</p>
                <p><strong>Table:</strong> ${r.table?.tableNumber ?? "N/A"}</p>
                <p><strong>Schedule:</strong> ${esc(r.date)} @ ${esc(r.time || "N/A")}</p>
                <div style="margin-top: var(--space-2xs); display:flex; gap: var(--space-md); align-items:center;">
                    <a class="text-link" href="table-order.html?reservationId=${r.id}">Order food for this table &rarr;</a>
                    <button type="button" class="text-link" style="background:none; border:none; cursor:pointer;" data-show-qr="${r.id}">Show QR</button>
                </div>
            </article>
        `).join("");
    }

    /* ---------------- Data + events ---------------- */
    async function loadAll() {
        try {
            const [tables, reservations] = await Promise.all([
                window.LunaApi.get("/api/tables"),
                window.LunaApi.get("/api/reservations")
            ]);
            state.tables = tables || [];
            state.reservations = reservations || [];
        } catch (error) {
            window.Luna?.toast(error.message || "Failed to sync reservation data.", "error");
        }
        renderTypeTabs();
        renderTablePicker();
        renderMyReservations();
    }

    function setupEvents() {
        els.typeTabs?.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-res-type]");
            if (!btn) return;
            state.activeType = btn.dataset.resType;
            state.selectedTableId = null;
            renderTypeTabs();
            renderTablePicker();
        });

        els.tablePicker?.addEventListener("click", (e) => {
            const opt = e.target.closest("[data-select-table]");
            if (!opt || opt.classList.contains("is-disabled")) return;
            state.selectedTableId = opt.dataset.selectTable;
            renderTablePicker();
        });

        document.getElementById("guestIncrease")?.addEventListener("click", () => changeGuestCount(1));
        document.getElementById("guestDecrease")?.addEventListener("click", () => changeGuestCount(-1));

        els.form?.addEventListener("submit", handleSubmit);

        document.addEventListener("click", (e) => {
            const qrBtn = e.target.closest("[data-show-qr]");
            if (qrBtn) showReservationQr(qrBtn.dataset.showQr);
        });
    }

    function showReservationQr(reservationId) {
        const modal = window.Luna.showModal({
            title: "Scan To Order",
            bodyHtml: `
                <div id="qrModalCode" style="width:180px; height:180px; margin: 0 auto var(--space-sm); background:#fff; border-radius: var(--radius-sm); padding:8px; box-shadow: var(--shadow-sm);"></div>
                <p class="section-copy" style="font-size:0.85rem;">Point a phone camera at this code to open the ordering screen for Reservation #${reservationId}.</p>
            `,
            closeLabel: "Done"
        });
        if (window.LunaQR) {
            const orderUrl = new URL(`table-order.html?reservationId=${reservationId}`, window.location.href).href;
            window.LunaQR.renderInto(modal.element.querySelector("#qrModalCode"), orderUrl);
        }
    }

    function preselectFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const type = params.get("type");
        const tableId = params.get("tableId");
        if (type) state.activeType = type;
        if (tableId) state.selectedTableId = tableId;
    }

    function init() {
        cacheEls();
        preselectFromQuery();
        setupEvents();
        loadAll();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
