/**
 * Luna Cove Resort & Dining Management - IDE Local Port Proxy Bridge
 */
(() => {
    const APP_SERVER_ORIGIN = "http://localhost:8080";
    const JETBRAINS_STATIC_PORT = "63342";
    const TARGET_STATIC_TOKEN = "/static/";

    function verifyAndRedirectDevRoute() {
        // Only run routing modifications if coming from the local IDE static loop
        if (window.location.port !== JETBRAINS_STATIC_PORT) {
            return;
        }

        const currentPath = window.location.pathname;
        const staticIndex = currentPath.indexOf(TARGET_STATIC_TOKEN);
        
        // Extract downstream path context, shifting away index references cleanly
        const appPath = staticIndex >= 0
            ? currentPath.slice(staticIndex + TARGET_STATIC_TOKEN.length - 1)
            : currentPath;

        // Preserve URL query search strings (?key=val) along with existing location hashes
        const queryParams = window.location.search || "";
        const hashContext = window.location.hash || "";

        const destinationUrl = `${APP_SERVER_ORIGIN}${appPath}${queryParams}${hashContext}`;

        console.warn(`[DevProxy] Intercepted port ${JETBRAINS_STATIC_PORT}. Routing context to primary backend: ${destinationUrl}`);
        
        // Use replace rather than assign so the proxy step doesn't break the browser back button
        window.location.replace(destinationUrl);
    }

    // Execute environment route inspections immediately
    verifyAndRedirectDevRoute();
})();