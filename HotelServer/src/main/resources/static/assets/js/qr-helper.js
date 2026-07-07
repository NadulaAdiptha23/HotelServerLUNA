/**
 * Luna Cove — qr-helper.js
 * Thin wrapper around the vendored qrcode-generator library (assets/js/vendor/qrcode.min.js).
 * Renders fully offline — no CDN / network call required, so it always works
 * at the venue regardless of wifi conditions.
 */
window.LunaQR = (() => {
    /**
     * Render a QR code as an inline SVG string sized to fit `text`.
     * Auto-picks the smallest QR "type" (version) that fits the data,
     * trying progressively larger versions until encoding succeeds.
     */
    function buildSvg(text, { cellSize = 5, margin = 2 } = {}) {
        let lastError = null;
        for (let typeNumber = 0; typeNumber <= 12; typeNumber++) {
            try {
                const qr = window.qrcode(typeNumber, "M");
                qr.addData(text);
                qr.make();
                return qr.createSvgTag(cellSize, margin);
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error("Unable to generate QR code");
    }

    /**
     * Render a QR code into a container element.
     * @param {HTMLElement} container
     * @param {string} text - the URL or data to encode
     * @param {object} options - { cellSize, margin }
     */
    function renderInto(container, text, options = {}) {
        if (!container) return;
        try {
            container.innerHTML = buildSvg(text, options);
            const svg = container.querySelector("svg");
            if (svg) {
                svg.style.width = "100%";
                svg.style.height = "100%";
                svg.style.display = "block";
            }
        } catch (err) {
            container.innerHTML = `<div style="font-size:11px; color:#c0584a; text-align:center; padding:8px;">QR unavailable</div>`;
        }
    }

    return { renderInto, buildSvg };
})();
