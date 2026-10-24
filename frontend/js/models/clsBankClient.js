/* clsBankClient — a client account, as the server describes it. Every method that changes money or records
   goes to the server; the object then refreshes itself from the answer. */
class clsBankClient extends clsPerson {
    static Empty() { return new clsBankClient(null); }
    AccountNumber() { return this._d?.account ?? ""; }
    GetAccountBalance() { return this._d?.balance ?? 0; }

    static async GetClientsList() { return (await Api.get("/api/clients")).map(d => new clsBankClient(d)); }
    static async Suggestions() { return Api.get("/api/clients/suggest"); }

    /* Returns an empty client when the account doesn't exist. */
    static async Find(AccountNumber) {
        try { return new clsBankClient(await Api.get("/api/clients/" + encodeURIComponent(AccountNumber))); }
        catch (e) { if (e.status === 404) return clsBankClient.Empty(); throw e; }
    }
    static async IsClientExist(AccountNumber) { return !(await clsBankClient.Find(AccountNumber)).IsEmpty(); }

    static async Create(Fields) { return new clsBankClient(await Api.post("/api/clients", Fields)); }
    async Update(Fields) { this._d = await Api.put("/api/clients/" + encodeURIComponent(this.AccountNumber()), Fields); }
    async Delete() { return Api.del("/api/clients/" + encodeURIComponent(this.AccountNumber())); }

    /* Each returns the receipt the server issued and refreshes this object's balance. */
    async Deposit(Amount) {
        const r = await Api.post("/api/transactions/deposit", { account: this.AccountNumber(), amount: Amount });
        this._d = r.client; return r.receipt;
    }
    async Withdraw(Amount) {
        const r = await Api.post("/api/transactions/withdraw", { account: this.AccountNumber(), amount: Amount });
        this._d = r.client; return r.receipt;
    }
    async Transfer(Amount, Destination) {
        const r = await Api.post("/api/transactions/transfer", { from: this.AccountNumber(), to: Destination.AccountNumber(), amount: Amount });
        this._d = { ...this._d, balance: r.receipt.from.newBalance };
        Destination._d = { ...Destination._d, balance: r.receipt.to.newBalance };
        return r.receipt;
    }

    static async GetBalances() { return Api.get("/api/transactions/balances"); }
    static async GetTransferLog() { return Api.get("/api/transactions/transfers"); }
}
