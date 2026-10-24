/* clsUpdateCurrencyRateScreen — set a new rate for a currency (rates are measured against the US dollar). */
class clsUpdateCurrencyRateScreen extends clsScreen {
    static async Show() {
        const host = UI.h("div", { "aria-live": "polite" });
        const all = await clsCurrency.GetCurrenciesList();
        const dl = UI.h("datalist", { id: "ur-list" }, all.filter((c, i) => all.findIndex(x => x.CurrencyCode() === c.CurrencyCode()) === i).map(c => UI.h("option", { value: c.CurrencyCode() }, c.CurrencyName())));
        const code = UI.field({ label: "Currency code", name: "code", placeholder: "e.g. EUR", hint: "Type a three-letter code.", autofocus: true });
        code.input.setAttribute("list", "ur-list");

        const showForm = (c) => {
            UI.clear(host);
            const shared = all.filter(x => x.CurrencyCode() === c.CurrencyCode()).length;
            const rate = UI.field({ label: "New rate for $1", name: "rate", value: String(c.Rate()), inputmode: "decimal",
                hint: shared > 1 ? `${shared} countries use ${c.CurrencyCode()}. The new rate applies to all of them.` : "Up to six decimals." });
            const save = clsScreen.OnSubmit(async () => {
                const v = clsInputValidate.ParseRate(rate.value());
                if (Number.isNaN(v) || v <= 0) { rate.error("Enter a rate above zero, using numbers only (for example 0.92)."); rate.input.focus(); return; }
                const ok = await UI.confirm({ title: "Update rate?", confirmLabel: "Update rate",
                    text: `Change the ${c.CurrencyCode()} rate from ${UI.rate(c.Rate())} to ${UI.rate(v)} per US dollar.` });
                if (!ok) return;
                await c.UpdateRate(v);
                all.filter(x => x.CurrencyCode() === c.CurrencyCode()).forEach(x => { x._d = { ...x._d, rate: v }; });
                UI.toast(`${c.CurrencyCode()} rate updated to ${UI.rate(v)}`);
                lookup(true);
            }, { rate });
            host.appendChild(UI.h("form", { novalidate: true, onSubmit: save },
                UI.card(UI.h("h2", { class: "card__title" }, `${c.CurrencyName()} (${c.CurrencyCode()})`),
                    UI.h("p", { class: "card__sub" }, `Current rate: ${UI.rate(c.Rate())} per US dollar`),
                    UI.h("div", { class: "stack", style: "max-width:320px" }, rate.el, UI.h("div", { class: "form__actions" }, UI.button("Update rate", { type: "submit", icon: "check" }))))));
        };

        let shown = null;   // don't rebuild the form (and lose focus) when only a blur fires
        let seq = 0;
        const lookup = async (force = false) => {
            const q = code.value().trim().toUpperCase();
            if (!force && q === shown) return;
            shown = q;
            const mine = ++seq;
            UI.clear(host);
            if (!q) { code.clear(); return; }
            let c;
            try { c = await clsCurrency.FindByCode(q); } catch (err) { if (mine === seq) code.error(err.message); return; }
            if (mine !== seq) return;
            if (c.IsEmpty()) { code.error(`No currency has the code “${q.toUpperCase()}”. Codes have three letters, like USD.`); return; }
            code.ok(); showForm(c);
        };
        code.input.addEventListener("input", UI.debounce(() => lookup(), 200));
        code.input.addEventListener("change", () => lookup());

        return UI.h("div", null, clsScreen._Header("Update rate", "Change a currency’s rate against the US dollar."),
            UI.h("div", { class: "stack", style: "max-width:640px" }, UI.card(code.el, dl), host));
    }
}
