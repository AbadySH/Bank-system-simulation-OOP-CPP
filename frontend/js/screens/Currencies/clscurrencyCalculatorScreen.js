/* clscurrencyCalculatorScreen — convert an amount between any two currencies, via the US dollar. */
class clscurrencyCalculatorScreen extends clsScreen {
    static _Fmt(n) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }

    static async Show() {
        const currencies = await clsCurrency.GetUniqueCurrencies();
        const options = currencies.map(c => ({ value: c.CurrencyCode(), label: `${c.CurrencyCode()} — ${c.CurrencyName()}` }));
        const has = (code) => currencies.some(c => c.CurrencyCode() === code);

        const amount = UI.field({ label: "Amount", name: "amount", value: "100", inputmode: "decimal", autofocus: true });
        const from = UI.field({ label: "From", name: "from", select: options, value: "USD" });
        const to = UI.field({ label: "To", name: "to", select: options, value: has("EUR") ? "EUR" : (currencies[1] || currencies[0]).CurrencyCode() });
        const out = UI.h("div", { "aria-live": "polite" });

        let seq = 0;
        const calc = async () => {
            const mine = ++seq;
            amount.clear();
            const a = Number(String(amount.value()).replace(/[,\s]/g, ""));
            if (amount.value().trim() === "" || !Number.isFinite(a) || a < 0 || !/^[\d,.\s]+$/.test(amount.value())) {
                UI.clear(out);
                if (amount.value().trim() !== "") amount.error("Enter a number, like 250 or 99.50.");
                return;
            }
            let r;
            try { r = await clsCurrency.Convert(a, from.value(), to.value()); }
            catch (err) { if (mine === seq) { UI.clear(out); amount.error(err.fields?.amount || err.message); } return; }
            if (mine !== seq) return;           // a newer calculation is on its way
            UI.clear(out);
            const c1 = { CurrencyCode: () => r.from, Rate: () => r.rateFrom }, c2 = { CurrencyCode: () => r.to, Rate: () => r.rateTo };
            const usd = r.usdAmount, res = r.result;
            const F = clscurrencyCalculatorScreen._Fmt;
            out.appendChild(UI.h("div", { class: "result" },
                UI.h("div", { class: "result__line" }, `${F(a)} ${c1.CurrencyCode()} equals`),
                UI.h("div", { class: "result__big" }, `${F(res)} ${c2.CurrencyCode()}`),
                UI.h("div", { class: "result__rate" }, c1.CurrencyCode() === "USD" || c2.CurrencyCode() === "USD"
                    ? `1 USD = ${UI.rate(c1.CurrencyCode() === "USD" ? c2.Rate() : c1.Rate())} ${c1.CurrencyCode() === "USD" ? c2.CurrencyCode() : c1.CurrencyCode()}`
                    : `${F(a)} ${c1.CurrencyCode()} = ${F(usd)} USD, then × ${UI.rate(c2.Rate())} ${c2.CurrencyCode()} per USD`)));
        };
        [amount, from, to].forEach(f => f.input.addEventListener("input", calc));
        from.input.addEventListener("change", calc); to.input.addEventListener("change", calc);

        const swap = UI.button("", { variant: "secondary", icon: "swap", title: "Swap currencies", onClick: () => {
            const f = from.value(); from.setValue(to.value()); to.setValue(f); calc();
        } });
        swap.setAttribute("aria-label", "Swap currencies");
        swap.style.width = "46px"; swap.style.padding = "0";
        calc();

        return UI.h("div", null, clsScreen._Header("Currency calculator", "Convert an amount from one currency to another."),
            UI.h("div", { style: "max-width:760px" }, UI.card(UI.h("div", { class: "stack" }, amount.el,
                UI.h("div", { class: "convert" }, from.el, swap, to.el), out))));
    }
}
