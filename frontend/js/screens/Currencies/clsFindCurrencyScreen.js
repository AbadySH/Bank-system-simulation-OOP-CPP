/* clsFindCurrencyScreen — look a currency up by its code or by its country. */
class clsFindCurrencyScreen extends clsScreen {
    static async Show() {
        const all = await clsCurrency.GetCurrenciesList();
        const unique = all.filter((c, i) => all.findIndex(x => x.CurrencyCode() === c.CurrencyCode()) === i);
        let mode = "code";
        const out = UI.h("div", { "aria-live": "polite" });
        const dl = UI.h("datalist", { id: "fc-list" });
        const field = UI.field({ label: "Currency code", name: "q", placeholder: "e.g. EUR", hint: "Type a three-letter code.", autofocus: true });
        field.input.setAttribute("list", "fc-list");

        const fillList = () => {
            UI.clear(dl);
            const items = mode === "code" ? unique.map(c => [c.CurrencyCode(), c.CurrencyName()]) : all.map(c => [c.Country(), c.CurrencyCode()]);
            items.forEach(([v, l]) => dl.appendChild(UI.h("option", { value: v }, l)));
        };

        let seq = 0;
        const find = async () => {
            const mine = ++seq;
            UI.clear(out);
            const q = field.value().trim();
            if (!q) { field.clear(); return; }
            let c;
            try { c = mode === "code" ? await clsCurrency.FindByCode(q) : await clsCurrency.FindByCountry(q); }
            catch (err) { if (mine === seq) field.error(err.message); return; }
            if (mine !== seq) return;
            if (c.IsEmpty()) {
                field.error(mode === "code" ? `No currency has the code “${q.toUpperCase()}”. Codes have three letters, like USD.` : `No country is named “${q}”. Pick one from the suggestions.`);
                return;
            }
            field.ok();
            out.appendChild(UI.card(
                UI.h("h2", { class: "card__title" }, `${c.CurrencyName()} (${c.CurrencyCode()})`),
                UI.h("p", { class: "card__sub" }, c.Country()),
                UI.dl([["Country", c.Country()], ["Code", c.CurrencyCode()], ["Currency", c.CurrencyName()], ["Rate for $1", UI.rate(c.Rate())]])));
        };
        field.input.addEventListener("input", UI.debounce(find, 200));
        field.input.addEventListener("change", find);

        const setMode = (m) => {
            mode = m;
            seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
            field.el.querySelector("label").textContent = m === "code" ? "Currency code" : "Country";
            field.el.querySelector(".field__hint").textContent = m === "code" ? "Type a three-letter code." : "Type a country name and pick it from the suggestions.";
            field.input.placeholder = m === "code" ? "e.g. EUR" : "e.g. Egypt";
            field.setValue(""); UI.clear(out); field.clear(); fillList(); field.input.focus();
        };
        const seg = UI.h("div", { class: "seg", role: "group", "aria-label": "Search by" },
            UI.h("button", { type: "button", "data-mode": "code", "aria-pressed": "true", onClick: () => setMode("code") }, "By code"),
            UI.h("button", { type: "button", "data-mode": "country", "aria-pressed": "false", onClick: () => setMode("country") }, "By country"));
        fillList();

        return UI.h("div", null, clsScreen._Header("Find currency", "Look up one currency and its rate."),
            UI.h("div", { class: "stack", style: "max-width:640px" }, UI.card(UI.h("div", { class: "stack" }, seg, field.el, dl)), out));
    }
}
