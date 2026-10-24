/* clsDepositScreen — add money to an account. The balance updates immediately and a receipt is issued. */
class clsDepositScreen extends clsScreen {
    static async Show(params) {
        const host = UI.h("div");

        const showForm = (acc = "") => {
            let client = null;
            const amount = UI.field({ label: "Amount to deposit", name: "amount", money: true, placeholder: "0.00", inputmode: "decimal" });
            const preview = UI.h("div", { "aria-live": "polite" });

            const updatePreview = () => {
                UI.clear(preview);
                const r = clsScreen.ReadAmount(amount);
                if (!client || r.error) return;
                preview.appendChild(UI.h("div", { class: "preview" },
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Balance now"), UI.h("b", null, UI.money(client.GetAccountBalance()))),
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Deposit"), UI.h("b", { class: "pos" }, "+ " + UI.money(r.value))),
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Balance after"), UI.h("b", null, UI.money(client.GetAccountBalance() + r.value)))));
            };

            const picker = clsScreen.Picker({ initial: acc, hint: "Type an account number, or pick one from the list.", onChange: c => { client = c; updatePreview(); } });
            amount.input.addEventListener("input", () => { amount.clear(); updatePreview(); });

            const submit = clsScreen.OnSubmit(async () => {
                if (!client) { picker.field.error("Choose the client to deposit to."); picker.focus(); return; }
                const r = clsScreen.ReadAmount(amount);
                if (r.error) { amount.error(r.error); amount.input.focus(); return; }
                const ok = await UI.confirm({ title: "Confirm deposit", confirmLabel: `Deposit ${UI.money(r.value)}`,
                    text: `Add ${UI.money(r.value)} to ${client.FullName()} (${client.AccountNumber()}).` });
                if (!ok) return;
                const receipt = await client.Deposit(r.value);
                UI.toast(`Deposited ${UI.money(r.value)} to ${client.AccountNumber()}`);
                showReceipt(receipt);
            }, () => ({ amount, account: picker.field }));

            UI.clear(host).appendChild(UI.h("form", { novalidate: true, onSubmit: submit },
                UI.card(UI.h("div", { class: "stack" }, picker.el, amount.el, preview,
                    UI.h("div", { class: "form__actions" }, UI.button("Deposit", { type: "submit", icon: "deposit" }))))));
            (acc ? amount.input : picker.field.input).focus();
        };

        const showReceipt = (r) => {
            UI.clear(host).appendChild(UI.h("div", { class: "receipt-wrap" },
                UI.receipt({
                    kind: "Deposit", amount: UI.money(r.amount),
                    rows: [["Receipt no.", r.no], ["Date", r.dateTime], ["Client", r.clientName], ["Account", r.account], ["Teller", r.teller]],
                    ruled: [["New balance", UI.money(r.newBalance)]],
                }),
                UI.receiptActions(UI.button("New deposit", { icon: "deposit", onClick: () => showForm() }))));
        };

        showForm(params.get("acc") || "");
        return UI.h("div", null, clsScreen._Header("Deposit", "Add money to a client’s account."), UI.h("div", { style: "max-width:640px" }, host));
    }
}
