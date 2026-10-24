/* App — starts the program: sign-in, then the shell (sidebar + top bar) around whichever screen the route names.
   This replaces main.cpp and the numbered main menu of the console version. */
const App = {
    root: null,
    shell: null,       // { app, nav, content, topbar parts }
    collapsed: {},

    _seq: 0,           // newest render; slower, older answers are dropped

    async Init() {
        App.root = document.getElementById("root");
        Api.onUnauthorized = () => { Global.SignOut(); App.shell = null; location.hash = ""; App.Render(); UI.toast("Your session ended. Sign in again.", "error"); };
        UI.clear(App.root).appendChild(UI.h("div", { class: "boot", role: "status" }, "Loading…"));
        await Global.RestoreSession();
        const P = clsUser.enPermissions;
        const r = (path, label, icon, group, perm, screen, extra = {}) => Router.register({ path, label, icon, group, perm, screen, nav: true, ...extra });
        r("home", "Overview", "home", null, null, clsMainScreen);

        r("clients", "Client list", "list", "Clients", P.pListClients, clsClientListScreen);
        r("clients/add", "Add client", "userplus", "Clients", P.pAddNewClient, clsAddNewClientScreen);
        r("clients/update", "Update client", "edit", "Clients", P.pUpdateClients, clsUpdateClientScreen);
        r("clients/delete", "Delete client", "trash", "Clients", P.pDeleteClient, clsDeleteClientScreen);
        r("clients/find", "Find client", "search", "Clients", P.pFindClient, clsFindClientScreen);

        r("transactions/deposit", "Deposit", "deposit", "Transactions", P.pTranactions, clsDepositScreen);
        r("transactions/withdraw", "Withdraw", "withdraw", "Transactions", P.pTranactions, clsWithdrawScreen);
        r("transactions/transfer", "Transfer", "swap", "Transactions", P.pTranactions, clsTransferScreen);
        r("transactions/balances", "Total balances", "sigma", "Transactions", P.pTranactions, clsTotalBalancesScreen);
        r("transactions/log", "Transfer log", "log", "Transactions", P.pTranactions, clsTransferLogScreen);

        r("currency", "Rates", "trend", "Currency exchange", P.pCurrency, clsCurrenciesListScreen);
        r("currency/find", "Find currency", "search", "Currency exchange", P.pCurrency, clsFindCurrencyScreen);
        r("currency/update", "Update rate", "edit", "Currency exchange", P.pCurrency, clsUpdateCurrencyRateScreen);
        r("currency/calculator", "Calculator", "calc", "Currency exchange", P.pCurrency, clscurrencyCalculatorScreen);

        r("users", "Users", "users", "Administration", P.pManageUsers, clsUsersListScreen);
        r("users/add", "Add user", "userplus", "Administration", P.pManageUsers, clsAddNewUserScreen, { nav: false, parent: "users" });
        r("users/update", "Update user", "edit", "Administration", P.pManageUsers, clsUpdateUserScreen, { nav: false, parent: "users" });
        r("users/delete", "Delete user", "trash", "Administration", P.pManageUsers, clsDeleteUserScreen, { nav: false, parent: "users" });
        r("users/find", "Find user", "search", "Administration", P.pManageUsers, clsFindUserScreen, { nav: false, parent: "users" });
        r("login-register", "Login register", "shield", "Administration", P.pLogRegister, clsLoginRegisterScreen);
        r("data", "Data files", "database", "Administration", "full", clsDataScreen);

        window.addEventListener("hashchange", App.Render);
        App.Render();
    },

    _Allowed(def) {
        if (!def.perm) return true;
        if (def.perm === "full") return Global.CurrentUser.HasFullAccess();
        return Global.CurrentUser.CheckAccessPermission(def.perm);
    },

    /* ---------- sign in / out ---------- */
    _ShowLogin() {
        App.shell = null;
        UI.clear(App.root).appendChild(clsLoginScreen.Show((result) => {
            Global.SignIn(result);
            location.hash = "#/home";
            App.Render();
        }));
        document.title = "Sign in · Bank System Simulation";
    },

    async SignOut() {
        try { await Api.post("/api/auth/logout"); } catch (e) { /* signing out locally is enough */ }
        Global.SignOut();
        location.hash = "";
        App.Render();
    },

    /* ---------- shell ---------- */
    _BuildShell() {
        const me = Global.CurrentUser;
        const full = me.HasFullAccess();
        const nav = UI.h("nav", { class: "nav", "aria-label": "Main" });
        const groups = [];
        for (const def of Router.routes.values()) {
            if (!def.nav || (def.perm === "full" && !full)) continue;
            let g = groups.find(x => x.name === def.group);
            if (!g) { g = { name: def.group, items: [] }; groups.push(g); }
            g.items.push(def);
        }
        for (const g of groups) {
            const list = UI.h("ul", { class: "nav__list" });
            for (const def of g.items) {
                const locked = !App._Allowed(def);
                const a = UI.h("a", { class: "nav__item", href: `#/${def.path}`, "data-path": def.path, "data-locked": String(locked) },
                    UI.icon(def.icon), UI.h("span", null, def.label), locked && UI.icon("lock", "nav__lock"));
                if (locked) a.setAttribute("title", "You don’t have access to this screen");
                list.appendChild(UI.h("li", null, a));
            }
            const group = UI.h("div", { class: "nav__group", "data-collapsed": String(!!App.collapsed[g.name]) });
            if (g.name) {
                const t = UI.h("button", { class: "nav__title", type: "button", "aria-expanded": String(!App.collapsed[g.name]) }, UI.h("span", null, g.name), UI.icon("chevron", "nav__chev"));
                t.addEventListener("click", () => {
                    App.collapsed[g.name] = !App.collapsed[g.name];
                    group.dataset.collapsed = String(!!App.collapsed[g.name]);
                    t.setAttribute("aria-expanded", String(!App.collapsed[g.name]));
                });
                group.appendChild(t);
            }
            group.appendChild(list);
            nav.appendChild(group);
        }

        const sidebar = UI.h("aside", { class: "sidebar", id: "sidebar" },
            UI.h("div", { class: "sidebar__brand" },
                UI.h("div", { class: "sidebar__mark" }, UI.icon("bank")),
                UI.h("div", null, UI.h("div", { class: "sidebar__name" }, "Bank Simulation"), UI.h("div", { class: "sidebar__tag" }, "Educational use only"))),
            nav,
            UI.h("div", { class: "sidebar__foot" }, "Records are kept by the bank server on this computer."));

        const content = UI.h("main", { class: "content", id: "content" });
        const app = UI.h("div", { class: "app", "data-nav-open": "false" });
        const toggle = (open) => app.dataset.navOpen = String(open);
        const menu = UI.h("button", { class: "btn btn--icon topbar__menu", type: "button", "aria-label": "Open menu", onClick: () => toggle(app.dataset.navOpen !== "true") }, UI.icon("menu"));
        const topbar = UI.h("header", { class: "topbar" },
            menu, UI.h("div", { class: "topbar__date" }, clsDate.FriendlyDate()), UI.h("div", { class: "topbar__spacer" }),
            UI.h("div", { class: "userchip" },
                UI.h("div", { class: "userchip__avatar", "aria-hidden": "true" }, UI.initials(me.FullName() || me.GetUserName())),
                UI.h("div", { class: "userchip__text" }, UI.h("div", { class: "userchip__name" }, me.FullName() || me.GetUserName()),
                    UI.h("div", { class: "userchip__role" }, `${me.GetUserName()} · ${full ? "Full access" : "Limited access"}`))),
            UI.button("Sign out", { variant: "secondary", size: "sm", icon: "logout", onClick: App.SignOut }));

        const scrim = UI.h("div", { class: "scrim", onClick: () => toggle(false) });
        nav.addEventListener("click", (e) => { if (e.target.closest("a")) toggle(false); });
        app.append(sidebar, scrim, UI.h("div", { class: "main" }, topbar, content));
        return { app, nav, content, toggle };
    },

    /* Rebuild the sidebar and user chip after your own access changed. */
    RefreshChrome() { App.shell = null; },

    _Denied(def) {
        return UI.h("div", { class: "card denied" },
            UI.h("div", { class: "denied__icon" }, UI.icon("lock")),
            UI.h("h1", { class: "page-head__title", tabindex: "-1", id: "page-title" }, "Access denied"),
            UI.h("p", { class: "muted", style: "margin:8px 0 20px" }, `Your account can’t open ${def.label.toLowerCase()}. Contact your administrator if you need it.`),
            UI.button("Back to overview", { icon: "home", onClick: () => Router.go("home") }));
    },

    _NotFound() {
        return UI.h("div", { class: "card denied" },
            UI.h("h1", { class: "page-head__title", tabindex: "-1", id: "page-title" }, "Page not found"),
            UI.h("p", { class: "muted", style: "margin:8px 0 20px" }, "That address doesn’t match any screen."),
            UI.button("Back to overview", { icon: "home", onClick: () => Router.go("home") }));
    },

    async Render() {
        const mine = ++App._seq;
        if (Global.CurrentUser.IsEmpty()) { App._ShowLogin(); return; }
        if (!App.shell) {
            App.shell = App._BuildShell();
            UI.clear(App.root).appendChild(App.shell.app);
        }
        const { path, params } = Router.parse();
        const def = Router.routes.get(path);
        const { content, nav } = App.shell;
        const active = def ? (def.parent || def.path) : "";
        nav.querySelectorAll(".nav__item").forEach(a => a.dataset.path === active ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));

        let view, title;
        if (!def) { view = App._NotFound(); title = "Not found"; }
        else if (!App._Allowed(def)) { view = App._Denied(def); title = "Access denied"; }
        else {
            title = def.label;
            /* Screens fetch their data from the server, so they are async. Show a loading note only if it takes a moment. */
            const slow = setTimeout(() => { if (mine === App._seq) UI.clear(content).appendChild(UI.h("div", { class: "loading", role: "status" }, "Loading…")); }, 250);
            try { view = await def.screen.Show(params); }
            catch (err) {
                if (err.code !== "unauthenticated") console.error(err);
                view = UI.card(UI.h("h1", { class: "page-head__title", tabindex: "-1", id: "page-title" }, err.status === 0 ? "Can’t reach the server" : "Something went wrong"),
                    UI.h("p", { class: "muted", style: "margin:8px 0 18px" }, err.message && err.status !== undefined ? err.message : "This screen failed to load. Try again."),
                    UI.button("Try again", { icon: "refresh", onClick: () => App.Render() }));
            }
            clearTimeout(slow);
        }
        if (mine !== App._seq) return;       // you moved on while this was loading
        UI.clear(content).appendChild(view);
        document.title = `${title} · Bank System Simulation`;
        window.scrollTo(0, 0);
        const auto = content.querySelector("[autofocus]");
        (auto || content.querySelector("#page-title"))?.focus({ preventScroll: true });
    },
};

document.addEventListener("DOMContentLoaded", App.Init);
