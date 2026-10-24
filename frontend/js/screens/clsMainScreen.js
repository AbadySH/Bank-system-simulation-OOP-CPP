/* clsMainScreen — the overview that replaces the numbered "Main Menu" of the console version.
   The navigation itself lives in the sidebar; this page shows the state of the bank and what the user may do. */
class clsMainScreen extends clsScreen {
    static _Greeting() {
        const h = new Date().getHours();
        return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    }

    static _Stat(label, value, note, { lead = false, locked = false } = {}) {
        return UI.h("div", { class: "stat" + (lead ? " stat--lead" : "") + (locked ? " stat--locked" : "") },
            UI.h("div", { class: "stat__label" }, label),
            UI.h("div", { class: "stat__value" }, value),
            note && UI.h("div", { class: "stat__note" }, note));
    }

    static async Show() {
        const me = Global.CurrentUser;
        const o = await Api.get("/api/overview");        // the server leaves out what your access doesn't cover
        const lockedNote = (what) => `Needs access to ${what}`;
        const clients = o.clientsCount !== null, transfers = o.totalBalances !== null, logins = o.signInsTotal !== null;

        const stats = UI.h("div", { class: "stats" },
            clsMainScreen._Stat("Total balances", transfers ? UI.money(o.totalBalances) : "—",
                transfers ? "Across all client accounts" : lockedNote("transactions"), { lead: true, locked: !transfers }),
            clsMainScreen._Stat("Clients", clients ? String(o.clientsCount) : "—", clients ? "Registered accounts" : lockedNote("the client list"), { locked: !clients }),
            clsMainScreen._Stat("Transfers today", transfers ? String(o.transfersToday) : "—",
                transfers ? `${o.transfersTotal} in the full log` : lockedNote("transactions"), { locked: !transfers }),
            clsMainScreen._Stat("Sign-ins today", logins ? String(o.signInsToday) : "—",
                logins ? `${o.signInsTotal} in the register` : lockedNote("the login register"), { locked: !logins }));

        const panels = [];
        if (transfers) {
            const recent = o.recentTransfers;
            panels.push(UI.h("section", { class: "card card--flush" },
                UI.h("div", { style: "padding:20px 20px 12px" }, UI.h("h2", { class: "card__title" }, "Latest transfers")),
                UI.table({
                    rows: recent,
                    empty: UI.empty("No transfers yet", "Moves between accounts will show up here."),
                    columns: [
                        { label: "When", render: r => clsDate.DisplayDateTime(r.dateTime), cls: "hide-sm" },
                        { label: "From → to", render: r => `${r.from} → ${r.to}` },
                        { label: "Amount", align: "r", render: r => UI.money(r.amount) },
                    ],
                }),
                UI.h("div", { style: "padding:12px 20px 18px" }, UI.h("a", { href: "#/transactions/log" }, "Open the transfer log"))));
        }
        if (logins) {
            const recent = o.recentSignIns;
            panels.push(UI.h("section", { class: "card card--flush" },
                UI.h("div", { style: "padding:20px 20px 12px" }, UI.h("h2", { class: "card__title" }, "Latest sign-ins")),
                UI.table({
                    rows: recent,
                    empty: UI.empty("No sign-ins yet", ""),
                    columns: [
                        { label: "When", render: r => clsDate.DisplayDateTime(r.dateTime) },
                        { label: "User", render: r => r.userName, cls: "strong" },
                    ],
                }),
                UI.h("div", { style: "padding:12px 20px 18px" }, UI.h("a", { href: "#/login-register" }, "Open the login register"))));
        }

        const access = UI.h("section", { class: "card" },
            UI.h("h2", { class: "card__title" }, "Your access"),
            UI.h("p", { class: "card__sub" }, me.HasFullAccess() ? "You have full access to every screen." : "Highlighted items are the screens you can open. Ask an administrator if you need more."),
            UI.h("div", { class: "access-list" }, clsUser.PermissionList.map(p => {
                const on = me.CheckAccessPermission(p.bit);
                return UI.h("span", { class: "access-item", "data-on": String(on) }, UI.icon(on ? "check" : "lock"), p.label);
            })));

        return UI.h("div", null,
            clsScreen._Header(`${clsMainScreen._Greeting()}, ${me.GetFirstName() || me.GetUserName()}`, "Here is where the bank stands today."),
            stats,
            panels.length ? UI.h("div", { class: "grid-2", style: "margin-bottom:24px" }, panels) : null,
            access);
    }
}
