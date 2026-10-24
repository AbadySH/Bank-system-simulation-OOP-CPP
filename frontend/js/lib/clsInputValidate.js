/* clsInputValidate — validation rules. Every check returns true/false (or a parsed value),
   so screens can show a clear message next to the field instead of re-prompting. */
class clsInputValidate {
    static IsNumberBetween(Number_, From, To) {
        return Number_ >= From && Number_ <= To;
    }

    static IsNonEmpty(Value) {
        return String(Value ?? "").trim().length > 0;
    }

    static IsValidEmail(Value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(Value).trim());
    }

    static IsValidPhone(Value) {
        const v = String(Value).trim();
        return /^[+\d][\d\s\-()]{4,18}$/.test(v);
    }

    /* 3-8 characters, no spaces. Digits are typical, but the sample data also holds older PINs. */
    static IsValidPin(Value) {
        return /^\S{3,8}$/.test(String(Value));
    }

    static IsValidAccountNumber(Value) {
        return /^[A-Za-z0-9-]{2,12}$/.test(String(Value).trim());
    }

    static IsValidUserName(Value) {
        return /^[A-Za-z0-9_.-]{3,20}$/.test(String(Value).trim());
    }

    static IsValidPassword(Value) {
        return String(Value).length >= 4 && String(Value).length <= 32;
    }

    /* "1,250.50" -> 1250.5. Returns NaN for anything that is not a money amount (max 2 decimals). */
    static ParseAmount(Text) {
        const t = String(Text ?? "").replace(/[,\s]/g, "");
        if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
        return Number(t);
    }

    /* Rates may carry more decimals than money. */
    static ParseRate(Text) {
        const t = String(Text ?? "").replace(/[,\s]/g, "");
        if (!/^\d+(\.\d{1,6})?$/.test(t)) return NaN;
        return Number(t);
    }
}
