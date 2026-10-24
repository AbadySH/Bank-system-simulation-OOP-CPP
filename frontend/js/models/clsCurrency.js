/* clsCurrency — one country's currency and its rate against the US dollar, as the server describes it. */
class clsCurrency {
    constructor(data = null) { this._d = data; }
    static Empty() { return new clsCurrency(null); }
    IsEmpty() { return !this._d; }
    Country() { return this._d?.country ?? ""; }
    CurrencyCode() { return this._d?.code ?? ""; }
    CurrencyName() { return this._d?.name ?? ""; }
    Rate() { return this._d?.rate ?? 0; }

    static async GetCurrenciesList() { return (await Api.get("/api/currencies")).map(d => new clsCurrency(d)); }

    /* One entry per currency code (several countries can share a code, e.g. the euro). */
    static async GetUniqueCurrencies() {
        const seen = new Set();
        return (await clsCurrency.GetCurrenciesList()).filter(c => !seen.has(c.CurrencyCode()) && seen.add(c.CurrencyCode()));
    }

    static async _Lookup(Query) {
        try { return new clsCurrency(await Api.get("/api/currencies/lookup?" + Query)); }
        catch (e) { if (e.status === 404) return clsCurrency.Empty(); throw e; }
    }
    static FindByCode(Code) { return clsCurrency._Lookup("code=" + encodeURIComponent(Code)); }
    static FindByCountry(Country) { return clsCurrency._Lookup("country=" + encodeURIComponent(Country)); }

    /* Returns how many countries' rows changed (all rows with this code are updated together). */
    async UpdateRate(NewRate) {
        const r = await Api.put("/api/currencies/" + encodeURIComponent(this.CurrencyCode()), { rate: NewRate });
        this._d = { ...this._d, rate: r.rate };
        return r.countriesUpdated;
    }

    static Convert(Amount, From, To) { return Api.post("/api/currencies/convert", { amount: Amount, from: From, to: To }); }
}
