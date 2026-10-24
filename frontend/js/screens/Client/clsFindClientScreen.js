/* clsFindClientScreen — look a client up and see everything about them. */
class clsFindClientScreen extends clsScreen {
    static async Show(params) {
        const P = clsUser.enPermissions, can = (p) => Global.CurrentUser.CheckAccessPermission(p);
        const out = UI.h("div", { "aria-live": "polite" });

        const show = (c) => {
            UI.clear(out);
            if (!c) return;
            const acc = { acc: c.AccountNumber() };
            out.appendChild(UI.card(
                UI.h("h2", { class: "card__title" }, c.FullName()),
                UI.h("p", { class: "card__sub" }, `Account ${c.AccountNumber()}`),
                UI.dl([["Balance", UI.money(c.GetAccountBalance())], ["E-mail", c.GetEmail()], ["Phone", c.GetPhone()], ["PIN code", "••••"]]),
                UI.h("div", { class: "form__actions", style: "margin-top:20px" },
                    can(P.pTranactions) && UI.button("Deposit", { variant: "secondary", icon: "deposit", onClick: () => Router.go("transactions/deposit", acc) }),
                    can(P.pTranactions) && UI.button("Withdraw", { variant: "secondary", icon: "withdraw", onClick: () => Router.go("transactions/withdraw", acc) }),
                    can(P.pUpdateClients) && UI.button("Edit", { variant: "secondary", icon: "edit", onClick: () => Router.go("clients/update", acc) }))));
        };

        const picker = clsScreen.Picker({ hint: "Type an account number, or pick one from the list.", initial: params.get("acc") || "", onChange: show });
        /* The lookup already prints a summary card; the detail card below adds the full record, so hide the duplicate. */
        picker.el.querySelector(".picker > div[aria-live]").hidden = true;
        return UI.h("div", null, clsScreen._Header("Find client", "Look up a client by account number."), UI.h("div", { class: "stack" }, UI.card(picker.el), out));
    }
}
