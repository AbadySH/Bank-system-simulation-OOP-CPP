/* clsAddNewUserScreen — create a user and choose exactly which screens they may open. */
class clsAddNewUserScreen extends clsScreen {
    static Show() {
        const host = UI.h("div");

        const showForm = () => {
            const form = new clsUserForm({ mode: "add" });
            const save = clsScreen.OnSubmit(async () => {
                if (!form.validate()) return;
                const user = await clsUser.Create(form.payload());
                UI.toast(`User ${user.GetUserName()} added`);
                showDone(user);
            }, () => form.fieldMap());
            UI.clear(host).appendChild(UI.h("form", { novalidate: true, onSubmit: save },
                UI.card(UI.h("h2", { class: "card__title" }, "User details"), UI.h("p", { class: "card__sub" }, "All fields are required."),
                    form.el,
                    UI.h("div", { class: "form__actions", style: "margin-top:22px" },
                        UI.button("Save user", { type: "submit", icon: "check" }), UI.button("Cancel", { variant: "secondary", onClick: () => Router.go("users") })))));
            form.name.input.focus();
        };

        const showDone = (user) => UI.clear(host).appendChild(UI.card(
            UI.h("h2", { class: "card__title" }, "User added"), UI.h("p", { class: "card__sub" }, "They can sign in right away."),
            clsScreen.UserCard(user),
            UI.h("div", { class: "form__actions", style: "margin-top:20px" },
                UI.button("Add another user", { icon: "userplus", onClick: showForm }), UI.button("View users", { variant: "secondary", onClick: () => Router.go("users") }))));

        showForm();
        return UI.h("div", null, clsScreen._Header("Add user", "Create a new sign-in and set what it can do."), host);
    }
}
