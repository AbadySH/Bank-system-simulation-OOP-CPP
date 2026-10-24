/* clsDataScreen — the record files behind the app (full-access users only).
   The C++ server keeps them as plain text files in its data folder, in the original "#//#" format.
   This page lists them, lets you download a copy, or restore the sample data. */
class clsDataScreen extends clsScreen {
    static async Show() {
        const rows = await Api.get("/api/data/files");

        const reset = clsScreen.OnSubmit(async () => {
            const ok = await UI.confirm({ title: "Restore the sample data?", danger: true, confirmLabel: "Restore sample data",
                text: "Every client, user, rate, sign-in and transfer you changed will be replaced by the original sample records. Everyone is signed out." });
            if (!ok) return;
            await Api.post("/api/data/reset");
            Global.SignOut();
            App.shell = null;
            location.hash = "";
            App.Render();
            UI.toast("Sample data restored");
        });

        const download = async (name) => {
            try { await Api.download("/api/data/files/" + encodeURIComponent(name), name); }
            catch (err) { UI.toast(err.message, "error"); }
        };

        return UI.h("div", null,
            clsScreen._Header("Data files", "The record files the bank server reads and writes.",
                UI.h("form", { onSubmit: reset }, UI.button("Restore sample data", { variant: "secondary", icon: "refresh", type: "submit" }))),
            UI.h("div", { class: "stack" },
                UI.h("section", { class: "card card--flush" }, UI.table({
                    rows,
                    columns: [
                        { label: "File", render: r => r.name, cls: "strong" },
                        { label: "What it holds", render: r => r.purpose, cls: "hide-sm" },
                        { label: "Records", align: "r", render: r => String(r.records) },
                        { label: "Download", cls: "actions", render: r => UI.iconButton("download", `Download ${r.name}`, () => download(r.name)) },
                    ],
                })),
                UI.h("p", { class: "muted", style: "font-size:14px;max-width:70ch" }, "These files live in the server’s data folder on this computer. Passwords and PINs are stored scrambled with the project’s educational cipher, which is not real security.")));
    }
}
