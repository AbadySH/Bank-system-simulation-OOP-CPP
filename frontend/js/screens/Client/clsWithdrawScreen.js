/* clsWithdrawScreen — take money out. Quick amounts for common withdrawals, or type any amount.
   A withdrawal can never take an account below zero. */
class clsWithdrawScreen extends clsScreen {
    static QUICK = [20, 50, 100, 200, 500, 1000];

    static async Show(params) {
        const host = UI.h("div");

        const showForm = (acc = "") => {
            let client = null;
            const amount = UI.field({ label: "Amount to withdraw", name: "amount", money: true, placeholder: "0.00", inputmode: "decimal" });
            const preview = UI.h("div", { "aria-live": "polite" });
            const chips = UI.h("div", { class: "chips", role: "group", "aria-label": "Quick withdraw amounts" });

            const renderChips = () => {
                UI.clear(chips);
                for (const q of clsWithdrawScreen.QUICK) {
                    const b = UI.h("button", { class: "chip", type: "button", disabled: !client || q > client.GetAccountBalance(), onClick: () => { amount.setValue(q.toFixed(2)); amount.clear(); updatePreview(); } }, UI.money(q, true).replace(".00", ""));
                    chips.appendChild(b);
                }
            };

            const updatePreview = () => {
                UI.clear(preview);
                if (!client) return;
                const r = clsScreen.ReadAmount(amount, { max: client.GetAccountBalance() });
                if (r.error) {
                    if (amount.value().trim() && /more than/.test(r.error)) amount.error(r.error);
                    return;
                }
                preview.appendChild(UI.h("div", { class: "preview" },
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Balance now"), UI.h("b", null, UI.money(client.GetAccountBalance()))),
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Withdrawal"), UI.h("b", { class: "neg" }, "− " + UI.money(r.value))),
                    UI.h("div", { class: "preview__row" }, UI.h("span", null, "Balance after"), UI.h("b", null, UI.money(client.GetAccountBalance() - r.value)))));
            };

            const picker = clsScreen.Picker({ initial: acc, hint: "Type an account number, or pick one from the list.", onChange: c => { client = c; renderChips(); updatePreview(); } });
            amount.input.addEventListener("input", () => { amount.clear(); updatePreview(); });
            renderChips();

            const submit = clsScreen.OnSubmit(async () => {
                if (!client) { picker.field.error("Choose the client to withdraw from."); picker.focus(); return; }
                const r = clsScreen.ReadAmount(amount, { max: client.GetAccountBalance() });
                if (r.error) { amount.error(r.error); amount.input.focus(); return; }
                const ok = await UI.confirm({ title: "Confirm withdrawal", confirmLabel: `Withdraw ${UI.money(r.value)}`,
                    text: `Take ${UI.money(r.value)} from ${client.FullName()} (${client.AccountNumber()}).` });
                if (!ok) return;
                const receipt = await client.Withdraw(r.value);
                UI.toast(`Withdrew ${UI.money(r.value)} from ${client.AccountNumber()}`);
                showReceipt(receipt);
            }, () => ({ amount, account: picker.field }));

            UI.clear(host).appendChild(UI.h("form", { novalidate: true, onSubmit: submit },
                UI.card(UI.h("div", { class: "stack" }, picker.el,
                    UI.h("div", { class: "stack", style: "gap:10px" }, UI.h("div", { class: "field__label" }, "Quick withdraw"), chips),
                    amount.el, preview,
                    UI.h("div", { class: "form__actions" }, UI.button("Withdraw", { type: "submit", icon: "withdraw" }))))));
            (acc ? amount.input : picker.field.input).focus();
        };

        const showReceipt = (r) => {
            UI.clear(host).appendChild(UI.h("div", { class: "receipt-wrap" },
                UI.receipt({
                    kind: "Withdrawal", amount: UI.money(r.amount),
                    rows: [["Receipt no.", r.no], ["Date", r.dateTime], ["Client", r.clientName], ["Account", r.account], ["Teller", r.teller]],
                    ruled: [["New balance", UI.money(r.newBalance)]],
                }),
                UI.receiptActions(UI.button("New withdrawal", { icon: "withdraw", onClick: () => showForm() }))));
        };

        showForm(params.get("acc") || "");
        return UI.h("div", null, clsScreen._Header("Withdraw", "Take money out of a client’s account."), UI.h("div", { style: "max-width:640px" }, host));
    }
}
