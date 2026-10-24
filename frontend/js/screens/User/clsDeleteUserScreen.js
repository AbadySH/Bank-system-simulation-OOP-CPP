/* clsDeleteUserScreen — remove a user. You can't delete the account you're signed in with. */
class clsDeleteUserScreen extends clsScreen {
    static async Show(params) {
        const actionHost = UI.h("div");

        const showAction = (user) => {
            UI.clear(actionHost);
            if (!user) return;
            const del = async () => {
                const ok = await UI.confirm({ title: `Delete ${user.GetUserName()}?`, danger: true, confirmLabel: "Delete user",
                    text: `${user.FullName()} will no longer be able to sign in. This can’t be undone.` });
                if (!ok) return;
                const name = user.GetUserName();
                try { await user.Delete(); } catch (err) { clsScreen.ShowError(err); return; }
                UI.toast(`User ${name} deleted`);
                await picker.reset(); picker.focus();
            };
            actionHost.appendChild(UI.h("div", { class: "form__actions" }, UI.button("Delete user", { variant: "danger", icon: "trash", onClick: del }),
                UI.button("Cancel", { variant: "secondary", onClick: () => picker.reset() })));
        };

        const notSelf = Object.assign((u) => u.GetUserName().toLowerCase() === Global.CurrentUser.GetUserName().toLowerCase(), { message: "You can’t delete the account you’re signed in with." });
        const picker = clsScreen.Picker({ mode: "user", hint: "Type the user name to remove.", initial: params.get("user") || "", exclude: notSelf, onChange: showAction });
        return UI.h("div", null, clsScreen._Header("Delete user", "Remove a user so they can no longer sign in."),
            UI.card(picker.el, UI.h("div", { style: "margin-top:18px" }, actionHost)));
    }
}
