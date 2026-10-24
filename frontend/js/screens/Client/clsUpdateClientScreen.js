/* clsUpdateClientScreen — find a client, edit the details, confirm, save. */
class clsUpdateClientScreen extends clsScreen {
    static async Show(params) {
        const formHost = UI.h("div");

        const showForm = (client) => {
            UI.clear(formHost);
            if (!client) return;
            const form = new clsClientForm({ client, mode: "update" });
            const save = clsScreen.OnSubmit(async () => {
                if (!form.validate()) return;
                const ok = await UI.confirm({ title: "Save changes?", text: `Update the details of ${client.AccountNumber()} (${client.FullName()}).`, confirmLabel: "Save changes" });
                if (!ok) return;
                await client.Update(form.payload());
                UI.toast(`Client ${client.AccountNumber()} updated`);
                picker.refresh();
            }, () => form.fieldMap());
            formHost.appendChild(UI.h("form", { novalidate: true, onSubmit: save },
                UI.card(UI.h("h2", { class: "card__title" }, "Edit details"), UI.h("p", { class: "card__sub" }, "Change what you need, then save."),
                    form.el,
                    UI.h("div", { class: "form__actions", style: "margin-top:22px" },
                        UI.button("Save changes", { type: "submit", icon: "check" }),
                        UI.button("Cancel", { variant: "secondary", onClick: () => picker.reset() })))));
        };

        const picker = clsScreen.Picker({ hint: "Type an account number, or pick one from the list.", initial: params.get("acc") || "", onChange: showForm });
        return UI.h("div", null,
            clsScreen._Header("Update client", "Find a client, then edit their details."),
            UI.h("div", { class: "stack" }, UI.card(picker.el), formHost));
    }
}
