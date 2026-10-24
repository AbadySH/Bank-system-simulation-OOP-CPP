/* clsTransferScreen — move money between two accounts. Checked live, confirmed, logged, receipted. */
class clsTransferScreen extends clsScreen {
    static async Show(params) {
        const host = UI.h("div");

        const showForm = (fromAcc = "") => {
            let from = null, to = null;
            const amount = UI.field({ label: "Amount to transfer", name: "amount", money: true, placeholder: "0.00", inputmode: "decimal" });
            const preview = UI.h("div", { "aria-live": "polite" });

            const updatePreview = () => {
                UI.clear(preview);
                if (!from || !to) return;
                const r = clsScreen.ReadAmount(amount, { max: from.GetAccountBalance() });
                if (r.error) { if (/more than/.test(r.error) && amount.value().trim()) amount.error(r.error); return; }
                preview.appendChild(UI.h("div", { class: "preview" },
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, `${from.AccountNumber()} after`), UI.h("b", null, UI.money(from.GetAccountBalance() - r.value))),
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, `${to.AccountNumber()} after`), UI.h("b", null, UI.money(to.GetAccountBalance() + r.value)))));
            };

            const toPicker = clsScreen.Picker({
                label: "Account number to receive", hint: "", autofocus: false,
                exclude: Object.assign((c) => !!from && c.AccountNumber() === from.AccountNumber(), { message: "Choose a different account. You can’t transfer to the same account." }),
                onChange: c => { to = c; updatePreview(); },
            });
            const fromPicker = clsScreen.Picker({
                label: "Account number to send from", initial: fromAcc, hint: "",
                onChange: c => { from = c; toPicker.refresh(); updatePreview(); },
            });
            amount.input.addEventListener("input", () => { amount.clear(); updatePreview(); });

            const submit = clsScreen.OnSubmit(async () => {
                if (!from) { fromPicker.field.error("Choose the account to send from."); fromPicker.focus(); return; }
                if (!to) { toPicker.field.error("Choose the account to receive the money."); toPicker.focus(); return; }
                const r = clsScreen.ReadAmount(amount, { max: from.GetAccountBalance() });
                if (r.error) { amount.error(r.error); amount.input.focus(); return; }
                const ok = await UI.confirm({ title: "Confirm transfer", confirmLabel: `Transfer ${UI.money(r.value)}`,
                    text: `Send ${UI.money(r.value)} from ${from.FullName()} (${from.AccountNumber()}) to ${to.FullName()} (${to.AccountNumber()}).` });
                if (!ok) return;
                const receipt = await from.Transfer(r.value, to);
                UI.toast(`Transferred ${UI.money(r.value)} to ${to.AccountNumber()}`);
                showReceipt(receipt);
            }, () => ({ amount, from: fromPicker.field, to: toPicker.field }));

            UI.clear(host).appendChild(UI.h("form", { novalidate: true, onSubmit: submit },
                UI.h("div", { class: "stack" },
                    UI.h("div", { class: "flow" }, UI.card(UI.h("h2", { class: "card__title" }, "From"), fromPicker.el),
                        UI.h("div", { class: "flow__arrow" }, UI.icon("swap")),
                        UI.card(UI.h("h2", { class: "card__title" }, "To"), toPicker.el)),
                    UI.card(UI.h("div", { class: "stack", style: "max-width:420px" }, amount.el, preview,
                        UI.h("div", { class: "form__actions" }, UI.button("Transfer", { type: "submit", icon: "swap" })))))));
            (fromAcc ? toPicker.field.input : fromPicker.field.input).focus();
        };

        const showReceipt = (r) => {
            UI.clear(host).appendChild(UI.h("div", { class: "receipt-wrap" },
                UI.receipt({
                    kind: "Transfer", amount: UI.money(r.amount),
                    rows: [["Receipt no.", r.no], ["Date", r.dateTime],
                        ["From", `${r.from.name} (${r.from.account})`], ["To", `${r.to.name} (${r.to.account})`], ["Teller", r.teller]],
                    ruled: [[`${r.from.account} balance`, UI.money(r.from.newBalance)], [`${r.to.account} balance`, UI.money(r.to.newBalance)]],
                }),
                UI.receiptActions(UI.button("New transfer", { icon: "swap", onClick: () => showForm() }),
                    UI.button("View transfer log", { variant: "secondary", onClick: () => Router.go("transactions/log") }))));
        };

        showForm(params.get("acc") || "");
        return UI.h("div", null, clsScreen._Header("Transfer", "Move money from one account to another."), host);
    }
}
