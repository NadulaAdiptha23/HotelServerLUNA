/**
 * Luna Cove — menu-images.js
 * Central image mapping for every menu item shown on the public Menu page
 * and the Table Order page. Keeps one single source of truth so food,
 * drink, and dessert photos never collide or duplicate across dishes.
 *
 * HOW TO ADD A NEW PHOTO:
 *   1. Drop the image file into assets/images/menu/<food|drink|dessert>/
 *   2. Add an entry below: "exact item name as slug": "relative/path.jpg"
 *      (slug = lowercase, accents removed, non-alphanumerics -> single hyphen)
 *   3. No other code changes needed — both menu.js and table-order.js
 *      pull from this same map via getMenuImagePath().
 */
window.LunaMenuImages = (() => {
    const BASE = "assets/images/menu";

    /** Exact-name → image path, grouped by category for readability. */
    const MENU_IMAGE_MAP = {
        // ---- FOOD ----
        "arancini": `${BASE}/food/arancini.jpg`,
        "bianco-tartufo": `${BASE}/food/bianco-tartufo.jpg`,
        "bistecca-fiorentina": `${BASE}/food/bistecca-fiorentina.jpg`,
        "bruschetta": `${BASE}/food/bruschetta.jpg`,
        "carpaccio": `${BASE}/food/carpaccio.jpg`,
        "fettuccine": `${BASE}/food/fettuccine.jpg`,
        "gnocchi": `${BASE}/food/gnocchi.jpg`,
        "lasagne": `${BASE}/food/lasagne.jpg`,
        "lasagna": `${BASE}/food/lasagne.jpg`,
        "melanzane-alla-parmigiana": `${BASE}/food/melanzane-alla-parmigiana.jpg`,
        "minestrone-soup": `${BASE}/food/minestrone-soup.jpg`,
        "minestrone": `${BASE}/food/minestrone-soup.jpg`,
        "pappardelle": `${BASE}/food/pappardelle.jpg`,
        "pizza": `${BASE}/food/pizza.jpg`,
        "ravioli": `${BASE}/food/ravioli.jpg`,
        "ribollita": `${BASE}/food/ribollita.jpg`,
        "risotto": `${BASE}/food/risotto.jpg`,
        "salad-caprese": `${BASE}/food/salad-caprese.jpg`,
        "caprese-salad": `${BASE}/food/salad-caprese.jpg`,
        "tagliatelle": `${BASE}/food/tagliatelle.jpg`,

        // ---- DRINK ----
        "americano": `${BASE}/drink/americano.jpg`,
        "analcolico-alla-fragola": `${BASE}/drink/analcolico-alla-fragola.png`,
        "analcolico-del-daste": `${BASE}/drink/analcolico-del-daste.png`,
        "angelo-azzurro": `${BASE}/drink/angelo-azzurro.jpg`,
        "bellini": `${BASE}/drink/bellini.jpg`,
        "bicerin": `${BASE}/drink/bicerin.jpg`,
        "bombardino": `${BASE}/drink/bombardino.jpg`,
        "caffe-latte": `${BASE}/drink/caffe-latte.jpg`,
        "caffe-moka": `${BASE}/drink/caffe-moka.jpg`,
        "campari-soda": `${BASE}/drink/campari-soda.jpg`,
        "cappuccino": `${BASE}/drink/cappuccino.jpg`,
        "chinotto": `${BASE}/drink/chinotto.jpg`,
        "espresso": `${BASE}/drink/espresso.jpg`,
        "hugo-analcolico": `${BASE}/drink/hugo-analcolico.png`,
        "hugo": `${BASE}/drink/hugo.jpg`,
        "macchiato": `${BASE}/drink/macchiato.jpg`,
        "marocchino": `${BASE}/drink/marocchino.jpg`,
        "negroni-sbagliato": `${BASE}/drink/negroni-sbagliato.jpg`,
        "negroni": `${BASE}/drink/negroni.jpg`,
        "ristretto": `${BASE}/drink/ristretto.jpg`,
        "rossini": `${BASE}/drink/rossini.jpg`,
        "shakerato": `${BASE}/drink/shakerato.jpg`,
        "spritz-veneziano": `${BASE}/drink/spritz-veneziano.jpg`,

        // ---- DESSERT ----
        "biscotti": `${BASE}/dessert/biscotti.jpg`,
        "cannoli": `${BASE}/dessert/cannoli.jpg`,
        "gelato": `${BASE}/dessert/gelato.jpg`,
        "panna-cotta": `${BASE}/dessert/panna-cotta.jpg`,
        "semifreddo": `${BASE}/dessert/semifreddo.jpg`,
        "tiramisu": `${BASE}/dessert/tiramisu.jpg`
    };

    /** Sensible per-category fallback when an item has no exact photo yet. */
    const CATEGORY_FALLBACK = {
        FOOD: `${BASE}/food/risotto.jpg`,
        DRINK: `${BASE}/drink/spritz-veneziano.jpg`,
        DESSERT: `${BASE}/dessert/tiramisu.jpg`
    };

    function slugify(value) {
        return String(value || "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    /**
     * Resolve the image path for a menu item.
     * 1. Exact slug match against MENU_IMAGE_MAP.
     * 2. Loose match: map key appears inside the item name (or vice versa).
     * 3. Category-level fallback so nothing renders broken.
     */
    function getMenuImagePath(item) {
        const slug = slugify(item?.name);
        if (MENU_IMAGE_MAP[slug]) return MENU_IMAGE_MAP[slug];

        const looseMatch = Object.keys(MENU_IMAGE_MAP).find(
            (key) => slug.includes(key) || key.includes(slug)
        );
        if (looseMatch) return MENU_IMAGE_MAP[looseMatch];

        const category = String(item?.category || "FOOD").toUpperCase();
        return CATEGORY_FALLBACK[category] || CATEGORY_FALLBACK.FOOD;
    }

    return { MENU_IMAGE_MAP, CATEGORY_FALLBACK, slugify, getMenuImagePath };
})();
