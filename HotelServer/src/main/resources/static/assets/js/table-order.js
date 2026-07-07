/**
 * Luna Cove — table-order.js
 * Menu ordering screen for an existing reservation.
 * Backend contract preserved exactly: GET /api/reservations, GET /api/menu,
 * GET /api/auth/users/{id}; checkout handed off to payment.html via localStorage.
 */
(() => {
    const state = { auth: null, user: null, reservation: null, menuItems: [], activeCategory: "FOOD", cart: {} };

    const els = {
        meta: document.getElementById("orderReservationMeta"),
        status: document.getElementById("orderStatus"),
        categoryTabs: document.getElementById("orderCategoryTabs"),
        list: document.getElementById("orderMenuList"),
        subtotal: document.getElementById("orderSubtotal"),
        total: document.getElementById("orderTotal"),
        message: document.getElementById("orderMessage"),
        placeOrderButton: document.getElementById("placeOrderButton")
    };

    function getPendingCheckout() {
        try { return JSON.parse(localStorage.getItem("hotelPendingCheckout") || "null"); } catch (e) { return null; }
    }

    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }
    function formatCategory(c) { return c === "DRINK" ? "Drink" : c === "DESSERT" ? "Dessert" : "Food"; }

    function getMenuItemImage(item) {
        return window.LunaMenuImages.getMenuImagePath(item);
    }

    function getCartQuantity(itemId) { return Number(state.cart[itemId] || 0); }
    function getCartLines() {
        return state.menuItems
            .map((item) => ({ id: item.id, name: item.name || "Menu item", price: Number(item.price || 0), quantity: getCartQuantity(item.id) }))
            .filter((i) => i.quantity > 0);
    }

    function renderTotals() {
        const subtotal = getCartLines().reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (els.subtotal) els.subtotal.textContent = currency(subtotal);
        if (els.total) els.total.textContent = currency(subtotal);
        if (els.placeOrderButton) els.placeOrderButton.disabled = subtotal <= 0;
    }

    function renderMenu() {
        if (!els.list) return;
        const items = state.menuItems.filter((i) => i.category === state.activeCategory);

        els.categoryTabs?.querySelectorAll("[data-order-category]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.orderCategory === state.activeCategory);
        });

        if (items.length === 0) {
            const emptyLabel = state.activeCategory === "DRINK" ? "drinks" : state.activeCategory === "DESSERT" ? "desserts" : "food items";
            els.list.innerHTML = `<div class="empty-state">No ${emptyLabel} are available right now.</div>`;
            renderTotals();
            return;
        }

        els.list.innerHTML = items.map((item) => {
            const qty = getCartQuantity(item.id);
            const lineTotal = Number(item.price || 0) * qty;
            return `
                <article class="order-menu-row">
                    <div class="order-product">
                        <img src="${getMenuItemImage(item)}" alt="${esc(item.name)}" loading="lazy">
                        <div><strong>${esc(item.name)}</strong><span>${formatCategory(item.category)} for reserved table service</span></div>
                    </div>
                    <strong>LKR ${currency(item.price)}</strong>
                    <div class="order-quantity">
                        <button type="button" data-decrease="${item.id}" aria-label="Decrease ${esc(item.name)}">&minus;</button>
                        <span>${qty}</span>
                        <button type="button" data-increase="${item.id}" aria-label="Increase ${esc(item.name)}">+</button>
                    </div>
                    <strong style="text-align:right;">LKR ${currency(lineTotal)}</strong>
                </article>
            `;
        }).join("");

        renderTotals();
    }

    function restorePendingCart() {
        const pending = getPendingCheckout();
        if (!pending || String(pending.userId) !== String(window.Luna.getSessionOwnerId()) || String(pending.reservationId) !== String(state.reservation?.id)) return;
        state.cart = (pending.items || []).reduce((cart, item) => {
            if (item.id != null && Number(item.quantity || 0) > 0) cart[item.id] = Number(item.quantity || 0);
            return cart;
        }, {});
    }

    function changeQuantity(itemId, delta) {
        const next = Math.max(0, getCartQuantity(itemId) + delta);
        if (next === 0) delete state.cart[itemId]; else state.cart[itemId] = next;
        renderMenu();
    }

    function placeOrder() {
        const lines = getCartLines();
        if (lines.length === 0) {
            if (els.message) { els.message.textContent = "Choose at least one menu item before proceeding to payment."; els.message.style.color = "var(--color-danger)"; }
            return;
        }
        const menuTotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const res = state.reservation;
        const tablePrice = Number(res?.table?.price || 0);

        localStorage.setItem("hotelPendingCheckout", JSON.stringify({
            userId: window.Luna.getSessionOwnerId(), reservationId: res.id, customerName: res.customerName,
            tableId: res.table?.id, tableNumber: res.table?.tableNumber, tablePrice,
            reservationDate: res.date, reservationTime: res.time, createdAt: new Date().toISOString(),
            items: lines, menuTotal, total: menuTotal + tablePrice
        }));

        window.location.href = "payment.html";
    }

    async function init() {
        state.auth = window.Luna.getAuth();

        const reservationId = new URLSearchParams(window.location.search).get("reservationId");
        if (!reservationId) {
            if (els.status) { els.status.textContent = "Open this page from Your Table on a current booking."; els.status.classList.add("is-error"); }
            if (els.placeOrderButton) els.placeOrderButton.disabled = true;
            return;
        }

        try {
            const [user, reservations, menuItems] = await Promise.all([
                state.auth?.userId ? window.LunaApi.get(`/api/auth/users/${state.auth.userId}`).catch(() => null) : Promise.resolve(null),
                window.LunaApi.get("/api/reservations"),
                window.LunaApi.get("/api/menu")
            ]);

            state.user = user;
            state.reservation = (Array.isArray(reservations) ? reservations : []).find((r) => String(r.id) === String(reservationId));

            if (!state.reservation) {
                if (els.status) { els.status.textContent = "We couldn't find that reservation. Please re-scan the table's QR code or check the link."; els.status.classList.add("is-error"); }
                if (els.placeOrderButton) els.placeOrderButton.disabled = true;
                return;
            }

            state.menuItems = Array.isArray(menuItems) ? menuItems : [];
            restorePendingCart();

            const res = state.reservation;
            const tableNum = res.table?.tableNumber ?? "N/A";
            if (els.meta) els.meta.textContent = `Reservation #${res.id} | Table ${tableNum} | ${res.date || "Date N/A"} at ${res.time || "Time N/A"}`;
            if (els.status) els.status.textContent = `Ordering for Table ${tableNum}.`;

            renderMenu();

            els.categoryTabs?.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-order-category]");
                if (!btn) return;
                state.activeCategory = btn.dataset.orderCategory || "FOOD";
                renderMenu();
            });
            els.list?.addEventListener("click", (e) => {
                const inc = e.target.closest("[data-increase]");
                if (inc) { changeQuantity(inc.dataset.increase, 1); return; }
                const dec = e.target.closest("[data-decrease]");
                if (dec) changeQuantity(dec.dataset.decrease, -1);
            });
            els.placeOrderButton?.addEventListener("click", placeOrder);
        } catch (error) {
            if (els.status) { els.status.textContent = error.message || "Unable to load your table order."; els.status.classList.add("is-error"); }
            if (els.placeOrderButton) els.placeOrderButton.disabled = true;
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
