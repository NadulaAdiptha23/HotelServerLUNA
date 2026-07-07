/**
 * Luna Cove — payment.js
 * Backend contract preserved exactly: POST /api/payments
 *   { amount, menuSubtotal, tableAmount, orderItemsJson, reservationSnapshot, method, status, reservation:{id} }
 */
(() => {
    const state = { auth: null, user: null, checkout: null, method: "CARD" };

    const els = {
        badge: document.getElementById("paymentReservationBadge"),
        customerName: document.getElementById("paymentCustomerName"),
        customerEmail: document.getElementById("paymentCustomerEmail"),
        tableNumber: document.getElementById("paymentTableNumber"),
        reservedTime: document.getElementById("paymentReservedTime"),
        methodGroup: document.getElementById("paymentMethodGroup"),
        cardPanel: document.getElementById("cardPanel"),
        qrPanel: document.getElementById("qrPanel"),
        ccNumberPreview: document.getElementById("ccNumberPreview"),
        ccNamePreview: document.getElementById("ccNamePreview"),
        ccExpiryPreview: document.getElementById("ccExpiryPreview"),
        cardNumberInput: document.getElementById("cardNumberInput"),
        cardNameInput: document.getElementById("cardNameInput"),
        cardExpiryInput: document.getElementById("cardExpiryInput"),
        orderItems: document.getElementById("paymentOrderItems"),
        menuSubtotal: document.getElementById("paymentMenuSubtotal"),
        tablePrice: document.getElementById("paymentTablePriceSummary"),
        grandTotal: document.getElementById("paymentGrandTotal"),
        confirmButton: document.getElementById("confirmPaymentButton"),
        message: document.getElementById("paymentMessage"),
        checkoutStep: document.getElementById("checkoutStep"),
        successStep: document.getElementById("successStep"),
        receiptBody: document.getElementById("receiptBody"),
        receiptEmailNote: document.getElementById("receiptEmailNote")
    };

    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }

    function getPendingCheckout() {
        try { return JSON.parse(localStorage.getItem("hotelPendingCheckout") || "null"); } catch (e) { return null; }
    }
    function getMenuOrders() {
        try { return JSON.parse(localStorage.getItem("hotelMenuOrders") || "{}"); } catch (e) { return {}; }
    }
    function setMenuOrders(orders) { localStorage.setItem("hotelMenuOrders", JSON.stringify(orders)); }

    function renderPaymentPage() {
        const checkout = state.checkout;
        if (!checkout) return;

        const user = state.user || {};
        const name = user.name || state.auth?.name || checkout.customerName || "Guest Customer";
        const email = user.email || state.auth?.email || "No contact info available";

        const menuTotal = Number(checkout.menuTotal || 0);
        const tablePrice = Number(checkout.tablePrice || 0);
        const total = Number(checkout.total || (menuTotal + tablePrice));

        if (els.badge) els.badge.textContent = `Reservation #${checkout.reservationId}`;
        if (els.customerName) els.customerName.textContent = name;
        if (els.customerEmail) els.customerEmail.textContent = email;
        if (els.tableNumber) els.tableNumber.textContent = `Table ${checkout.tableNumber ?? "N/A"}`;
        if (els.reservedTime) els.reservedTime.textContent = `${checkout.reservationDate || "Date N/A"} at ${checkout.reservationTime || "Time N/A"}`;
        if (els.menuSubtotal) els.menuSubtotal.textContent = currency(menuTotal);
        if (els.tablePrice) els.tablePrice.textContent = currency(tablePrice);
        if (els.grandTotal) els.grandTotal.textContent = currency(total);
        if (els.ccNamePreview) els.ccNamePreview.textContent = name.toUpperCase();

        if (els.orderItems) {
            const itemsArray = checkout.items || [];
            els.orderItems.innerHTML = itemsArray.length === 0
                ? `<div class="empty-state">No menu items linked to this checkout.</div>`
                : itemsArray.map((item) => `
                    <article class="payment-order-item">
                        <div><strong>${esc(item.name || "Menu Item")}</strong><span>Qty: ${esc(item.quantity || 1)}</span></div>
                        <strong>LKR ${currency(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
                    </article>
                `).join("");
        }
    }

    function selectPaymentMethod(method) {
        state.method = method;
        els.methodGroup?.querySelectorAll("[data-payment-method]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.paymentMethod === method);
        });
        if (els.cardPanel) els.cardPanel.hidden = method !== "CARD";
        if (els.qrPanel) els.qrPanel.hidden = method !== "CASH";
    }

    function setMessage(message, isError = false) {
        if (!els.message) return;
        els.message.textContent = message;
        els.message.style.color = isError ? "var(--color-danger)" : "var(--color-success)";
    }

    function rememberPaidOrder() {
        if (!state.auth?.userId || !state.checkout) return;
        const orders = getMenuOrders();
        const userId = state.auth.userId;
        const userOrders = (orders[userId] || []).filter((o) => String(o.reservationId) !== String(state.checkout.reservationId));
        userOrders.push({ ...state.checkout, paymentMethod: state.method, paidAt: new Date().toISOString() });
        orders[userId] = userOrders;
        setMenuOrders(orders);
    }

    function renderReceipt() {
        const checkout = state.checkout;
        const menuTotal = Number(checkout.menuTotal || 0);
        const tablePrice = Number(checkout.tablePrice || 0);
        const total = Number(checkout.total || (menuTotal + tablePrice));
        if (!els.receiptBody) return;
        els.receiptBody.innerHTML = `
            <div class="receipt-row"><span>Reservation</span><span>#${checkout.reservationId}</span></div>
            <div class="receipt-row"><span>Table</span><span>${esc(checkout.tableNumber ?? "N/A")}</span></div>
            <div class="receipt-row"><span>Method</span><span>${state.method === "CARD" ? "Premium Card" : "QR / Cash"}</span></div>
            <div class="receipt-row"><span>Menu Subtotal</span><span>LKR ${currency(menuTotal)}</span></div>
            <div class="receipt-row"><span>Table Fee</span><span>LKR ${currency(tablePrice)}</span></div>
            <div class="receipt-row"><span>Paid At</span><span>${new Date().toLocaleString()}</span></div>
            <div class="receipt-row" style="border-top: 1px solid var(--color-ink); margin-top: var(--space-2xs); padding-top: var(--space-2xs);">
                <span>Total Paid</span><span class="receipt-total">LKR ${currency(total)}</span>
            </div>
        `;

        const guestEmail = state.user?.email || state.auth?.email;
        if (els.receiptEmailNote) {
            els.receiptEmailNote.hidden = !guestEmail;
            if (guestEmail) els.receiptEmailNote.textContent = `A copy of this receipt is on its way to ${guestEmail}.`;
        }
    }

    async function confirmPayment() {
        if (!state.checkout) return;
        if (els.confirmButton) {
            els.confirmButton.disabled = true;
            els.confirmButton.innerHTML = `<span class="spinner" style="border-color: rgba(26,20,9,0.25); border-top-color:#1a1409;"></span>&nbsp; Processing…`;
        }

        const menuTotal = Number(state.checkout.menuTotal || 0);
        const tablePrice = Number(state.checkout.tablePrice || 0);
        const total = Number(state.checkout.total || (menuTotal + tablePrice));

        const payload = {
            amount: total,
            menuSubtotal: menuTotal,
            tableAmount: tablePrice,
            orderItemsJson: JSON.stringify(state.checkout.items || []),
            reservationSnapshot: JSON.stringify({
                reservationId: state.checkout.reservationId,
                customerName: state.checkout.customerName,
                tableId: state.checkout.tableId,
                tableNumber: state.checkout.tableNumber,
                reservationDate: state.checkout.reservationDate,
                reservationTime: state.checkout.reservationTime
            }),
            method: state.method,
            status: "PAID",
            reservation: { id: Number(state.checkout.reservationId) }
        };

        try {
            await window.LunaApi.post("/api/payments", payload);
            rememberPaidOrder();
            renderReceipt();
            if (els.checkoutStep) els.checkoutStep.hidden = true;
            if (els.successStep) { els.successStep.hidden = false; els.successStep.scrollIntoView({ behavior: "smooth" }); }
            localStorage.removeItem("hotelPendingCheckout");
            window.Luna.toast("Payment settled successfully.", "success");
        } catch (error) {
            if (els.confirmButton) { els.confirmButton.disabled = false; els.confirmButton.textContent = "Confirm & Guarantee"; }
            setMessage(error.message || "Payment transaction settlement was rejected.", true);
            window.Luna.toast(error.message || "Payment failed. Please try again.", "error");
        }
    }

    function bindCardPreview() {
        els.cardNumberInput?.addEventListener("input", (e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
            e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
            els.ccNumberPreview.textContent = (digits.padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim());
        });
        els.cardExpiryInput?.addEventListener("input", (e) => {
            let v = e.target.value.replace(/\D/g, "").slice(0, 4);
            if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
            e.target.value = v;
            els.ccExpiryPreview.textContent = v || "MM/YY";
        });
    }

    async function init() {
        state.auth = window.Luna.getAuth();
        state.checkout = getPendingCheckout();

        if (!state.checkout || String(state.checkout.userId) !== String(window.Luna.getSessionOwnerId())) {
            setMessage("No active checkout found. Please build an order from your table first.", true);
            if (els.confirmButton) els.confirmButton.disabled = true;
            return;
        }

        if (state.auth?.userId) {
            try {
                state.user = await window.LunaApi.get(`/api/auth/users/${state.auth.userId}`).catch(() => null);
            } catch (e) { state.user = null; }
        }

        renderPaymentPage();
        bindCardPreview();
        selectPaymentMethod("CARD");

        els.methodGroup?.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-payment-method]");
            if (btn) selectPaymentMethod(btn.dataset.paymentMethod);
        });
        els.confirmButton?.addEventListener("click", confirmPayment);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
