/**
 * Luna Cove — menu.js
 * Powers the Menu page: category browsing, search, filtering, and a
 * lightweight in-page cart preview (does not affect checkout/payment flow).
 */
(() => {
    const state = {
        items: [],
        category: null,
        filter: "ALL",
        search: "",
        cart: []
    };

    const els = {};

    const categoryDetails = {
        FOOD: {
            label: "Food", subtitle: "Chef-made plates",
            description: "Fresh mains, comfort dishes, and shareable plates prepared for relaxed hotel dining.",
            image: `${window.LunaMenuImages.CATEGORY_FALLBACK.FOOD}`
        },
        DRINK: {
            label: "Drinks", subtitle: "Signature sips",
            description: "Refreshing drinks, cafe favorites, and table-friendly beverages for every reservation.",
            image: `${window.LunaMenuImages.CATEGORY_FALLBACK.DRINK}`
        },
        DESSERT: {
            label: "Desserts", subtitle: "Sweet finishes",
            description: "House-made gelato, tiramisu, and Italian classics to close out every reservation.",
            image: `${window.LunaMenuImages.CATEGORY_FALLBACK.DESSERT}`
        }
    };
    const categoryOrder = ["FOOD", "DRINK", "DESSERT"];

    function getItemImage(item) {
        return window.LunaMenuImages.getMenuImagePath(item);
    }

    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }
    function categoryLabel(category) {
        return categoryDetails[category]?.label.replace(/s$/, "") || "Food";
    }

    function cacheEls() {
        els.categoryGrid = document.getElementById("menuCategoryGrid");
        els.results = document.getElementById("menuResults");
        els.resultsTitle = document.getElementById("menuResultsTitle");
        els.resultsCopy = document.getElementById("menuResultsCopy");
        els.grid = document.getElementById("menuGrid");
        els.search = document.getElementById("menuSearch");
        els.smartPick = document.getElementById("menuSmartPick");
        els.smartNote = document.getElementById("menuSmartNote");
        els.cartFab = document.getElementById("cartFab");
        els.cartBadge = document.getElementById("cartBadge");
        els.cartDrawer = document.getElementById("cartDrawer");
        els.cartOverlay = document.getElementById("cartOverlay");
        els.cartItems = document.getElementById("cartDrawerItems");
        els.cartTotal = document.getElementById("cartDrawerTotal");
        els.cartClose = document.getElementById("cartDrawerClose");
    }

    function itemsByCategory(category) {
        return state.items.filter((i) => i.category === category);
    }

    function renderSkeleton() {
        if (els.categoryGrid) {
            els.categoryGrid.innerHTML = Array.from({ length: 2 })
                .map(() => `<div class="skeleton skeleton-card"></div>`).join("");
        }
    }

    function renderCategories() {
        if (!els.categoryGrid) return;
        els.categoryGrid.innerHTML = categoryOrder.map((cat) => {
            const details = categoryDetails[cat];
            const catItems = itemsByCategory(cat);
            const startingPrice = catItems.length ? Math.min(...catItems.map((i) => Number(i.price || 0))) : 0;
            const isActive = state.category === cat;
            return `
                <article class="card menu-category-card reveal ${isActive ? "is-active" : ""}" data-menu-category="${cat}">
                    <div class="cat-image-wrap"><img src="${details.image}" alt="${details.label} menu category" loading="lazy"></div>
                    <div class="cat-body">
                        <p class="eyebrow">${details.subtitle}</p>
                        <h3>${details.label}</h3>
                        <p>${details.description}</p>
                        <div class="cat-stats">
                            <span><strong>${catItems.length}</strong> item${catItems.length === 1 ? "" : "s"}</span>
                            <span>From <strong>LKR ${currency(startingPrice)}</strong></span>
                        </div>
                        <button class="btn btn-ghost btn-sm" type="button">View Menu</button>
                    </div>
                </article>
            `;
        }).join("");
        window.Luna.initReveal();
    }

    function getFilteredItems() {
        const q = state.search.trim().toLowerCase();
        return state.items.filter((item) => {
            const matchesCategory = state.filter === "ALL" || item.category === state.filter;
            const searchable = `${item.name} ${item.category} ${currency(item.price)}`.toLowerCase();
            return matchesCategory && (!q || searchable.includes(q));
        });
    }

    function renderSmartPick() {
        if (!els.smartPick) return;
        if (state.items.length === 0) {
            els.smartPick.textContent = "No menu items yet";
            els.smartNote.textContent = "Items will appear here once the kitchen team publishes the live menu.";
            return;
        }
        const pick = [...state.items].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))[0];
        els.smartPick.textContent = pick.name;
        els.smartNote.textContent = `${categoryLabel(pick.category)} option at LKR ${currency(pick.price)} — today's best value.`;
    }

    function renderGrid() {
        if (!els.grid) return;

        if (els.categoryGrid && !state.category) {
            if (els.results) els.results.hidden = true;
            els.grid.innerHTML = "";
            renderSmartPick();
            return;
        }

        const filtered = getFilteredItems();
        const details = categoryDetails[state.filter] || null;
        renderSmartPick();

        if (els.results) els.results.hidden = false;
        if (els.resultsTitle) els.resultsTitle.textContent = details ? `${details.label} Menu` : "Full Menu";
        if (els.resultsCopy) {
            els.resultsCopy.textContent = details ? details.description : "Browse every available food, drink, and dessert item from the live kitchen menu.";
        }

        if (filtered.length === 0) {
            els.grid.innerHTML = `<div class="empty-state">No menu items match this view.</div>`;
            return;
        }

        els.grid.innerHTML = filtered.map((item) => `
            <article class="card menu-item-card reveal">
                <div class="menu-item-image-wrap">
                    <img src="${getItemImage(item)}" alt="${esc(item.name)}" loading="lazy">
                    <span class="menu-item-category-pill">${categoryLabel(item.category)}</span>
                </div>
                <div class="menu-item-body">
                    <h3>${esc(item.name)}</h3>
                    <p>${item.category === "DRINK" ? "Signature beverage" : item.category === "DESSERT" ? "House-made dessert" : "Chef-prepared dish"} crafted for table service at Luna Cove.</p>
                </div>
                <div class="menu-item-footer">
                    <span class="menu-item-price">LKR ${currency(item.price)}</span>
                    <button class="add-to-cart-btn" type="button" data-add-cart="${item.id}" aria-label="Add ${esc(item.name)} to preview cart">+</button>
                </div>
            </article>
        `).join("");
        window.Luna.initReveal();
    }

    function renderFilterTabs() {
        document.querySelectorAll(".filter-tab").forEach((tab) => {
            tab.classList.toggle("is-active", tab.dataset.menuFilter === state.filter);
        });
    }

    /* ---------------- Cart preview ---------------- */
    function cartTotal() {
        return state.cart.reduce((sum, item) => sum + Number(item.price || 0) * item.qty, 0);
    }

    function updateCartBadge() {
        const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
        if (els.cartBadge) els.cartBadge.textContent = count;
        if (els.cartFab) els.cartFab.hidden = count === 0;
    }

    function renderCartDrawer() {
        if (!els.cartItems) return;
        if (state.cart.length === 0) {
            els.cartItems.innerHTML = `<div class="empty-state">Your dining preview is empty. Tap + on any dish to add it here.</div>`;
        } else {
            els.cartItems.innerHTML = state.cart.map((item, idx) => `
                <div class="cart-line-item">
                    <div>
                        <strong>${esc(item.name)}</strong>
                        <div style="font-size:0.78rem; color: var(--color-ink-soft);">Qty ${item.qty} &times; LKR ${currency(item.price)}</div>
                    </div>
                    <button class="remove-line" type="button" data-remove-cart="${idx}">Remove</button>
                </div>
            `).join("");
        }
        if (els.cartTotal) els.cartTotal.textContent = currency(cartTotal());
        updateCartBadge();
    }

    function addToCart(id) {
        const item = state.items.find((i) => String(i.id) === String(id));
        if (!item) return;
        const existing = state.cart.find((i) => String(i.id) === String(id));
        if (existing) existing.qty += 1;
        else state.cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
        renderCartDrawer();
        window.Luna?.toast(`${item.name} added to your dining preview.`, "success", 2000);
    }

    function removeFromCart(idx) {
        state.cart.splice(idx, 1);
        renderCartDrawer();
    }

    function openCart() {
        els.cartDrawer?.classList.add("is-open");
        els.cartOverlay?.classList.add("is-open");
    }
    function closeCart() {
        els.cartDrawer?.classList.remove("is-open");
        els.cartOverlay?.classList.remove("is-open");
    }

    /* ---------------- Data + events ---------------- */
    async function loadMenu() {
        renderSkeleton();
        try {
            const items = await window.LunaApi.get("/api/menu");
            state.items = items || [];
        } catch (error) {
            window.Luna?.toast(error.message || "Failed to load the menu. Please try again.", "error");
            state.items = [];
        }
        renderCategories();
        renderGrid();
    }

    function setupEvents() {
        document.addEventListener("click", (e) => {
            const catBtn = e.target.closest("[data-menu-category]");
            if (catBtn) {
                const cat = catBtn.dataset.menuCategory;
                state.category = state.category === cat ? null : cat;
                state.filter = state.category || "ALL";
                renderCategories();
                renderFilterTabs();
                renderGrid();
                if (state.category) {
                    document.getElementById("menuResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }

            const filterBtn = e.target.closest("[data-menu-filter]");
            if (filterBtn) {
                state.filter = filterBtn.dataset.menuFilter;
                state.category = state.filter === "ALL" ? null : state.filter;
                renderFilterTabs();
                renderCategories();
                renderGrid();
            }

            const addBtn = e.target.closest("[data-add-cart]");
            if (addBtn) {
                addToCart(addBtn.dataset.addCart);
                addBtn.classList.add("is-added");
                setTimeout(() => addBtn.classList.remove("is-added"), 500);
            }

            const removeBtn = e.target.closest("[data-remove-cart]");
            if (removeBtn) removeFromCart(Number(removeBtn.dataset.removeCart));

            if (e.target.closest("#cartFab")) openCart();
            if (e.target === els.cartOverlay || e.target.closest("#cartDrawerClose")) closeCart();
        });

        els.search?.addEventListener("input", (e) => {
            state.search = e.target.value;
            renderGrid();
        });
    }

    function init() {
        cacheEls();
        setupEvents();
        loadMenu();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
