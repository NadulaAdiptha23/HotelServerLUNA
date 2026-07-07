/**
 * Luna Cove — animations.js
 * Small reusable motion helpers: button ripple feedback and hero parallax.
 */
(() => {
    function initRipple() {
        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn");
            if (!btn) return;
            const circle = document.createElement("span");
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            circle.style.cssText = `
                position:absolute; border-radius:50%; pointer-events:none;
                width:${size}px; height:${size}px;
                left:${e.clientX - rect.left - size / 2}px; top:${e.clientY - rect.top - size / 2}px;
                background:rgba(255,255,255,0.35); transform:scale(0); opacity:1;
                transition:transform 0.5s ease, opacity 0.6s ease;
            `;
            if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
            btn.style.overflow = "hidden";
            btn.appendChild(circle);
            requestAnimationFrame(() => { circle.style.transform = "scale(2.4)"; circle.style.opacity = "0"; });
            setTimeout(() => circle.remove(), 600);
        });
    }

    function initHeroParallax() {
        const bg = document.querySelector(".hero-bg");
        if (!bg) return;
        window.addEventListener("scroll", () => {
            const offset = Math.min(window.scrollY * 0.25, 120);
            bg.style.transform = `translateY(${offset}px) scale(1.08)`;
        }, { passive: true });
    }

    function init() {
        initRipple();
        initHeroParallax();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
