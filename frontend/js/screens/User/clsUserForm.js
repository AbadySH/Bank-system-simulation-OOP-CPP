/* clsUserForm — the user form shared by "Add user" and "Update user", including the permission picker.
   Permissions are bit flags (1, 2, 4 …); "Full access" is stored as -1, exactly as in the console version. */
class clsUserForm {
    constructor({ user = null, mode = "add" } = {}) {
        this.mode = mode;
        this.orig = user;
        const o = (get) => (user ? get(user) : "");
        const upd = mode === "update";

        this.name = UI.field({ label: "User name", name: "username", value: o(u => u.GetUserName()), readonly: upd, maxlength: 20, autocomplete: "off",
            hint: upd ? "The user name can’t be changed." : "3 to 20 letters, numbers, dots, dashes or underscores.",
            onInput: upd ? null : UI.debounce(async (v, f) => {
                if (!v.trim()) return f.clear();
                if (!clsInputValidate.IsValidUserName(v)) return f.error("Use 3 to 20 letters, numbers, dots, dashes or underscores.");
                let taken;
                try { taken = await clsUser.IsUserExist(v.trim()); } catch (e) { return; }
                if (f.value() !== v) return;          // you kept typing; this answer is stale
                if (taken) return f.error(`The user name “${v.trim()}” is already used. Choose another.`);
                f.ok("Available");
            }) });
        this.pass = UI.field({ label: "Password", name: "password", type: "password", hint: upd ? "Leave blank to keep the current password. Otherwise 4 to 32 characters." : "4 to 32 characters.", maxlength: 32, autocomplete: "new-password" });
        this.first = UI.field({ label: "First name", name: "first", value: o(u => u.GetFirstName()), maxlength: 40 });
        this.last = UI.field({ label: "Last name", name: "last", value: o(u => u.GetLastName()), maxlength: 40 });
        this.email = UI.field({ label: "E-mail", name: "email", type: "email", value: o(u => u.GetEmail()), maxlength: 80, inputmode: "email" });
        this.phone = UI.field({ label: "Phone", name: "phone", type: "tel", value: o(u => u.GetPhone()), maxlength: 20, inputmode: "tel" });

        /* permission picker */
        const perms = user ? user.GetPermissions() : 0;
        this.full = UI.h("input", { type: "checkbox", id: "perm-full", checked: perms === clsUser.enPermissions.eAll });
        this.boxes = clsUser.PermissionList.map(p => ({ p, input: UI.h("input", { type: "checkbox", checked: perms !== clsUser.enPermissions.eAll && (perms & p.bit) === p.bit }) }));
        const grid = UI.h("div", { class: "perm-grid" }, this.boxes.map(({ p, input }) => UI.h("label", { class: "check" }, input, p.label)));
        const sync = () => {
            this.boxes.forEach(({ input }) => { input.disabled = this.full.checked; });
            grid.querySelectorAll(".check").forEach(l => l.dataset.disabled = String(this.full.checked));
        };
        this.full.addEventListener("change", sync);
        this.permMsg = UI.h("div", { "aria-live": "polite" });
        this.perms = UI.h("fieldset", { style: "border:0;padding:0;margin:0;min-width:0" },
            UI.h("legend", { class: "field__label", style: "padding:0;margin-bottom:8px" }, "Access"),
            UI.h("label", { class: "check check--full" }, this.full, "Full access to everything"),
            UI.h("p", { class: "field__hint", style: "margin:10px 0" }, "Or choose the screens this user may open:"),
            grid, this.permMsg);
        sync();

        this.el = UI.h("div", { class: "form form--cols" }, this.name.el, this.pass.el, this.first.el, this.last.el, this.email.el, this.phone.el,
            UI.h("div", { class: "span-2" }, this.perms));
    }

    Permissions() {
        if (this.full.checked) return clsUser.enPermissions.eAll;
        return this.boxes.reduce((sum, { p, input }) => sum + (input.checked ? p.bit : 0), 0);
    }

    _untouched(field, get) { return this.mode === "update" && this.orig && field.value().trim() === String(get(this.orig)); }

    validate() {
        const bad = [];
        const check = (field, ok, msg, orig) => {
            field.clear();
            if (orig && this._untouched(field, orig)) return;
            if (!ok) { field.error(msg); bad.push(field); }
        };
        if (this.mode === "add") check(this.name, clsInputValidate.IsValidUserName(this.name.value().trim()), "Use 3 to 20 letters, numbers, dots, dashes or underscores.");
        /* When updating, an empty password means "keep the current one". */
        check(this.pass, this.mode === "update" && this.pass.value() === "" || clsInputValidate.IsValidPassword(this.pass.value()), "The password must be 4 to 32 characters.");
        check(this.first, clsInputValidate.IsNonEmpty(this.first.value()), "Enter a first name.", u => u.GetFirstName());
        check(this.last, clsInputValidate.IsNonEmpty(this.last.value()), "Enter a last name.", u => u.GetLastName());
        check(this.email, clsInputValidate.IsValidEmail(this.email.value()), "Enter an e-mail address like name@example.com.", u => u.GetEmail());
        check(this.phone, clsInputValidate.IsValidPhone(this.phone.value()), "Enter a phone number with at least 5 digits.", u => u.GetPhone());
        UI.clear(this.permMsg);
        if (this.Permissions() === 0) {
            this.permMsg.appendChild(UI.h("div", { class: "field__msg field__msg--error", role: "alert" }, UI.icon("alert"), UI.h("span", null, "Choose at least one screen, or give full access.")));
            if (!bad.length) this.boxes[0].input.focus();
            bad.push({ input: this.boxes[0].input });
        }
        if (bad.length) bad[0].input.focus();
        return bad.length === 0;
    }

    payload() {
        return { userName: this.name.value().trim(), password: this.pass.value(), firstName: this.first.value().trim(), lastName: this.last.value().trim(),
            email: this.email.value().trim(), phone: this.phone.value().trim(), permissions: this.Permissions() };
    }

    fieldMap() { return { userName: this.name, password: this.pass, firstName: this.first, lastName: this.last, email: this.email, phone: this.phone }; }
}
