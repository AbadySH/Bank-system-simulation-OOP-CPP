/* clsDate — date helpers. The record files keep the original "d/m/yyyy - h:m:s" format. */
class clsDate {
    static SystemDateTimeString(d = new Date()) {
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    }

    static DateToString(d = new Date()) {
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    }

    /* "18/6/2026 - 4:5:28" -> Date (invalid dates return null) */
    static ParseDateTime(Text) {
        const m = /^(\d+)\/(\d+)\/(\d+)\s*-\s*(\d+):(\d+):(\d+)$/.exec(String(Text).trim());
        if (!m) return null;
        const [, d, mo, y, h, mi, s] = m.map(Number);
        return new Date(y, mo - 1, d, h, mi, s);
    }

    /* Padded display form: 18/06/2026  04:05:28 */
    static DisplayDateTime(Text) {
        const dt = clsDate.ParseDateTime(Text);
        if (!dt) return String(Text);
        const p = (x) => String(x).padStart(2, "0");
        return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}  ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
    }

    static FriendlyDate(d = new Date()) {
        return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }

    static IsToday(Text) {
        const dt = clsDate.ParseDateTime(Text);
        const now = new Date();
        return !!dt && dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
    }
}
