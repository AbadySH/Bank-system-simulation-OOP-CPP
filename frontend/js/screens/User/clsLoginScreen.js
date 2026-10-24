/* clsLoginScreen — the gateway. Three wrong attempts lock the form (the console version closed the program). */
class clsLoginScreen {
    /* Banknote-style rosettes (hypotrochoids), drawn once as thin lines. */
    static _Rosette(cx, cy, R, r, d, scale, steps) {
        const turns = r / clsLoginScreen._Gcd(R, r), k = (R - r) / r, n = turns * steps;
        let path = "";
        for (let i = 0; i <= n; i++) {
            const t = (i / n) * Math.PI * 2 * turns;
            const x = cx + scale * ((R - r) * Math.cos(t) + d * Math.cos(k * t));
            const y = cy + scale * ((R - r) * Math.sin(t) - d * Math.sin(k * t));
            path += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
        }
        return path + "Z";
    }
    static _Gcd(a, b) { return b ? clsLoginScreen._Gcd(b, a % b) : a; }

    static _Art() {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "login__rosette");
        svg.setAttribute("viewBox", "0 0 1000 800");
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.setAttribute("aria-hidden", "true");
        const layers = [
            [640, 330, 60, 7, 30, 6.2, 300, "#e5c36b", .5, 1.0],
            [640, 330, 60, 11, 22, 5.2, 240, "#ffffff", .22, .8],
            [640, 330, 60, 13, 34, 4.4, 220, "#7fd0bf", .3, .8],
            [140, 700, 60, 7, 24, 3.4, 260, "#ffffff", .16, .8],
            [140, 700, 60, 9, 30, 2.6, 240, "#e5c36b", .3, .8],
        ];
        for (const [cx, cy, R, r, d, sc, st, color, op, w] of layers) {
            const p = document.createElementNS(NS, "path");
            p.setAttribute("d", clsLoginScreen._Rosette(cx, cy, R, r, d, sc, st));
            p.setAttribute("pathLength", "1");
            p.setAttribute("class", "draw");
            p.setAttribute("stroke", color);
            p.setAttribute("stroke-opacity", op);
            p.setAttribute("stroke-width", w);
            svg.appendChild(p);
        }
        return svg;
    }

    static Show(onSuccess) {
        const userF = UI.field({ label: "User name", name: "username", autocomplete: "username", autofocus: true });
        const passF = UI.field({ label: "Password", name: "password", type: "password", autocomplete: "current-password" });
        const note = UI.h("div", { "aria-live": "polite" });
        const submit = UI.button("Sign in", { type: "submit", icon: "lock" });
        let timer = null, lockedUntil = 0, busy = false;

        /* The server counts the failed attempts and decides when to lock; this only shows the countdown. */
        const setDisabled = (d) => { submit.disabled = d; userF.input.disabled = d; passF.input.disabled = d; };
        const renderLock = () => {
            const left = Math.ceil((lockedUntil - Date.now()) / 1000);
            UI.clear(note);
            if (left > 0) {
                setDisabled(true);
                note.appendChild(UI.h("div", { class: "lock-note", role: "alert" }, UI.icon("lock"),
                    UI.h("span", null, `Too many wrong attempts. Try again in ${left} second${left === 1 ? "" : "s"}.`)));
                timer = timer || setInterval(renderLock, 1000);
            } else {
                if (timer) { clearInterval(timer); timer = null; }
                if (!busy) setDisabled(false);
            }
        };

        const form = UI.h("form", { class: "form", novalidate: true, onSubmit: async (e) => {
            e.preventDefault();
            if (busy || lockedUntil > Date.now()) return;
            userF.clear(); passF.clear();
            const name = userF.value().trim(), pass = passF.value();
            if (!name) return userF.error("Enter your user name.");
            if (!pass) return passF.error("Enter your password.");
            busy = true; submit.disabled = true;
            try {
                const result = await Api.post("/api/auth/login", { userName: name, password: pass });
                onSuccess(result);
                return;
            } catch (err) {
                if (err.code === "locked") {
                    lockedUntil = Date.now() + (err.extra.retryAfter || 30) * 1000;
                    passF.setValue("");
                    busy = false; renderLock(); return;
                }
                if (err.code === "invalid_credentials") { passF.error(err.message); passF.input.select(); }
                else if (err.fields?.userName || err.fields?.password) { err.fields.userName && userF.error(err.fields.userName); err.fields.password && passF.error(err.fields.password); }
                else UI.clear(note).appendChild(UI.h("div", { class: "lock-note", role: "alert" }, UI.icon("alert"), UI.h("span", null, err.message)));
            }
            busy = false; submit.disabled = false;
        } }, userF.el, passF.el, note, UI.h("div", { class: "form__actions" }, submit));

        /* Sample accounts come from the server (it knows the sample Users.txt it shipped with). Hidden when the server turns them off. */
        const demo = UI.h("details", { class: "demo", hidden: true },
            UI.h("summary", null, "Try a demo account"),
            UI.h("div", { class: "demo__body" }));
        Api.get("/api/auth/demo-accounts").then(list => {
            const pick = [["User2", "Full access — can do everything"], ["User1", "Limited — manage users and view the login register"]]
                .map(([u, d]) => [list.find(x => x.userName === u), d]).filter(([x]) => x);
            if (!pick.length) return;
            const body = demo.querySelector(".demo__body");
            body.appendChild(UI.h("p", { class: "muted", style: "font-size:13.5px" }, "These come from the sample data. Pick one to fill the form."));
            pick.forEach(([x, d]) => body.appendChild(UI.h("div", { class: "demo__user" },
                UI.h("div", null, UI.h("b", null, x.userName), UI.h("small", null, d)),
                UI.button("Use", { variant: "secondary", size: "sm", onClick: () => { userF.setValue(x.userName); passF.setValue(x.password); passF.input.focus(); } }))));
            demo.hidden = false;
        }).catch(err => {
            UI.clear(note).appendChild(UI.h("div", { class: "lock-note", role: "alert" }, UI.icon("alert"), UI.h("span", null, err.message)));
        });

        const screen = UI.h("main", { class: "login" },
            UI.h("section", { class: "login__art" },
                clsLoginScreen._Art(),
                UI.h("div", { class: "login__copy" },
                    UI.h("h1", { class: "login__title" }, "Bank System Simulation"),
                    UI.h("p", { class: "login__lead" }, "A practice bank for learning object-oriented design. Nothing here is real money."),
                    UI.h("p", { class: "login__credit" }, "Created by: GitHub ",
                        UI.h("a", { href: "https://github.com/AbadySH", target: "_blank", rel: "noopener noreferrer" }, "@AbadySH")))),
            UI.h("section", { class: "login__panel" },
                UI.h("div", { class: "login__box" },
                    UI.h("h2", { class: "login__h" }, "Sign in"),
                    form, demo,
                    UI.h("p", { class: "login__notice" }, "Educational project. Don’t enter real banking details or reuse a real password."))));

        return screen;
    }
}
