/* clsFindUserScreen — look a user up and see their access. */
class clsFindUserScreen extends clsScreen {
    static Show() {
        const picker = clsScreen.Picker({ mode: "user", hint: "Type a user name, or pick one from the list." });
        return UI.h("div", null, clsScreen._Header("Find user", "Look up a user by user name."), UI.h("div", { style: "max-width:640px" }, UI.card(picker.el)));
    }
}
