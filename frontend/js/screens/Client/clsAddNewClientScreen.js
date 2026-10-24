/* clsAddNewClientScreen — one form instead of a question-by-question prompt. */
class clsAddNewClientScreen extends clsScreen {
    static Show() {
        const host = UI.h("div");

        const showForm = () => {
            const form = new clsClientForm({ mode: "add" });
            const save = clsScreen.OnSubmit(async () => {
                if (!form.validate()) return;
                const client = await clsBankClient.Create(form.payload());
                UI.toast(`Client ${client.AccountNumber()} added`);
                showDone(client);
            }, () => form.fieldMap());
            UI.clear(host).appendChild(UI.h("form", { novalidate: true, onSubmit: save },
                UI.card(UI.h("h2", { class: "card__title" }, "Client details"), UI.h("p", { class: "card__sub" }, "All fields are required."),
                    form.el,
                    UI.h("div", { class: "form__actions", style: "margin-top:22px" },
                        UI.button("Save client", { type: "submit", icon: "check" }),
                        UI.button("Cancel", { variant: "secondary", onClick: () => Router.go("clients") })))));
            form.acc.input.focus();
        };

        const showDone = (client) => {
            const P = clsUser.enPermissions;
            UI.clear(host).appendChild(UI.card(
                UI.h("h2", { class: "card__title" }, "Client added"),
                UI.h("p", { class: "card__sub" }, "The account is ready to use."),
                clsScreen.ClientCard(client),
                UI.h("div", { class: "form__actions", style: "margin-top:20px" },
                    UI.button("Add another client", { icon: "userplus", onClick: showForm }),
                    clsScreen.CheckAccessRights(P.pTranactions) && UI.button("Make a deposit", { variant: "secondary", icon: "deposit", onClick: () => Router.go("transactions/deposit", { acc: client.AccountNumber() }) }),
                    clsScreen.CheckAccessRights(P.pListClients) && UI.button("View client list", { variant: "secondary", onClick: () => Router.go("clients") }))));
        };

        showForm();
        return UI.h("div", null, clsScreen._Header("Add client", "Open a new account for a client."), host);
    }
}
