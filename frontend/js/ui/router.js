/* Router — hash based ("#/clients/update?acc=A101"), so the browser's Back button and bookmarks work
   and the app still runs when index.html is opened straight from disk. */
const Router = {
    routes: new Map(),

    register(def) { Router.routes.set(def.path, def); },

    parse() {
        const raw = location.hash.replace(/^#\/?/, "");
        const [path, query] = raw.split("?");
        return { path: path || "home", params: new URLSearchParams(query || "") };
    },

    go(path, params) {
        const q = params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : "";
        const target = `#/${path}${q}`;
        if (location.hash === target) App.Render();
        else location.hash = target;
    },

    render() { App.Render(); },
};
