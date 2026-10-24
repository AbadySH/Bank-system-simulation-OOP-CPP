/* clsTotalBalancesScreen — every balance, each client's share of the total, and the total in words. */
class clsTotalBalancesScreen extends clsScreen {
    static async Show() {
        const { clients, total, totalInWords } = await clsBankClient.GetBalances();

        const footer = UI.h("tfoot", null, UI.h("tr", null,
            UI.h("td", { colspan: "2" }, `${clients.length} client${clients.length === 1 ? "" : "s"}`),
            UI.h("td", { class: "r" }, UI.money(total)),
            UI.h("td", null, "")));

        return UI.h("div", null,
            clsScreen._Header("Total balances", "What every account holds, and how the total divides between them."),
            UI.h("div", { class: "stack" },
                UI.h("div", { class: "stat stat--lead" },
                    UI.h("div", { class: "stat__label" }, "Total of all balances"),
                    UI.h("div", { class: "stat__value" }, UI.money(total)),
                    UI.h("div", { class: "stat__note" }, totalInWords)),
                UI.h("section", { class: "card card--flush" }, UI.table({
                    rows: clients, footer,
                    empty: UI.empty("No clients yet", "Balances appear here once you add clients."),
                    columns: [
                        { label: "Account", render: c => c.account, cls: "strong" },
                        { label: "Name", render: c => c.fullName },
                        { label: "Balance", align: "r", render: c => UI.money(c.balance) },
                        { label: "Share of total", render: c => {
                            const pct = c.share;
                            const bar = UI.h("i"); bar.style.width = Math.min(100, pct).toFixed(1) + "%";
                            return UI.h("div", { class: "share" }, UI.h("div", { class: "share__bar", role: "img", "aria-label": `${pct.toFixed(1)} percent of the total` }, bar), UI.h("span", { class: "share__pct" }, pct.toFixed(1) + "%"));
                        } },
                    ],
                }))));
    }
}
