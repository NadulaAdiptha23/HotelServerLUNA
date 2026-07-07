/**
 * Luna Cove — common.js
 * Shared UI utilities used across every page: toasts, confirm dialogs,
 * sticky-nav behaviour, mobile nav, back-to-top, scroll-reveal, auth-aware nav.
 */
window.Luna = (() => {
    const AUTH_KEY = "hotelAuth";

    /* ---------------- Auth helpers (shared) ---------------- */
    function getAuth() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
        } catch (e) {
            return null;
        }
    }

    function isLoggedIn() {
        return Boolean(getAuth()?.jwt);
    }

    /**
     * A stable identity for "who owns this browser's in-progress checkout":
     * the real account id when logged in, or a persistent anonymous id
     * otherwise. Lets someone scan a table's QR code and order/pay without
     * needing an account, while logged-in guests behave exactly as before.
     */
    function getSessionOwnerId() {
        const auth = getAuth();
        if (auth?.userId) return auth.userId;
        let guestId = localStorage.getItem("hotelGuestSessionId");
        if (!guestId) {
            guestId = "guest-" + Math.random().toString(36).slice(2, 10);
            localStorage.setItem("hotelGuestSessionId", guestId);
        }
        return guestId;
    }

    function logout() {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem("hotelReservationOwners");
        window.location.href = "index.html";
    }

    function getInitials(value) {
        const source = String(value || "Customer").trim();
        if (source.includes("@")) return source.slice(0, 2).toUpperCase();
        return source.split(/\s+/).filter(Boolean).slice(0, 2)
            .map((p) => p.charAt(0).toUpperCase()).join("") || "CU";
    }

    function applyAuthState() {
        const auth = getAuth();
        const loggedIn = Boolean(auth?.jwt);
        const isCustomer = loggedIn && auth?.userRole !== "ADMIN";
        const displayName = auth?.name || auth?.email || (auth?.userId ? `User #${auth.userId}` : "Customer");

        if (document.body?.hasAttribute("data-requires-auth") && !loggedIn) {
            window.location.href = "login.html";
            return;
        }
        if (document.body?.hasAttribute("data-requires-customer") && !isCustomer) {
            window.location.href = loggedIn ? "admin.html" : "login.html";
            return;
        }
        if (document.body?.hasAttribute("data-requires-admin") && auth?.userRole !== "ADMIN") {
            window.location.href = "login.html";
            return;
        }

        document.querySelectorAll("[data-auth-only]").forEach((el) => { el.hidden = !loggedIn; });
        document.querySelectorAll("[data-auth-customer-only]").forEach((el) => { el.hidden = !isCustomer; });
        document.querySelectorAll("[data-guest-only]").forEach((el) => { el.hidden = loggedIn; });
        document.querySelectorAll("[data-user-label]").forEach((el) => { el.textContent = loggedIn ? displayName : "Guest"; });
        document.querySelectorAll("[data-user-initials]").forEach((el) => { el.textContent = loggedIn ? getInitials(displayName) : "GU"; });
    }

    /* ---------------- Toasts ---------------- */
    let toastStack;
    function ensureToastStack() {
        if (toastStack) return toastStack;
        toastStack = document.createElement("div");
        toastStack.className = "toast-stack";
        toastStack.setAttribute("aria-live", "polite");
        document.body.appendChild(toastStack);
        return toastStack;
    }

    function toast(message, type = "info", duration = 4200) {
        const stack = ensureToastStack();
        const el = document.createElement("div");
        el.className = `toast toast-${type}`;
        el.innerHTML = `<span>${message}</span><button class="toast-close" aria-label="Dismiss">&times;</button>`;
        stack.appendChild(el);

        const remove = () => {
            el.classList.add("is-leaving");
            setTimeout(() => el.remove(), 220);
        };
        el.querySelector(".toast-close").addEventListener("click", remove);
        const timer = setTimeout(remove, duration);
        el.addEventListener("mouseenter", () => clearTimeout(timer));
        return el;
    }

    /* ---------------- Confirm dialog (replaces window.confirm) ---------------- */
    function confirmDialog({ title = "Are you sure?", message = "", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "dialog-overlay";
            overlay.innerHTML = `
                <div class="dialog-box" role="alertdialog" aria-modal="true">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="dialog-actions">
                        <button type="button" class="btn btn-ghost" data-action="cancel">${cancelLabel}</button>
                        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="confirm">${confirmLabel}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add("is-open"));

            const close = (result) => {
                overlay.classList.remove("is-open");
                setTimeout(() => overlay.remove(), 260);
                resolve(result);
            };
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) close(false);
                const action = e.target.closest("[data-action]")?.dataset.action;
                if (action === "confirm") close(true);
                if (action === "cancel") close(false);
            });
        });
    }

    /* ---------------- Info modal (display-only, e.g. QR codes) ---------------- */
    function showModal({ title = "", bodyHtml = "", closeLabel = "Close" } = {}) {
        const overlay = document.createElement("div");
        overlay.className = "dialog-overlay";
        overlay.innerHTML = `
            <div class="dialog-box" role="dialog" aria-modal="true">
                <h3>${title}</h3>
                <div class="dialog-body">${bodyHtml}</div>
                <div class="dialog-actions">
                    <button type="button" class="btn btn-primary" data-action="close">${closeLabel}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("is-open"));

        const close = () => {
            overlay.classList.remove("is-open");
            setTimeout(() => overlay.remove(), 260);
        };
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close();
            if (e.target.closest("[data-action='close']")) close();
        });
        return { close, element: overlay };
    }

    /* ---------------- Sticky nav + mobile menu ---------------- */
    function initNav() {
        const nav = document.querySelector(".site-nav");
        if (!nav) return;
        const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        const burger = nav.querySelector(".nav-burger");
        const links = nav.querySelector(".nav-links");
        if (burger && links) {
            burger.setAttribute("aria-expanded", "false");
            burger.addEventListener("click", () => {
                const open = links.classList.toggle("is-open");
                burger.setAttribute("aria-expanded", String(open));
            });

            links.addEventListener("click", (e) => {
                if (e.target.closest("a")) {
                    links.classList.remove("is-open");
                    burger.setAttribute("aria-expanded", "false");
                }
            });

            document.addEventListener("click", (e) => {
                if (!links.classList.contains("is-open")) return;
                if (nav.contains(e.target)) return;
                links.classList.remove("is-open");
                burger.setAttribute("aria-expanded", "false");
            });
        }
    }

    /* ---------------- Back to top ---------------- */
    function initBackToTop() {
        const btn = document.createElement("button");
        btn.className = "back-to-top";
        btn.setAttribute("aria-label", "Back to top");
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        document.body.appendChild(btn);

        window.addEventListener("scroll", () => {
            btn.classList.toggle("is-visible", window.scrollY > 480);
        }, { passive: true });

        btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }

    /* ---------------- Scroll reveal ---------------- */
    function initReveal() {
        const targets = document.querySelectorAll(".reveal");
        if (!targets.length) return;
        if (!("IntersectionObserver" in window)) {
            targets.forEach((t) => t.classList.add("is-visible"));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.14 });
        targets.forEach((t) => observer.observe(t));
    }

    /* ---------------- Page load veil ---------------- */
    function initPageVeil() {
        const veil = document.querySelector(".page-veil");
        if (!veil) return;
        window.addEventListener("load", () => {
            setTimeout(() => veil.classList.add("is-hidden"), 260);
        });
    }

    /* ---------------- Logout binding ---------------- */
    function initLogoutBinding() {
        document.addEventListener("click", (e) => {
            if (e.target.closest("[data-logout-button]")) {
                e.preventDefault();
                logout();
            }
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function currency(value) {
        return Number(value || 0).toFixed(2);
    }

    /* ---------------- Booking gate (used on any "Reserve" CTA) ---------------- */
    function initBookingGate() {
        document.addEventListener("click", (e) => {
            const trigger = e.target.closest('[data-action="book-table"]');
            if (!trigger) return;
            if (isLoggedIn()) return;
            e.preventDefault();
            toast("Please sign in to reserve a table.", "info");
            const dest = trigger.getAttribute("href") || "tables.html";
            setTimeout(() => {
                window.location.href = `login.html?bookingRequired=1&next=${encodeURIComponent(dest)}`;
            }, 500);
        });
    }

    function bootstrap() {
        applyAuthState();
        initNav();
        initBackToTop();
        initReveal();
        initPageVeil();
        initLogoutBinding();
        initBookingGate();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }

    return { getAuth, isLoggedIn, getSessionOwnerId, logout, toast, confirmDialog, showModal, escapeHtml, currency, initReveal, getInitials, AUTH_KEY };
})();
