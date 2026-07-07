/**
 * Luna Cove — tables.js
 * Powers the public Tables browse page: category selection + table grid.
 * Reservation creation itself happens on reservations.html.
 */
(() => {
    const state = { tables: [], feedbacks: [], category: null, recommendedTableId: null, minPartySize: null };
    const els = {};

    const occasionPreferredType = {
        solo: "SOLO",
        date: "DOUBLE",
        business: "DOUBLE",
        celebration: "DELUXE"
    };
    const occasionLabel = {
        solo: "a quiet solo visit",
        date: "a date night",
        business: "a business meeting",
        celebration: "a family or celebration gathering"
    };

    const categoryDetails = {
        SOLO: {
            label: "Solo", subtitle: "Perfect for one guest",
            description: "A calm private setup for focused meals, quiet work breaks, or a relaxed cafe-style moment.",
            image: "image/table-solo.jpg", amenities: ["Private corner", "Quick service", "Window-side options"]
        },
        DOUBLE: {
            label: "Double", subtitle: "Perfect for two guests",
            description: "A balanced setting for couples, friends, and compact meetings with room to dine comfortably.",
            image: "image/table-double.jpg", amenities: ["Comfort seating", "Shared dining space", "Ambient lighting"]
        },
        DELUXE: {
            label: "Deluxe", subtitle: "Perfect for families and groups",
            description: "A generous premium arrangement with extra space for celebrations and relaxed group dining.",
            image: "image/table-deluxe.jpg", amenities: ["Large table layout", "Premium placement", "Best for gatherings"]
        }
    };
    const categoryOrder = ["SOLO", "DOUBLE", "DELUXE"];

    function currency(v) { return window.Luna.currency(v); }
    function esc(v) { return window.Luna.escapeHtml(v); }

    function cacheEls() {
        els.categoryGrid = document.getElementById("tableCategoryGrid");
        els.results = document.getElementById("tableResults");
        els.resultsTitle = document.getElementById("tableResultsTitle");
        els.resultsCopy = document.getElementById("tableResultsCopy");
        els.grid = document.getElementById("tableGrid");
        els.smartPartySize = document.getElementById("smartPartySize");
        els.smartOccasion = document.getElementById("smartOccasion");
        els.smartMatchButton = document.getElementById("smartMatchButton");
        els.smartMatchResult = document.getElementById("smartMatchResult");
    }

    function tablesByType(type) {
        return state.tables.filter((t) => t.type === type);
    }

    function avgRatingFor(tableId) {
        const ratings = state.feedbacks.filter((f) => String(f.reservation?.table?.id) === String(tableId)).map((f) => f.rating);
        if (!ratings.length) return null;
        return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    }

    function renderSkeleton() {
        if (els.categoryGrid) {
            els.categoryGrid.innerHTML = Array.from({ length: 3 }).map(() => `<div class="skeleton skeleton-card"></div>`).join("");
        }
    }

    function renderCategories() {
        if (!els.categoryGrid) return;
        els.categoryGrid.innerHTML = categoryOrder.map((type) => {
            const details = categoryDetails[type];
            const catTables = tablesByType(type);
            const availableCount = catTables.filter((t) => t.available).length;
            const startingPrice = catTables.length ? Math.min(...catTables.map((t) => Number(t.price || 0))) : 0;
            const isActive = state.category === type;
            return `
                <article class="card table-category-card reveal ${isActive ? "is-active" : ""}" data-table-category="${type}">
                    <div class="cat-image-wrap"><img src="${details.image}" alt="${details.label} table setting" loading="lazy"></div>
                    <div class="cat-body">
                        <p class="eyebrow">${details.subtitle}</p>
                        <h3>${details.label} Tables</h3>
                        <p>${details.description}</p>
                        <div class="cat-stats">
                            <span><strong>${availableCount}</strong>/${catTables.length} available</span>
                            <span>From <strong>LKR ${currency(startingPrice)}</strong></span>
                        </div>
                        <button class="btn btn-ghost btn-sm" type="button">Select Tier</button>
                    </div>
                </article>
            `;
        }).join("");
        window.Luna.initReveal();
    }

    function renderTables() {
        if (!els.grid) return;
        if (!state.category) {
            if (els.results) els.results.hidden = true;
            els.grid.innerHTML = "";
            return;
        }

        const details = categoryDetails[state.category];
        let displayTables = tablesByType(state.category);
        if (state.minPartySize) {
            displayTables = displayTables.filter((t) => t.capacity >= state.minPartySize);
        }

        if (els.results) els.results.hidden = false;
        if (els.resultsTitle) els.resultsTitle.textContent = `${details.label} Tables`;
        if (els.resultsCopy) {
            els.resultsCopy.innerHTML = state.minPartySize
                ? `Showing tables that seat ${state.minPartySize}+ guests. <button type="button" id="clearPartyFilter" class="text-link" style="background:none; border:none; cursor:pointer; font:inherit;">Clear filter</button>`
                : details.description;
        }

        if (displayTables.length === 0) {
            els.grid.innerHTML = `<div class="empty-state">No ${details.label.toLowerCase()} tables seat ${state.minPartySize}+ guests. Try a different tier or clear the filter above.</div>`;
            return;
        }

        els.grid.innerHTML = displayTables.map((table) => {
            const rating = avgRatingFor(table.id);
            const isRecommended = String(state.recommendedTableId) === String(table.id);
            return `
                <article class="card table-card reveal ${!table.available ? "is-booked" : ""} ${isRecommended ? "is-recommended" : ""}" id="table-card-${table.id}">
                    <div class="table-card-header">
                        <h3>Table ${esc(table.tableNumber)}</h3>
                        <span class="badge ${table.available ? "badge-success" : "badge-danger"}">${table.available ? "Available" : "Booked"}</span>
                    </div>
                    <span class="table-price">LKR ${currency(table.price)}</span>
                    <div class="table-meta-list">
                        <span><strong>Tier:</strong> ${details.label}</span>
                        <span><strong>Capacity:</strong> ${table.capacity} guests</span>
                    </div>
                    ${rating ? `<div class="table-rating-row">★ ${rating} average guest rating</div>` : `<div class="table-rating-row" style="color:var(--color-ink-soft);">No reviews yet</div>`}
                    <a class="btn ${table.available ? "btn-dark" : "btn-ghost"} btn-block" href="reservations.html?tableId=${table.id}&type=${state.category}" data-action="book-table" ${!table.available ? "aria-disabled='true' style='pointer-events:none; opacity:0.5;'" : ""}>
                        ${table.available ? "Reserve This Table" : "Currently Unavailable"}
                    </a>
                </article>
            `;
        }).join("");
        window.Luna.initReveal();
    }

    async function loadData() {
        renderSkeleton();
        try {
            const [tables, feedbacks] = await Promise.all([
                window.LunaApi.get("/api/tables"),
                window.LunaApi.get("/api/feedbacks").catch(() => [])
            ]);
            state.tables = tables || [];
            state.feedbacks = feedbacks || [];
        } catch (error) {
            window.Luna?.toast(error.message || "Failed to load tables.", "error");
        }
        renderCategories();
        renderTables();
    }

    /* ---------------- Smart Table Matching ---------------- */
    function findBestTable(partySize, occasion) {
        const preferredType = occasionPreferredType[occasion] || "DOUBLE";
        const candidates = state.tables.filter((t) => t.available && t.capacity >= partySize);
        if (candidates.length === 0) return null;

        const scored = candidates.map((table) => ({
            table,
            typeRank: table.type === preferredType ? 0 : 1,
            capacityGap: table.capacity - partySize,
            price: Number(table.price || 0)
        }));

        scored.sort((a, b) => a.typeRank - b.typeRank || a.capacityGap - b.capacityGap || a.price - b.price);
        return scored[0].table;
    }

    function renderSmartMatchResult(match, partySize, occasion) {
        if (!els.smartMatchResult) return;
        els.smartMatchResult.hidden = false;

        if (!match) {
            els.smartMatchResult.classList.add("is-empty");
            els.smartMatchResult.innerHTML = `
                <div class="result-copy">
                    <p>No available table currently seats a party of ${partySize}. Please try a smaller group or check back shortly.</p>
                </div>
            `;
            return;
        }

        els.smartMatchResult.classList.remove("is-empty");
        const details = categoryDetails[match.type];
        els.smartMatchResult.innerHTML = `
            <div class="result-copy">
                <strong>Table ${esc(match.tableNumber)} — ${details.label} Tier</strong>
                <p>Ideal for ${occasionLabel[occasion] || "your visit"} with ${esc(match.capacity)} seats, from LKR ${currency(match.price)}.</p>
            </div>
            <a class="btn btn-primary" href="reservations.html?tableId=${match.id}&type=${match.type}" data-action="book-table">Reserve This Table</a>
        `;
    }

    function handleSmartMatch() {
        const partySize = Math.max(1, Number(els.smartPartySize?.value || 2));
        const occasion = els.smartOccasion?.value || "date";
        const match = findBestTable(partySize, occasion);

        renderSmartMatchResult(match, partySize, occasion);
        state.minPartySize = partySize;

        if (match) {
            state.category = match.type;
            state.recommendedTableId = match.id;
            renderCategories();
            renderTables();
        }

        els.smartMatchResult.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function setupEvents() {
        els.smartMatchButton?.addEventListener("click", handleSmartMatch);

        document.addEventListener("click", (e) => {
            if (e.target.closest("#clearPartyFilter")) {
                state.minPartySize = null;
                renderTables();
                return;
            }

            const catBtn = e.target.closest("[data-table-category]");
            if (catBtn) {
                const type = catBtn.dataset.tableCategory;
                state.category = state.category === type ? null : type;
                renderCategories();
                renderTables();
                if (state.category) {
                    document.getElementById("tableResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    }

    function preselectFromQuery() {
        const type = new URLSearchParams(window.location.search).get("type");
        if (type && categoryDetails[type]) state.category = type;
    }

    function init() {
        cacheEls();
        preselectFromQuery();
        setupEvents();
        loadData();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
