/* clsUpdateUserScreen — change a user's details, password or access. */
class clsUpdateUserScreen extends clsScreen {
    static async Show(params) {
        const formHost = UI.h("div");

        const showForm = (user) => {
            UI.clear(formHost);
            if (!user) return;
            const form = new clsUserForm({ user, mode: "update" });
            const save = clsScreen.OnSubmit(async () => {
                if (!form.validate()) return;
                const ok = await UI.confirm({ title: "Save changes?", text: `Update ${user.GetUserName()} (${user.FullName()}).`, confirmLabel: "Save changes" });
                if (!ok) return;
                await user.Update(form.payload());
                UI.toast(`User ${user.GetUserName()} updated`);
                if (user.GetUserName().toLowerCase() === Global.CurrentUser.GetUserName().toLowerCase()) {
                    await Global.Refresh();         // your own access may have changed
                    App.RefreshChrome();
                    Router.render();
                    return;
                }
                picker.refresh();
            }, () => form.fieldMap());
            formHost.appendChild(UI.h("form", { novalidate: true, onSubmit: save },
                UI.card(UI.h("h2", { class: "card__title" }, "Edit user"), UI.h("p", { class: "card__sub" }, "Change what you need, then save."),
                    form.el,
                    UI.h("div", { class: "form__actions", style: "margin-top:22px" },
                        UI.button("Save changes", { type: "submit", icon: "check" }), UI.button("Cancel", { variant: "secondary", onClick: () => picker.reset() })))));
        };

        const picker = clsScreen.Picker({ mode: "user", hint: "Type a user name, or pick one from the list.", initial: params.get("user") || "", onChange: showForm });
        return UI.h("div", null, clsScreen._Header("Update user", "Find a user, then edit their details or access."),
            UI.h("div", { class: "stack" }, UI.card(picker.el), formHost));
    }
}
