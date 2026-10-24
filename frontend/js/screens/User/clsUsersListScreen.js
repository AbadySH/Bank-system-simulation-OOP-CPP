/* clsUsersListScreen — everyone who can sign in, with their level of access. */
class clsUsersListScreen extends clsScreen {
    static async Show() {
        const me = Global.CurrentUser;
        const all = await clsUser.GetUsersList();
        const list = UI.h("div");
        const count = UI.h("div", { class: "toolbar__count", "aria-live": "polite" });
        const search = UI.field({ label: "Search users", name: "q", type: "search", placeholder: "User name, name or e-mail" });

        const render = () => {
            const q = search.value().trim().toLowerCase();
            const rows = all.filter(u => !q || [u.GetUserName(), u.FullName(), u.GetEmail()].join(" ").toLowerCase().includes(q));
            count.textContent = q ? `${rows.length} of ${all.length} users` : `${all.length} user${all.length === 1 ? "" : "s"}`;
            UI.clear(list).appendChild(UI.table({
                rows,
                empty: UI.empty("No user matches your search", "Try a user name or part of a name."),
                columns: [
                    { label: "User name", cls: "strong", render: u => [u.GetUserName(), u.GetUserName().toLowerCase() === me.GetUserName().toLowerCase() && UI.h("span", { class: "muted", style: "font-weight:400" }, " (you)")] },
                    { label: "Name", render: u => u.FullName() },
                    { label: "E-mail", cls: "hide-sm", render: u => u.GetEmail() },
                    { label: "Access", render: u => {
                        const perms = u.DescribePermissions();
                        const b = u.HasFullAccess() ? UI.badge("Full access", "brass") : perms.length ? UI.badge(`${perms.length} of ${clsUser.PermissionList.length} areas`) : UI.badge("No access", "muted");
                        b.title = perms.join(", "); return b;
                    } },
                    { label: "Actions", cls: "actions", render: u => UI.h("div", { class: "row", style: "gap:0;justify-content:flex-end;flex-wrap:nowrap" },
                        UI.iconButton("edit", `Edit ${u.GetUserName()}`, () => Router.go("users/update", { user: u.GetUserName() })),
                        u.GetUserName().toLowerCase() !== me.GetUserName().toLowerCase() && UI.iconButton("trash", `Delete ${u.GetUserName()}`, () => Router.go("users/delete", { user: u.GetUserName() }), true)) },
                ],
            }));
        };
        search.input.addEventListener("input", UI.debounce(render, 120));
        render();

        return UI.h("div", null,
            clsScreen._Header("Users", "People who can sign in, and what each may open.",
                [UI.button("Find user", { variant: "secondary", icon: "search", onClick: () => Router.go("users/find") }), UI.button("Add user", { icon: "userplus", onClick: () => Router.go("users/add") })]),
            UI.h("section", { class: "card card--flush" }, UI.h("div", { class: "toolbar" }, search.el, count), list));
    }
}
