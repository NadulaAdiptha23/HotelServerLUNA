/**
 * Luna Cove — auth.js
 * Handles the Login and Register forms. Uses the existing backend contract:
 *   POST /api/auth/login  { email, password } -> { jwt, userId, userRole }
 *   POST /api/auth/signup { name, email, password } -> UserDto
 */
(() => {
    function setFieldError(fieldEl, message) {
        const wrap = fieldEl.closest(".form-field-float, .form-field");
        if (!wrap) return;
        wrap.classList.toggle("has-error", Boolean(message));
        const errorEl = wrap.querySelector(".field-error");
        if (errorEl) errorEl.textContent = message || "";
    }

    function clearErrors(form) {
        form.querySelectorAll(".form-field-float, .form-field").forEach((wrap) => {
            wrap.classList.remove("has-error");
        });
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function setButtonLoading(button, loading, loadingText) {
        if (!button) return;
        button.disabled = loading;
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="spinner" style="border-color: rgba(26,20,9,0.25); border-top-color:#1a1409;"></span>&nbsp; ${loadingText}`;
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }

    /* ---------------- Login ---------------- */
    function initLogin() {
        const form = document.getElementById("loginForm");
        if (!form) return;

        const params = new URLSearchParams(window.location.search);
        if (params.get("bookingRequired")) {
            window.Luna?.toast("Please sign in to continue with your reservation.", "info");
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearErrors(form);

            const emailEl = document.getElementById("loginEmail");
            const passwordEl = document.getElementById("loginPassword");
            const email = emailEl.value.trim();
            const password = passwordEl.value;
            let valid = true;

            if (!isValidEmail(email)) { setFieldError(emailEl, "Enter a valid email address."); valid = false; }
            if (!password) { setFieldError(passwordEl, "Password is required."); valid = false; }
            if (!valid) return;

            const submitBtn = form.querySelector("button[type='submit']");
            setButtonLoading(submitBtn, true, "Signing In…");

            try {
                const response = await window.LunaApi.post("/api/auth/login", { email, password });
                if (!response?.jwt) throw new Error("Invalid email or password.");

                let displayName = email;
                try {
                    const userProfile = await window.LunaApi.get(`/api/auth/users/${response.userId}`);
                    displayName = userProfile?.name || email;
                } catch (e) { /* non-fatal */ }

                const authPayload = {
                    jwt: response.jwt,
                    userId: response.userId,
                    userRole: response.userRole,
                    email,
                    name: displayName
                };
                localStorage.setItem("hotelAuth", JSON.stringify(authPayload));

                window.Luna?.toast("Welcome back to Luna Cove.", "success");

                const redirectTarget = response.userRole === "ADMIN" ? "admin.html" : (params.get("bookingRequired") ? "tables.html" : "index.html");
                setTimeout(() => { window.location.href = redirectTarget; }, 500);
            } catch (error) {
                window.Luna?.toast(error.message || "Sign in failed. Please check your details.", "error");
                setFieldError(passwordEl, "Incorrect email or password.");
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    /* ---------------- Register ---------------- */
    function scorePassword(value) {
        let score = 0;
        if (value.length >= 8) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;
        if (value.length >= 12) score++;
        return Math.min(score, 4);
    }

    function initPasswordStrength() {
        const input = document.getElementById("registerPassword");
        const fill = document.getElementById("strengthFill");
        const label = document.getElementById("strengthLabel");
        if (!input || !fill || !label) return;

        const levels = [
            { color: "#c0584a", text: "Very weak" },
            { color: "#d08a4a", text: "Weak" },
            { color: "#cdb24a", text: "Fair" },
            { color: "#8aab5e", text: "Strong" },
            { color: "#5a8a6b", text: "Excellent" }
        ];

        input.addEventListener("input", () => {
            const score = scorePassword(input.value);
            const level = levels[score];
            fill.style.width = `${(score / 4) * 100}%`;
            fill.style.background = level.color;
            label.textContent = input.value ? level.text : "";
        });
    }

    function initRegister() {
        const form = document.getElementById("registerForm");
        if (!form) return;

        initPasswordStrength();

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            clearErrors(form);

            const nameEl = document.getElementById("registerName");
            const emailEl = document.getElementById("registerEmail");
            const passwordEl = document.getElementById("registerPassword");
            const confirmEl = document.getElementById("registerConfirmPassword");
            const termsEl = document.getElementById("agreeTerms");

            const name = nameEl.value.trim();
            const email = emailEl.value.trim();
            const password = passwordEl.value;
            const confirmPassword = confirmEl?.value;
            let valid = true;

            if (name.length < 2) { setFieldError(nameEl, "Please enter your full name."); valid = false; }
            if (!isValidEmail(email)) { setFieldError(emailEl, "Enter a valid email address."); valid = false; }
            if (password.length < 6) { setFieldError(passwordEl, "Use at least 6 characters."); valid = false; }
            if (confirmEl && password !== confirmPassword) { setFieldError(confirmEl, "Passwords do not match."); valid = false; }
            if (termsEl && !termsEl.checked) {
                window.Luna?.toast("Please accept the terms to continue.", "error");
                valid = false;
            }
            if (!valid) return;

            const submitBtn = form.querySelector("button[type='submit']");
            setButtonLoading(submitBtn, true, "Creating Account…");

            try {
                await window.LunaApi.post("/api/auth/signup", { name, email, password });
                window.Luna?.toast("Account created — please sign in to continue.", "success");
                setTimeout(() => { window.location.href = "login.html"; }, 700);
            } catch (error) {
                window.Luna?.toast(error.message || "Could not create account. Try a different email.", "error");
                setFieldError(emailEl, "This email may already be registered.");
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    function init() {
        initLogin();
        initRegister();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
