/**
 * Luna Cove — api.js
 * Thin fetch wrapper shared by every page. Preserves the exact backend
 * contract used previously (JWT bearer header, same endpoint paths).
 */
window.LunaApi = (() => {
    function getBase() {
        const override = document.getElementById("apiBase");
        return override?.value.trim().replace(/\/$/, "") || window.location.origin;
    }

    async function request(path, options = {}) {
        const auth = window.Luna?.getAuth();
        const response = await fetch(`${getBase()}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(auth?.jwt ? { Authorization: `Bearer ${auth.jwt}` } : {}),
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            let message = `Request failed with status ${response.status}`;
            try {
                const text = await response.text();
                if (text) {
                    try {
                        const parsed = JSON.parse(text);
                        message = parsed.message || parsed.error || text;
                    } catch (jsonErr) {
                        message = text;
                    }
                }
            } catch (e) { /* ignore */ }
            throw new Error(message);
        }

        if (response.status === 204) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    return {
        get: (path) => request(path),
        post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
        put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
        del: (path) => request(path, { method: "DELETE" }),
        request,
        getBase
    };
})();
