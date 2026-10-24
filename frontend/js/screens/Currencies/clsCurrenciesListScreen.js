/* clsCurrenciesListScreen — every currency with its rate against the US dollar. */
class clsCurrenciesListScreen extends clsScreen {
    static async Show() {
        const all = await clsCurrency.GetCurrenciesList();
        const list = UI.h("div");
        const count = UI.h("div", { class: "toolbar__count", "aria-live": "polite" });
        const search = UI.field({ label: "Search currencies", name: "q", type: "search", placeholder: "Country, code or currency name" });

        const render = () => {
            const q = search.value().trim().toLowerCase();
            const rows = all.filter(c => !q || [c.Country(), c.CurrencyCode(), c.CurrencyName()].join(" ").toLowerCase().includes(q));
            count.textContent = q ? `${rows.length} of ${all.length}` : `${all.length} currencies`;
            UI.clear(list).appendChild(UI.table({
                rows, scroll: true,
                empty: UI.empty("No currency matches your search", "Try a country name or a three-letter code such as EUR."),
                columns: [
                    { label: "Country", render: c => c.Country() },
                    { label: "Code", render: c => c.CurrencyCode(), cls: "strong" },
                    { label: "Currency", render: c => c.CurrencyName(), cls: "hide-sm" },
                    { label: "Rate for $1", align: "r", render: c => UI.rate(c.Rate()) },
                ],
            }));
        };
        search.input.addEventListener("input", UI.debounce(render, 120));
        render();

        return UI.h("div", null,
            clsScreen._Header("Currency rates", "How much of each currency one US dollar buys."),
            UI.h("section", { class: "card card--flush" }, UI.h("div", { class: "toolbar" }, search.el, count), list));
    }
}
