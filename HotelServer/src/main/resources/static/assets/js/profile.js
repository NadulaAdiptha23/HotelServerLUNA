/**
 * Luna Cove — profile.js
 * Backend contract preserved exactly: GET/PUT/DELETE /api/auth/users/{id},
 * GET /api/reservations, GET /api/payments, GET/POST/PUT/DELETE /api/feedbacks.
 */
(() => {
    const state = { auth: null, user: null, reservations: [], payments: [], orders: [], feedbacks: [] };
    const carousel = { items: [], index: 0, timer: null };

    const els = {
        form: document.getElementById("profileForm"),
        name: document.getElementById("profileName"),
        email: document.getElementById("profileEmail"),
        password: document.getElementById("profilePassword"),
        displayName: document.getElementById("profileDisplayName"),
        displayEmail: document.getElementById("profileDisplayEmail"),
        avatar: document.getElementById("profileInitials"),
        message: document.getElementById("profileMessage"),
        reservationCount: document.getElementById("reservationHistoryCount"),
        reservationList: document.getElementById("reservationHistoryList"),
        orderTotal: document.getElementById("menuOrderTotal"),
        orderList: document.getElementById("menuOrderList"),
        paymentList: document.getElementById("paymentHistoryList"),
        deleteButton: document.getElementById("deleteProfileButton"),
        statReservations: document.getElementById("statReservations"),
        statOrders: document.getElementById("statOrders"),
        statSpent: document.getElementById("statSpent"),
        feedbackForm: document.getElementById("feedbackForm"),
        feedbackReservationId: document.getElementById("feedbackReservationId"),
        feedbackId: document.getElementById("feedbackId"),
        feedbackCancelEdit: document.getElementById("feedbackCancelEdit"),
        feedbackCount: document.getElementById("feedbackCount"),
        feedbackCarousel: document.getElementById("feedbackCarousel"),
        feedbackCarouselTrack: document.getElementById("feedbackCarouselTrack"),
        feedbackCarouselDots: document.getElementById("feedbackCarouselDots")
    };

    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }
    function getInitials(v) { return window.Luna.getInitials ? window.Luna.getInitials(v) : (v || "CU").slice(0, 2).toUpperCase(); }

    function getReservationOwners() {
        try { return JSON.parse(localStorage.getItem("hotelReservationOwners") || "{}"); } catch (e) { return {}; }
    }
    function getMenuOrders() {
        try { return JSON.parse(localStorage.getItem("hotelMenuOrders") || "{}"); } catch (e) { return {}; }
    }

    function isCurrentUserReservation(reservation) {
        const auth = state.auth;
        if (!auth?.userId) return false;
        if (reservation.userId !== undefined && reservation.userId !== null) return String(reservation.userId) === String(auth.userId);
        if (reservation.user?.id !== undefined && reservation.user?.id !== null) return String(reservation.user.id) === String(auth.userId);
        const owners = getReservationOwners();
        if ((owners[auth.userId] || []).map(String).includes(String(reservation.id))) return true;
        const userName = state.user?.name || auth.name;
        return Boolean(userName) && String(reservation.customerName || "").trim().toLowerCase() === String(userName).trim().toLowerCase();
    }

    function setMessage(message, isError = false) {
        if (!els.message) return;
        els.message.textContent = message;
        els.message.style.color = isError ? "var(--color-danger)" : "var(--color-success)";
    }

    function renderProfile() {
        const auth = state.auth;
        const user = state.user || {};
        const name = user.name || auth?.name || "";
        const email = user.email || auth?.email || "";

        if (els.name) els.name.value = name;
        if (els.email) els.email.value = email;
        if (els.password) els.password.value = "";
        if (els.displayName) els.displayName.textContent = name || "Customer";
        if (els.displayEmail) els.displayEmail.textContent = email || "No email available";
        if (els.avatar) els.avatar.textContent = getInitials(name || email);
    }

    function renderReservations() {
        if (!els.reservationList) return;
        const reservations = state.reservations.filter(isCurrentUserReservation);
        if (els.reservationCount) els.reservationCount.textContent = `${reservations.length} booking${reservations.length === 1 ? "" : "s"}`;
        if (els.statReservations) els.statReservations.textContent = reservations.length;

        if (reservations.length === 0) {
            els.reservationList.innerHTML = `<div class="empty-state">No reservations found for this account.</div>`;
            return;
        }

        els.reservationList.innerHTML = reservations.map((r) => `
            <article class="history-item-card">
                <div>
                    <strong>Reservation #${esc(r.id)}</strong>
                    <span>${esc(r.date || "Date N/A")} | ${esc(r.time || "Time N/A")} - ${esc(r.ctime || "Checkout N/A")}</span>
                </div>
                <div style="text-align:right;">
                    <strong>Table ${esc(r.table?.tableNumber ?? "N/A")}</strong>
                    <span>${esc(r.table?.type || "Table")}${r.table?.price ? ` &middot; LKR ${currency(r.table.price)}` : ""}</span>
                </div>
                <a class="btn btn-ghost btn-sm" href="table-order.html?reservationId=${r.id}">Order Food</a>
                <button type="button" class="btn btn-ghost btn-sm" data-show-qr="${r.id}">Show QR</button>
            </article>
        `).join("");
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

    function renderOrders() {
        if (!els.orderList) return;
        const storedOrders = getMenuOrders();
        const orders = storedOrders[state.auth?.userId] || [];
        state.orders = orders;

        const grandTotal = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        if (els.orderTotal) els.orderTotal.textContent = `LKR ${currency(grandTotal)}`;
        if (els.statOrders) els.statOrders.textContent = orders.length;
        if (els.statSpent) els.statSpent.textContent = `LKR ${currency(grandTotal)}`;

        if (orders.length === 0) {
            els.orderList.innerHTML = `<div class="empty-state">No menu orders recorded yet.</div>`;
            return;
        }

        els.orderList.innerHTML = orders.map((order) => {
            const rows = (order.items || []).map((item) => `
                <div class="order-row-grid">
                    <span>${esc(item.name)}</span><span>LKR ${currency(item.price)}</span><span>${esc(item.quantity)}</span>
                    <strong>LKR ${currency(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                </div>
            `).join("");
            return `
                <article class="order-card">
                    <div class="order-card-head"><strong>Reservation #${esc(order.reservationId)}</strong><span class="badge badge-gold">LKR ${currency(order.total)}</span></div>
                    <div class="order-row-grid is-head"><span>Item</span><span>Price</span><span>Qty</span><span>Total</span></div>
                    ${rows}
                </article>
            `;
        }).join("");
    }

    function renderPayments() {
        if (!els.paymentList) return;
        const mine = state.payments.filter((p) => isCurrentUserReservation(p.reservation || {}));
        if (mine.length === 0) {
            els.paymentList.innerHTML = `<div class="empty-state">No completed payments yet.</div>`;
            return;
        }
        els.paymentList.innerHTML = mine.map((p) => `
            <article class="history-item-card">
                <div><strong>Payment #${esc(p.id)}</strong><span>Reservation #${esc(p.reservation?.id ?? "N/A")} &middot; ${esc(p.method || "N/A")}</span></div>
                <div style="text-align:right;"><strong>LKR ${currency(p.amount)}</strong><span class="badge ${p.status === "PAID" ? "badge-success" : "badge-neutral"}">${esc(p.status || "N/A")}</span></div>
            </article>
        `).join("");
    }

    async function loadProfilePage() {
        state.auth = window.Luna.getAuth();

        try {
            const [user, reservations, payments, feedbacks] = await Promise.all([
                state.auth.userId ? window.LunaApi.get(`/api/auth/users/${state.auth.userId}`) : Promise.resolve(null),
                window.LunaApi.get("/api/reservations"),
                window.LunaApi.get("/api/payments").catch(() => []),
                window.LunaApi.get("/api/feedbacks").catch(() => [])
            ]);

            state.user = user;
            state.reservations = Array.isArray(reservations) ? reservations : [];
            state.payments = Array.isArray(payments) ? payments : [];
            state.feedbacks = Array.isArray(feedbacks) ? feedbacks : [];

            const updatedAuth = { ...state.auth, name: user?.name || state.auth.name, email: user?.email || state.auth.email, userRole: user?.userRole || state.auth.userRole };
            localStorage.setItem(window.Luna.AUTH_KEY, JSON.stringify(updatedAuth));
            state.auth = window.Luna.getAuth();

            renderProfile();
            renderReservations();
            renderOrders();
            renderPayments();
            renderFeedbackOptions();
            renderFeedbackCarousel();
            setMessage("Profile synchronization complete.");
        } catch (error) {
            renderProfile();
            renderReservations();
            renderOrders();
            renderPayments();
            renderFeedbackOptions();
            renderFeedbackCarousel();
            setMessage(error.message || "Unable to fully load account analytics.", true);
        }
    }

    async function updateProfile(event) {
        event.preventDefault();
        const payload = { name: els.name.value.trim(), email: els.email.value.trim() };
        if (els.password?.value) payload.password = els.password.value;

        const submitBtn = document.getElementById("updateProfileButton");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const updatedUser = await window.LunaApi.put(`/api/auth/users/${state.auth.userId}`, payload);
            state.user = updatedUser;
            const updatedAuth = { ...state.auth, name: updatedUser.name || payload.name, email: updatedUser.email || payload.email, userRole: updatedUser.userRole || state.auth.userRole };
            localStorage.setItem(window.Luna.AUTH_KEY, JSON.stringify(updatedAuth));
            state.auth = window.Luna.getAuth();
            renderProfile();
            window.Luna.toast("Profile updated successfully.", "success");
            setMessage("Profile updated successfully.");
        } catch (error) {
            window.Luna.toast(error.message || "Could not update profile.", "error");
            setMessage(error.message || "Profile update was rejected.", true);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function deleteProfile() {
        const confirmed = await window.Luna.confirmDialog({
            title: "Close your account?",
            message: "This will permanently delete your account and all associated history. This action cannot be undone.",
            confirmLabel: "Delete Account",
            danger: true
        });
        if (!confirmed) return;

        try {
            await window.LunaApi.del(`/api/auth/users/${state.auth.userId}`);
            localStorage.removeItem(window.Luna.AUTH_KEY);
            localStorage.removeItem("hotelReservationOwners");
            localStorage.removeItem("hotelPendingCheckout");
            window.Luna.toast("Your account has been closed.", "success");
            setTimeout(() => { window.location.href = "register.html"; }, 700);
        } catch (error) {
            window.Luna.toast(error.message || "Could not delete account.", "error");
            setMessage(error.message || "Account deletion was rejected.", true);
        }
    }

    function stars(rating) {
        const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
        return "★".repeat(r) + "☆".repeat(5 - r);
    }

    function renderFeedbackOptions() {
        if (!els.feedbackReservationId) return;
        const current = els.feedbackReservationId.value;
        const mine = state.reservations.filter(isCurrentUserReservation);
        els.feedbackReservationId.innerHTML = `<option value="">Choose a reservation…</option>` +
            mine.map((r) => `<option value="${r.id}">#${r.id} — ${esc(r.customerName)} — Table ${r.table?.tableNumber ?? "N/A"}</option>`).join("");
        if (mine.some((r) => String(r.id) === current)) els.feedbackReservationId.value = current;
    }

    /* ---------------- Your Reviews — cycling carousel ---------------- */
    function stopCarouselAutoplay() {
        if (carousel.timer) {
            clearInterval(carousel.timer);
            carousel.timer = null;
        }
    }

    function startCarouselAutoplay() {
        stopCarouselAutoplay();
        if (carousel.items.length <= 1) return;
        carousel.timer = setInterval(() => {
            carousel.index = (carousel.index + 1) % carousel.items.length;
            renderCarouselSlide();
        }, 4500);
    }

    function renderCarouselDots() {
        if (!els.feedbackCarouselDots) return;
        if (carousel.items.length <= 1) {
            els.feedbackCarouselDots.innerHTML = "";
            return;
        }
        els.feedbackCarouselDots.innerHTML = carousel.items.map((_, i) => `
            <button type="button" class="feedback-carousel-dot ${i === carousel.index ? "is-active" : ""}" data-carousel-dot="${i}" aria-label="Show review ${i + 1}"></button>
        `).join("");
    }

    function renderCarouselSlide() {
        if (!els.feedbackCarouselTrack) return;
        const f = carousel.items[carousel.index];
        if (!f) {
            els.feedbackCarouselTrack.innerHTML = `<div class="empty-state">Your submitted feedback will appear here.</div>`;
            return;
        }
        els.feedbackCarouselTrack.innerHTML = `
            <article class="rating-item-card fade-in">
                <div class="item-head">
                    <h4 style="margin:0; font-size:1rem;">Table ${esc(f.reservation?.table?.tableNumber ?? "N/A")}</h4>
                    <span class="badge badge-gold">${esc(f.rating)}/5</span>
                </div>
                <p style="color: var(--color-gold-dark);">${stars(f.rating)}</p>
                <p>${esc(f.message || "No message provided.")}</p>
                <div style="display:flex; gap: var(--space-sm); margin-top: var(--space-2xs);">
                    <button class="text-link" type="button" style="background:none;border:none;cursor:pointer;" data-edit-feedback="${f.id}">Edit</button>
                    <button class="text-link" type="button" style="background:none;border:none;cursor:pointer; color:var(--color-danger);" data-delete-feedback="${f.id}">Delete</button>
                </div>
            </article>
        `;
        renderCarouselDots();
    }

    function renderFeedbackCarousel() {
        const a = state.auth;
        const mine = state.feedbacks.filter((f) => String(f.userId) === String(a?.userId));
        if (els.feedbackCount) els.feedbackCount.textContent = `${mine.length} review${mine.length === 1 ? "" : "s"}`;

        carousel.items = mine;
        carousel.index = Math.min(carousel.index, Math.max(0, mine.length - 1));
        renderCarouselSlide();
        startCarouselAutoplay();
    }

    async function handleFeedbackSubmit(event) {
        event.preventDefault();
        const reservationId = els.feedbackReservationId.value;
        const rating = document.getElementById("feedbackRating").value;
        const message = document.getElementById("feedbackMessage").value.trim();
        const editingId = els.feedbackId.value;

        if (!reservationId) {
            window.Luna.toast("Please choose a reservation to review.", "error");
            return;
        }

        const payload = { rating: Number(rating), message, reservation: { id: Number(reservationId) } };

        try {
            if (editingId) {
                await window.LunaApi.put(`/api/feedbacks/${editingId}`, payload);
                window.Luna.toast("Feedback updated.", "success");
            } else {
                await window.LunaApi.post("/api/feedbacks", payload);
                window.Luna.toast("Thank you for your feedback!", "success");
            }
            els.feedbackForm.reset();
            els.feedbackId.value = "";
            els.feedbackCancelEdit.hidden = true;
            await loadProfilePage();
        } catch (error) {
            window.Luna.toast(error.message || "Could not submit feedback.", "error");
        }
    }

    async function handleFeedbackDelete(id) {
        const confirmed = await window.Luna.confirmDialog({
            title: "Delete this review?",
            message: "This will permanently remove your feedback entry.",
            confirmLabel: "Delete", danger: true
        });
        if (!confirmed) return;
        try {
            await window.LunaApi.del(`/api/feedbacks/${id}`);
            window.Luna.toast("Feedback deleted.", "success");
            await loadProfilePage();
        } catch (error) {
            window.Luna.toast(error.message || "Could not delete feedback.", "error");
        }
    }

    function handleFeedbackEdit(id) {
        const feedback = state.feedbacks.find((f) => String(f.id) === String(id));
        if (!feedback) return;
        els.feedbackId.value = feedback.id;
        els.feedbackReservationId.value = feedback.reservation?.id || "";
        document.getElementById("feedbackRating").value = feedback.rating;
        document.getElementById("feedbackMessage").value = feedback.message || "";
        els.feedbackCancelEdit.hidden = false;
        els.feedbackForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function setupTabs() {
        document.querySelectorAll(".profile-tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".profile-tab-btn").forEach((b) => b.classList.remove("is-active"));
                document.querySelectorAll(".profile-tab-panel").forEach((p) => p.classList.remove("is-active"));
                btn.classList.add("is-active");
                document.getElementById(btn.dataset.tab)?.classList.add("is-active");
            });
        });

        if (window.location.hash === "#feedback") {
            document.querySelector('[data-tab="tabFeedback"]')?.click();
        }
    }

    function init() {
        els.form?.addEventListener("submit", updateProfile);
        els.deleteButton?.addEventListener("click", deleteProfile);
        els.feedbackForm?.addEventListener("submit", handleFeedbackSubmit);
        els.feedbackCancelEdit?.addEventListener("click", () => {
            els.feedbackForm.reset();
            els.feedbackId.value = "";
            els.feedbackCancelEdit.hidden = true;
        });

        document.addEventListener("click", (e) => {
            const qrBtn = e.target.closest("[data-show-qr]");
            if (qrBtn) showReservationQr(qrBtn.dataset.showQr);

            const editBtn = e.target.closest("[data-edit-feedback]");
            if (editBtn) handleFeedbackEdit(editBtn.dataset.editFeedback);

            const delBtn = e.target.closest("[data-delete-feedback]");
            if (delBtn) handleFeedbackDelete(delBtn.dataset.deleteFeedback);

            const dotBtn = e.target.closest("[data-carousel-dot]");
            if (dotBtn) {
                carousel.index = Number(dotBtn.dataset.carouselDot);
                renderCarouselSlide();
                startCarouselAutoplay();
            }
        });

        els.feedbackCarousel?.addEventListener("mouseenter", stopCarouselAutoplay);
        els.feedbackCarousel?.addEventListener("mouseleave", startCarouselAutoplay);

        setupTabs();
        loadProfilePage();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
