/* Api — the only place the browser talks to the C++ server.
   Every call returns parsed JSON, or throws an ApiError whose message is already fit to show a person. */
class ApiError extends Error {
    constructor(status, code, message, fields = {}, extra = {}) {
        super(message);
        this.status = status; this.code = code; this.fields = fields; this.extra = extra;
    }
}

const Api = {
    base: (window.BANK_API_BASE || "").replace(/\/$/, ""),
    token: null,
    onUnauthorized: null,         // set by App: called when the server says the session is gone
    _KEY: "bank-sim:token",

    Restore() { try { Api.token = sessionStorage.getItem(Api._KEY); } catch (e) { Api.token = null; } return !!Api.token; },
    SetToken(t) {
        Api.token = t;
        try { t ? sessionStorage.setItem(Api._KEY, t) : sessionStorage.removeItem(Api._KEY); } catch (e) { /* storage blocked: stay signed in until the tab closes */ }
    },

    async _fetch(method, path, body) {
        const headers = {};
        if (body !== undefined) headers["Content-Type"] = "application/json";
        if (Api.token) headers["Authorization"] = "Bearer " + Api.token;
        try {
            return await fetch(Api.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        } catch (e) {
            throw new ApiError(0, "network", "Can’t reach the bank server. Make sure it is running, then try again.");
        }
    },

    async _fail(res) {
        let e = {};
        try { e = (await res.json()).error || {}; } catch (x) { /* not JSON */ }
        if (res.status === 401 && e.code === "unauthenticated" && Api.token) {
            Api.SetToken(null);
            if (Api.onUnauthorized) Api.onUnauthorized();
        }
        const { code, message, fields, ...extra } = e;
        return new ApiError(res.status, code || "http_error", message || "Something went wrong. Try again.", fields || {}, extra);
    },

    async request(method, path, body) {
        const res = await Api._fetch(method, path, body);
        if (!res.ok) throw await Api._fail(res);
        if (res.status === 204) return null;
        return res.json();
    },

    get: (p) => Api.request("GET", p),
    post: (p, b = {}) => Api.request("POST", p, b),
    put: (p, b = {}) => Api.request("PUT", p, b),
    del: (p) => Api.request("DELETE", p),

    /* Saves a server file through the browser's download. */
    async download(path, filename) {
        const res = await Api._fetch("GET", path);
        if (!res.ok) throw await Api._fail(res);
        const url = URL.createObjectURL(await res.blob());
        const a = Object.assign(document.createElement("a"), { href: url, download: filename });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
};
