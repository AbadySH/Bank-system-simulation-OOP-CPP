/* clsClientForm — the client form shared by "Add client" and "Update client".
   When updating, a field the user did not touch is not re-validated, so older sample records
   (short phone numbers, odd e-mails) can still be edited without being forced to change them. */
class clsClientForm {
    constructor({ client = null, mode = "add" } = {}) {
        this.mode = mode;
        this.orig = client;
        const o = (get) => (client ? get(client) : "");
        const upd = mode === "update";

        this.acc = UI.field({ label: "Account number", name: "account", value: o(c => c.AccountNumber()), readonly: upd,
            hint: upd ? "The account number can’t be changed." : "Letters, numbers and dashes. This can’t be changed later.", maxlength: 12,
            onInput: upd ? null : UI.debounce(async (v, f) => {
                if (!v.trim()) return f.clear();
                if (!clsInputValidate.IsValidAccountNumber(v)) return f.error("Use 2 to 12 letters, numbers or dashes.");
                let taken;
                try { taken = await clsBankClient.IsClientExist(v.trim()); } catch (e) { return; }
                if (f.value() !== v) return;          // you kept typing; this answer is stale
                if (taken) return f.error(`Account number ${v.trim().toUpperCase()} is already used. Choose another.`);
                f.ok("Available");
            }) });
        this.pin = UI.field({ label: "PIN code", name: "pin", type: "password", hint: upd ? "Leave blank to keep the current PIN. Otherwise 3 to 8 characters, no spaces." : "3 to 8 characters, no spaces.", maxlength: 8, autocomplete: "new-password" });
        this.first = UI.field({ label: "First name", name: "first", value: o(c => c.GetFirstName()), maxlength: 40, autocomplete: "off" });
        this.last = UI.field({ label: "Last name", name: "last", value: o(c => c.GetLastName()), maxlength: 40, autocomplete: "off" });
        this.email = UI.field({ label: "E-mail", name: "email", type: "email", value: o(c => c.GetEmail()), maxlength: 80, inputmode: "email" });
        this.phone = UI.field({ label: "Phone", name: "phone", type: "tel", value: o(c => c.GetPhone()), maxlength: 20, inputmode: "tel" });
        this.balance = UI.field({ label: upd ? "Account balance" : "Opening balance", name: "balance", money: true,
            value: client ? client.GetAccountBalance().toFixed(2) : "0.00",
            hint: upd ? "Changing the balance here is an administrator correction, not a transaction." : "You can leave this at 0.00 and deposit later." });

        this.el = UI.h("div", { class: "form form--cols" }, this.acc.el, this.pin.el, this.first.el, this.last.el, this.email.el, this.phone.el, this.balance.el);
    }

    _untouched(field, getOriginal) {
        return this.mode === "update" && this.orig && field.value().trim() === String(getOriginal(this.orig));
    }

    /* Shows a message next to every wrong field and focuses the first one. Returns true when all is well. */
    validate() {
        const bad = [];
        const check = (field, ok, msg, orig) => {
            field.clear();
            if (orig && this._untouched(field, orig)) return;
            if (!ok) { field.error(msg); bad.push(field); }
        };
        const a = this.acc.value().trim();
        if (this.mode === "add") check(this.acc, clsInputValidate.IsValidAccountNumber(a), "Use 2 to 12 letters, numbers or dashes.");
        /* When updating, an empty PIN means "keep the current one". */
        check(this.pin, this.mode === "update" && this.pin.value() === "" || clsInputValidate.IsValidPin(this.pin.value()), "The PIN must be 3 to 8 characters with no spaces.");
        check(this.first, clsInputValidate.IsNonEmpty(this.first.value()), "Enter a first name.", c => c.GetFirstName());
        check(this.last, clsInputValidate.IsNonEmpty(this.last.value()), "Enter a last name.", c => c.GetLastName());
        check(this.email, clsInputValidate.IsValidEmail(this.email.value()), "Enter an e-mail address like name@example.com.", c => c.GetEmail());
        check(this.phone, clsInputValidate.IsValidPhone(this.phone.value()), "Enter a phone number with at least 5 digits.", c => c.GetPhone());
        const bal = clsInputValidate.ParseAmount(this.balance.value());
        check(this.balance, !Number.isNaN(bal) && bal <= 1e12, "Use numbers only, with up to two decimals (for example 1500.00).");
        if (bad.length) bad[0].input.focus();
        return bad.length === 0;
    }

    /* What the server expects. The server checks everything again, so this is only the browser's first line. */
    payload() {
        return { account: this.acc.value().trim(), pin: this.pin.value(), firstName: this.first.value().trim(), lastName: this.last.value().trim(),
            email: this.email.value().trim(), phone: this.phone.value().trim(), balance: clsInputValidate.ParseAmount(this.balance.value()) };
    }

    /* Server field name -> form field, so server messages land under the right box. */
    fieldMap() { return { account: this.acc, pin: this.pin, firstName: this.first, lastName: this.last, email: this.email, phone: this.phone, balance: this.balance }; }
}
