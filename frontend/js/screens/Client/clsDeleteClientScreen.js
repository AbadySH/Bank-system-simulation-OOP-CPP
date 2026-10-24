/* clsDeleteClientScreen — find, review, confirm. Deleting is permanent, so it always asks. */
class clsDeleteClientScreen extends clsScreen {
    static Show(params) {
        const actionHost = UI.h("div");

        const showAction = (client) => {
            UI.clear(actionHost);
            if (!client) return;
            const hasMoney = client.GetAccountBalance() > 0;
            const del = async () => {
                const ok = await UI.confirm({
                    title: `Delete ${client.AccountNumber()}?`, danger: true, confirmLabel: "Delete client",
                    text: "This removes the account for good. It can’t be undone.",
                    detail: hasMoney ? UI.h("p", { class: "field__msg field__msg--error" }, UI.icon("alert"), `${client.FullName()} still holds ${UI.money(client.GetAccountBalance())}. That balance will leave the bank’s total.`) : null,
                });
                if (!ok) return;
                const acc = client.AccountNumber();
                try { await client.Delete(); } catch (err) { clsScreen.ShowError(err); return; }
                UI.toast(`Client ${acc} deleted`);
                await picker.reset();
                picker.focus();
            };
            actionHost.appendChild(UI.h("div", { class: "form__actions" }, UI.button("Delete client", { variant: "danger", icon: "trash", onClick: del }),
                UI.button("Cancel", { variant: "secondary", onClick: () => picker.reset() })));
        };

        const picker = clsScreen.Picker({ hint: "Type the account number of the client to remove.", initial: params.get("acc") || "", onChange: showAction });
        return UI.h("div", null,
            clsScreen._Header("Delete client", "Remove a client account from the bank."),
            UI.card(picker.el, UI.h("div", { style: "margin-top:18px" }, actionHost)));
    }
}
