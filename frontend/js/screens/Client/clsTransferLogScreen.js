/* clsTransferLogScreen — every transfer ever made, newest first, filterable. */
class clsTransferLogScreen extends clsScreen {
    static async Show() {
        const all = await clsBankClient.GetTransferLog();      // the server sends newest first
        const list = UI.h("div");
        const count = UI.h("div", { class: "toolbar__count", "aria-live": "polite" });
        const search = UI.field({ label: "Filter the log", name: "q", type: "search", placeholder: "Account or user name" });

        const render = () => {
            const q = search.value().trim().toLowerCase();
            const rows = all.filter(r => !q || [r.from, r.to, r.by].join(" ").toLowerCase().includes(q));
            count.textContent = q ? `${rows.length} of ${all.length} transfers` : `${all.length} transfer${all.length === 1 ? "" : "s"}`;
            UI.clear(list).appendChild(UI.table({
                rows,
                empty: all.length ? UI.empty("No transfer matches your filter", "Try an account number or a user name.")
                    : UI.empty("No transfers yet", "Every transfer is recorded here with the balances after it."),
                columns: [
                    { label: "Date and time", render: r => clsDate.DisplayDateTime(r.dateTime), cls: "num" },
                    { label: "From", render: r => r.from, cls: "strong" },
                    { label: "To", render: r => r.to, cls: "strong" },
                    { label: "Amount", align: "r", render: r => UI.money(r.amount) },
                    { label: "Sender after", align: "r", cls: "hide-sm", render: r => UI.money(r.fromBalanceAfter) },
                    { label: "Receiver after", align: "r", cls: "hide-sm", render: r => UI.money(r.toBalanceAfter) },
                    { label: "By", render: r => r.by },
                ],
            }));
        };
        search.input.addEventListener("input", UI.debounce(render, 120));
        render();

        return UI.h("div", null,
            clsScreen._Header("Transfer log", "A permanent record of every transfer."),
            UI.h("section", { class: "card card--flush" }, UI.h("div", { class: "toolbar" }, search.el, count), list));
    }
}
