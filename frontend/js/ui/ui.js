/* UI — small component kit. Everything is built with DOM nodes (never innerHTML with user data),
   so client names, e-mails etc. can never inject markup. */
const UI = {
    ICONS: {
        home: "M3 11 12 3l9 8 M5 9.5V21h14V9.5 M10 21v-6h4v6",
        list: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
        userplus: "M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6",
        users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
        edit: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
        trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6",
        search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3",
        deposit: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
        withdraw: "M12 15V3 M7 8l5-5 5 5 M4 21h16",
        swap: "M7 4 3 8l4 4 M3 8h14 M17 20l4-4-4-4 M21 16H7",
        sigma: "M18 5H6l7 7-7 7h12",
        log: "M6 3h12v18l-3-2-3 2-3-2-3 2Z M9 8h6 M9 12h6",
        globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18",
        calc: "M5 3h14v18H5Z M8 7h8 M8 12h.01 M12 12h.01 M16 12h.01 M8 16h.01 M12 16h.01 M16 16h.01",
        trend: "M3 17l6-6 4 4 8-8 M15 7h6v6",
        shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z",
        lock: "M6 11h12v10H6Z M8 11V8a4 4 0 0 1 8 0v3",
        logout: "M9 21H5V3h4 M16 17l5-5-5-5 M21 12H9",
        menu: "M3 6h18 M3 12h18 M3 18h18",
        x: "M6 6l12 12 M18 6 6 18",
        check: "M5 12l5 5 9-10",
        alert: "M12 3 2 21h20Z M12 10v5 M12 18h.01",
        info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 11v5 M12 8h.01",
        print: "M6 9V3h12v6 M6 18H4v-7h16v7h-2 M7 14h10v7H7Z",
        download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
        eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
        eyeoff: "M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4 M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.3-1",
        bank: "M3 10 12 4l9 6 M5 10v8 M9 10v8 M15 10v8 M19 10v8 M3 21h18",
        clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7v5l3 2",
        chevron: "M6 9l6 6 6-6",
        refresh: "M21 12a9 9 0 1 1-3-6.7 M21 4v5h-5",
        database: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    },

    /* ---------- basics ---------- */
    icon(name, cls = "") {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", ("icon " + cls).trim());
        svg.setAttribute("aria-hidden", "true");
        for (const d of (UI.ICONS[name] || "").split(/ (?=M)/)) {
            const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p.setAttribute("d", d);
            svg.appendChild(p);
        }
        return svg;
    },

    /* h("div", {class:"x", onclick: fn, "aria-label": "…"}, child, "text", [more]) */
    h(tag, attrs, ...children) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v === false || v === null || v === undefined) continue;
            if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === "class") el.className = v;
            else if (k === "value") el.value = v;
            else if (k === "checked" || k === "disabled" || k === "readOnly" || k === "hidden") el[k] = !!v;
            else el.setAttribute(k, v === true ? "" : v);
        }
        UI.append(el, children);
        return el;
    },

    append(el, children) {
        for (const c of children.flat(Infinity)) {
            if (c === null || c === undefined || c === false) continue;
            el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
        }
        return el;
    },

    clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; },

    money(n, withSign = true) {
        const v = Number(n) || 0;
        const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (v < 0 ? "-" : "") + (withSign ? "$" : "") + s;
    },

    rate(n) {
        return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    },

    debounce(fn, ms = 180) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    },

    initials(name) {
        return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
    },

    _uid: 0,
    uid(prefix = "f") { return `${prefix}${++UI._uid}`; },

    /* ---------- buttons ---------- */
    button(label, { variant = "", icon = "", onClick, type = "button", size = "", title = "", disabled = false } = {}) {
        const cls = ["btn", variant && `btn--${variant}`, size && `btn--${size}`].filter(Boolean).join(" ");
        return UI.h("button", { class: cls, type, onClick, title, disabled }, icon && UI.icon(icon), label && UI.h("span", null, label));
    },

    iconButton(icon, label, onClick, danger = false) {
        return UI.h("button", { class: "btn btn--icon" + (danger ? " is-danger" : ""), type: "button", "aria-label": label, title: label, onClick }, UI.icon(icon));
    },

    /* ---------- form field ----------
       Returns { el, input, value(), setValue(v), error(msg), ok(msg), clear() } */
    field({ label, name, type = "text", value = "", placeholder = "", hint = "", optional = false, inputmode, autocomplete = "off",
        maxlength, readonly = false, money = false, onInput, select = null, autofocus = false, required = false } = {}) {
        const id = UI.uid("in");
        const hintId = id + "-hint", msgId = id + "-msg";
        let input;
        if (select) {
            input = UI.h("select", { class: "select", id, name }, select.map(o => UI.h("option", { value: o.value }, o.label)));
            input.value = value;
        } else {
            input = UI.h("input", { class: "input" + (money ? " input--money" : ""), id, name, type: money ? "text" : type, value, placeholder,
                inputmode: money ? "decimal" : inputmode, autocomplete, maxlength, readOnly: readonly, autofocus, required: required || null,
                "aria-describedby": hint ? `${hintId} ${msgId}` : msgId });
        }
        const box = UI.h("div", { class: "field__box" }, money && UI.h("span", { class: "field__prefix", "aria-hidden": "true" }, "$"), input);
        const msg = UI.h("div", { id: msgId, "aria-live": "polite" });
        const el = UI.h("div", { class: "field" },
            UI.h("label", { class: "field__label", for: id }, label, optional && UI.h("span", { class: "field__opt" }, " (optional)")),
            box,
            hint && UI.h("div", { class: "field__hint", id: hintId }, hint),
            msg);

        if (type === "password" && !select) {
            input.style.paddingRight = "48px";
            const toggle = UI.h("button", { class: "btn btn--icon field__toggle", type: "button", "aria-label": "Show password", "aria-pressed": "false" }, UI.icon("eye"));
            toggle.addEventListener("click", () => {
                const show = input.type === "password";
                input.type = show ? "text" : "password";
                toggle.setAttribute("aria-pressed", String(show));
                toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
                UI.clear(toggle).appendChild(UI.icon(show ? "eyeoff" : "eye"));
            });
            box.appendChild(toggle);
        }

        const api = {
            el, input,
            value: () => input.value,
            setValue: (v) => { input.value = v; },
            clear() { el.classList.remove("field--invalid", "field--valid"); input.removeAttribute("aria-invalid"); UI.clear(msg); },
            error(text) {
                api.clear(); if (!text) return false;
                el.classList.add("field--invalid"); input.setAttribute("aria-invalid", "true");
                msg.appendChild(UI.h("div", { class: "field__msg field__msg--error" }, UI.icon("alert"), UI.h("span", null, text)));
                return false;
            },
            ok(text) {
                api.clear(); el.classList.add("field--valid");
                if (text) msg.appendChild(UI.h("div", { class: "field__msg field__msg--ok" }, UI.icon("check"), UI.h("span", null, text)));
                return true;
            },
        };
        if (onInput) input.addEventListener("input", () => onInput(input.value, api));
        return api;
    },

    /* ---------- containers ---------- */
    pageHead(title, subtitle, actions) {
        return UI.h("header", { class: "page-head" },
            UI.h("div", null,
                UI.h("h1", { class: "page-head__title", tabindex: "-1", id: "page-title" }, title),
                subtitle && UI.h("p", { class: "page-head__sub" }, subtitle)),
            actions && UI.h("div", { class: "page-head__actions" }, actions));
    },

    card(...children) { return UI.h("section", { class: "card" }, children); },

    badge(text, variant = "") { return UI.h("span", { class: "badge" + (variant ? ` badge--${variant}` : "") }, text); },

    empty(title, body, action) {
        return UI.h("div", { class: "empty" }, UI.h("div", { class: "empty__title" }, title), body && UI.h("p", null, body), action);
    },

    /* ---------- table ----------
       columns: [{label, render(row) | key, align:"r", cls}], rows: [], empty: node */
    table({ columns, rows, empty, footer, scroll = false }) {
        if (!rows.length) return empty || UI.empty("Nothing here yet", "");
        const thead = UI.h("thead", null, UI.h("tr", null, columns.map(c => UI.h("th", { class: [c.align === "r" ? "r" : "", c.cls || ""].join(" ").trim(), scope: "col" }, c.label))));
        const tbody = UI.h("tbody", null, rows.map(r => UI.h("tr", null, columns.map(c => {
            const content = c.render ? c.render(r) : r[c.key];
            return UI.h("td", { class: [c.align === "r" ? "r" : "", c.cls || ""].join(" ").trim(), "data-label": c.label }, content);
        }))));
        const table = UI.h("table", { class: "table" }, thead, tbody, footer || null);
        return UI.h("div", { class: "table-wrap" + (scroll ? " table-scroll" : "") }, table);
    },

    /* ---------- toast ---------- */
    toast(message, kind = "success") {
        let host = document.getElementById("toasts");
        if (!host) { host = UI.h("div", { id: "toasts", class: "toasts", role: "status", "aria-live": "polite" }); document.body.appendChild(host); }
        const t = UI.h("div", { class: `toast toast--${kind}` }, UI.icon(kind === "error" ? "alert" : kind === "success" ? "check" : "info"), UI.h("span", null, message));
        host.appendChild(t);
        while (host.children.length > 3) host.firstChild.remove();
        setTimeout(() => { t.dataset.leaving = "true"; setTimeout(() => t.remove(), 220); }, kind === "error" ? 6000 : 3800);
    },

    /* ---------- confirm dialog (native <dialog>: focus trap + Esc for free) ---------- */
    confirm({ title, text, detail, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false }) {
        return new Promise(resolve => {
            const dlg = UI.h("dialog", { class: "dialog", "aria-labelledby": "dlg-title" });
            let result = false;
            const ok = UI.button(confirmLabel, { variant: danger ? "danger" : "", onClick: () => { result = true; dlg.close(); } });
            const cancel = UI.button(cancelLabel, { variant: "secondary", onClick: () => dlg.close() });
            dlg.append(
                UI.h("div", { class: "dialog__body" },
                    UI.h("h2", { class: "dialog__title", id: "dlg-title" }, title),
                    text && UI.h("p", { class: "dialog__text" }, text),
                    detail && UI.h("div", { class: "dialog__detail" }, detail)),
                UI.h("div", { class: "dialog__actions" }, cancel, ok));
            dlg.addEventListener("close", () => { dlg.remove(); resolve(result); });
            document.body.appendChild(dlg);
            dlg.showModal();
            (danger ? cancel : ok).focus();
        });
    },

    /* two-column key/value list */
    dl(pairs) {
        return UI.h("dl", { class: "dl" }, pairs.filter(Boolean).map(([k, v]) => [UI.h("dt", null, k), UI.h("dd", null, v)]));
    },

    /* ---------- receipt slip ---------- */
    receipt({ kind, amount, rows, ruled = [] }) {
        return UI.h("article", { class: "receipt", "aria-label": `${kind} receipt` },
            UI.h("div", { class: "receipt__head" },
                UI.h("div", { class: "receipt__bank" }, "Bank System Simulation"),
                UI.h("div", { class: "receipt__kind" }, kind)),
            amount !== undefined && UI.h("div", { class: "receipt__amount" }, amount),
            UI.h("div", { class: "receipt__rows" }, rows.map(([k, v]) => UI.h("div", { class: "receipt__row" }, UI.h("span", null, k), UI.h("span", null, v)))),
            ruled.length > 0 && UI.h("div", { class: "receipt__rows receipt__rows--ruled" }, ruled.map(([k, v]) => UI.h("div", { class: "receipt__row" }, UI.h("span", null, k), UI.h("span", null, v)))),
            UI.h("div", { class: "receipt__foot" }, "Simulation only. No real money moved."));
    },

    /* two-button row under a receipt */
    receiptActions(...buttons) {
        return UI.h("div", { class: "row", style: "justify-content:center" }, UI.button("Print receipt", { variant: "secondary", icon: "print", onClick: () => window.print() }), buttons);
    },
};
