/* clsLoginRegisterScreen — the audit trail of every successful sign-in. */
class clsLoginRegisterScreen extends clsScreen {
    static async Show() {
        const all = await clsUser.GetLoginRegisterList();      // newest first
        const list = UI.h("div");
        const count = UI.h("div", { class: "toolbar__count", "aria-live": "polite" });
        const names = [...new Set(all.map(r => r.userName))].sort((a, b) => a.localeCompare(b));
        const who = UI.field({ label: "User", name: "who", select: [{ value: "", label: "All users" }, ...names.map(n => ({ value: n, label: n }))] });

        const render = () => {
            const u = who.value();
            const rows = all.filter(r => !u || r.userName === u);
            count.textContent = u ? `${rows.length} of ${all.length} sign-ins` : `${all.length} sign-in${all.length === 1 ? "" : "s"}`;
            UI.clear(list).appendChild(UI.table({
                rows, scroll: true,
                empty: all.length ? UI.empty("No sign-ins for this user", "") : UI.empty("No sign-ins yet", "Each successful sign-in is recorded here."),
                columns: [
                    { label: "Date and time", render: r => clsDate.DisplayDateTime(r.dateTime), cls: "num" },
                    { label: "User", render: r => r.userName, cls: "strong" },
                    { label: "Access", render: r => r.fullAccess ? UI.badge("Full access", "brass") : UI.badge(`${r.accessCount} areas`) },
                ],
            }));
        };
        who.input.addEventListener("change", render);
        render();

        return UI.h("div", null, clsScreen._Header("Login register", "Every successful sign-in, newest first."),
            UI.h("section", { class: "card card--flush" }, UI.h("div", { class: "toolbar" }, who.el, count), list));
    }
}
