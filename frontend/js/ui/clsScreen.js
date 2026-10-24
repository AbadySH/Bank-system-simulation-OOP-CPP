/* clsScreen — base class every screen inherits from (same role as clsScreen.h).
   It gives screens a header helper, the permission check and the shared client/user lookup widgets. */
class clsScreen {
    /* Permission guard. Returns true when the signed-in user may continue; otherwise it returns false
       and the router shows the "Access denied" page. */
    static CheckAccessRights(Permission) {
        return Global.CurrentUser.CheckAccessPermission(Permission);
    }

    static _Header(Title, Subtitle, Actions) { return UI.pageHead(Title, Subtitle, Actions); }

    static _Money(n) { return UI.money(n); }

    /* ---------- shared: read-only client card ---------- */
    static ClientCard(Client, { extra } = {}) {
        return UI.h("div", { class: "pcard" },
            UI.h("div", { class: "pcard__top" },
                UI.h("div", { class: "pcard__name" }, Client.FullName() || "Unnamed client"),
                UI.h("div", { class: "pcard__acc" }, "Account ", UI.h("b", null, Client.AccountNumber()))),
            UI.h("div", { class: "pcard__balance" }, UI.money(Client.GetAccountBalance())),
            UI.h("div", { class: "pcard__meta" },
                Client.GetEmail() && UI.h("div", null, Client.GetEmail()),
                Client.GetPhone() && UI.h("div", null, Client.GetPhone())),
            extra);
    }

    static UserCard(User) {
        const perms = User.DescribePermissions();
        return UI.h("div", { class: "pcard" },
            UI.h("div", { class: "pcard__top" },
                UI.h("div", { class: "pcard__name" }, User.FullName() || User.GetUserName()),
                UI.h("div", { class: "pcard__acc" }, "User name ", UI.h("b", null, User.GetUserName()))),
            UI.h("div", { class: "pcard__meta" },
                User.GetEmail() && UI.h("div", null, User.GetEmail()),
                User.GetPhone() && UI.h("div", null, User.GetPhone())),
            UI.h("div", { class: "row", style: "gap:6px" }, perms.length ? perms.map(p => UI.badge(p, User.HasFullAccess() ? "brass" : "")) : UI.badge("No access", "muted")));
    }

    /* ---------- shared: account lookup ----------
       A text box that finds a client (or user) as you type and shows the card underneath.
       Calls onChange(entity | null). */
    static Picker({ label = "Account number", hint = "", mode = "client", initial = "", onChange, autofocus = true, exclude } = {}) {
        const isClient = mode === "client";
        const listId = UI.uid("list");
        const field = UI.field({ label: isClient ? label : "User name", name: "lookup", placeholder: isClient ? "e.g. A101" : "e.g. User1", hint, autofocus });
        field.input.setAttribute("list", listId);
        field.input.setAttribute("autocapitalize", "characters");
        const datalist = UI.h("datalist", { id: listId });
        /* Suggestions arrive a moment later; the box works without them. */
        (isClient ? clsBankClient.Suggestions().then(l => l.map(c => [c.account, c.name]))
                  : clsUser.GetUsersList().then(l => l.map(u => [u.GetUserName(), u.FullName()])))
            .then(items => items.forEach(([v, l]) => datalist.appendChild(UI.h("option", { value: v }, l)))).catch(() => {});
        const preview = UI.h("div", { "aria-live": "polite" });
        const el = UI.h("div", { class: "picker" }, field.el, datalist, preview);
        let current = null, seq = 0;

        /* Re-render only when the text really changed (or when forced). Otherwise tabbing out of the box
           would rebuild the form below it and throw away the focus and anything already typed.
           The seq counter drops answers that arrive after a newer lookup has started. */
        let lastRaw = null;
        const lookup = async (force = false) => {
            const raw = field.value().trim();
            if (!force && raw === lastRaw) return;
            lastRaw = raw;
            const mine = ++seq;
            UI.clear(preview);
            current = null;
            if (!raw) { field.clear(); onChange && onChange(null); return; }
            let found;
            try { found = isClient ? await clsBankClient.Find(raw) : await clsUser.Find(raw); }
            catch (err) { if (mine === seq) { field.error(err.message); onChange && onChange(null); } return; }
            if (mine !== seq) return;
            if (found.IsEmpty()) {
                field.error(isClient ? `No client has account number “${raw}”. Check the number and try again.` : `No user is named “${raw}”.`);
                onChange && onChange(null); return;
            }
            if (exclude && exclude(found)) { field.error(exclude.message || "This account can't be used here."); onChange && onChange(null); return; }
            field.ok();
            current = found;
            preview.appendChild(isClient ? clsScreen.ClientCard(found) : clsScreen.UserCard(found));
            onChange && onChange(found);
        };
        field.input.addEventListener("input", UI.debounce(() => lookup(), 200));
        field.input.addEventListener("change", () => lookup());
        if (initial) { field.setValue(initial); lookup(true); }
        return { el, field, get: () => current, refresh: () => lookup(true), focus: () => field.input.focus(), reset() { field.setValue(""); return lookup(true); } };
    }

    /* Shows a failed server call next to the right fields. `map` turns the server's field names into form
       fields, e.g. { amount: amountField }. Anything left over becomes a toast. Returns the first field shown. */
    static ShowError(err, map = {}) {
        let first = null;
        for (const [k, msg] of Object.entries(err.fields || {})) {
            const f = map[k];
            if (f) { f.error(msg); first = first || f; }
        }
        if (!first) UI.toast(err.message, "error");
        else first.input.focus();
        return first;
    }

    /* Wraps a form's submit handler: stops the page reload, ignores a second click while the server is
       still answering, and turns any failed call into a visible message. */
    static OnSubmit(fn, map = {}) {
        let busy = false;
        return async (e) => {
            e.preventDefault();
            if (busy) return;
            busy = true;
            const btns = [...e.target.querySelectorAll("button[type=submit]")];
            btns.forEach(b => b.disabled = true);
            try { await fn(e); }
            catch (err) { clsScreen.ShowError(err, typeof map === "function" ? map() : map); }
            finally { busy = false; btns.forEach(b => b.disabled = false); }
        };
    }

    /* Amount input -> number, with a friendly message. Returns {value, error}. */
    static ReadAmount(field, { max, maxLabel } = {}) {
        const v = clsInputValidate.ParseAmount(field.value());
        if (field.value().trim() === "") return { error: "Enter an amount." };
        if (Number.isNaN(v)) return { error: "Use numbers only, with up to two decimals (for example 250.50)." };
        if (v <= 0) return { error: "The amount must be more than zero." };
        if (max !== undefined && v > max) return { error: `That is more than ${maxLabel || "the available balance"} of ${UI.money(max)}.` };
        return { value: v };
    }
}
