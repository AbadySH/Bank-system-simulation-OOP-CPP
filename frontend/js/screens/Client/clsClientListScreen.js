/* clsClientListScreen — all clients, searchable, with row actions the user is allowed to use. */
class clsClientListScreen extends clsScreen {
    static async Show() {
        const P = clsUser.enPermissions, me = Global.CurrentUser, can = (p) => me.CheckAccessPermission(p);
        const all = await clsBankClient.GetClientsList();
        const list = UI.h("div");
        const count = UI.h("div", { class: "toolbar__count", "aria-live": "polite" });
        const search = UI.field({ label: "Search clients", name: "q", placeholder: "Name, account, e-mail or phone", type: "search" });

        const go = (path, acc) => () => Router.go(path, { acc });
        const render = () => {
            const q = search.value().trim().toLowerCase();
            const rows = all.filter(c => !q || [c.AccountNumber(), c.FullName(), c.GetEmail(), c.GetPhone()].join(" ").toLowerCase().includes(q));
            count.textContent = q ? `${rows.length} of ${all.length} clients` : `${all.length} client${all.length === 1 ? "" : "s"}`;
            UI.clear(list).appendChild(UI.table({
                rows,
                empty: all.length
                    ? UI.empty("No client matches your search", "Try part of a name, or an account number.")
                    : UI.empty("No clients yet", "Add the first client to get started.", can(P.pAddNewClient) ? UI.button("Add client", { icon: "userplus", onClick: () => Router.go("clients/add") }) : null),
                columns: [
                    { label: "Account", render: c => c.AccountNumber(), cls: "strong" },
                    { label: "Name", render: c => c.FullName() },
                    { label: "Phone", render: c => c.GetPhone(), cls: "hide-sm" },
                    { label: "E-mail", render: c => c.GetEmail(), cls: "hide-sm" },
                    { label: "Balance", align: "r", render: c => UI.money(c.GetAccountBalance()) },
                    { label: "Actions", cls: "actions", render: c => UI.h("div", { class: "row", style: "gap:0;justify-content:flex-end;flex-wrap:nowrap" },
                        can(P.pTranactions) && UI.iconButton("deposit", `Deposit to ${c.AccountNumber()}`, go("transactions/deposit", c.AccountNumber())),
                        can(P.pTranactions) && UI.iconButton("withdraw", `Withdraw from ${c.AccountNumber()}`, go("transactions/withdraw", c.AccountNumber())),
                        can(P.pUpdateClients) && UI.iconButton("edit", `Edit ${c.AccountNumber()}`, go("clients/update", c.AccountNumber())),
                        can(P.pDeleteClient) && UI.iconButton("trash", `Delete ${c.AccountNumber()}`, go("clients/delete", c.AccountNumber()), true)) },
                ],
            }));
        };
        search.input.addEventListener("input", UI.debounce(render, 120));
        render();

        return UI.h("div", null,
            clsScreen._Header("Client list", "Every client account in the bank.",
                can(P.pAddNewClient) && UI.button("Add client", { icon: "userplus", onClick: () => Router.go("clients/add") })),
            UI.h("section", { class: "card card--flush" }, UI.h("div", { class: "toolbar" }, search.el, count), list));
    }
}
