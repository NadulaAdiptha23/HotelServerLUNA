/**
 * Luna Cove — home.js
 * Home page specific behaviour: gate "Reserve a Table" CTAs behind login.
 */
(() => {
    function setupActiveNavLink() {
        document.querySelectorAll(".nav-links a[href^='#']").forEach((link) => {
            link.addEventListener("click", () => {
                document.querySelectorAll(".nav-links a").forEach((a) => a.classList.remove("is-active"));
                link.classList.add("is-active");
            });
        });
    }

    function setupContactForm() {
        const form = document.getElementById("contactForm");
        if (!form) return;

        const nameField = document.getElementById("contactName");
        const emailField = document.getElementById("contactEmail");
        const messageField = document.getElementById("contactMessage");

        function isValidEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        function setFieldState(input, isValid) {
            const wrap = input.closest(".form-field");
            if (!wrap) return;
            wrap.classList.toggle("has-error", !isValid);
            input.classList.toggle("is-invalid", !isValid);
        }

        function validateField(input) {
            let isValid = true;
            if (input === emailField) {
                isValid = isValidEmail(input.value.trim());
            } else {
                isValid = input.value.trim().length > 0;
            }
            setFieldState(input, isValid);
            return isValid;
        }

        [nameField, emailField, messageField].forEach((field) => {
            field.addEventListener("blur", () => validateField(field));
            field.addEventListener("input", () => {
                if (field.closest(".form-field").classList.contains("has-error")) validateField(field);
            });
        });

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const validations = [nameField, emailField, messageField].map(validateField);
            if (validations.includes(false)) {
                window.Luna?.toast("Please correct the highlighted fields.", "error");
                return;
            }
            window.Luna?.toast("Thank you — our concierge team will be in touch shortly.", "success");
            form.reset();
            [nameField, emailField, messageField].forEach((field) => setFieldState(field, true));
        });
    }

    function init() {
        setupActiveNavLink();
        setupContactForm();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
