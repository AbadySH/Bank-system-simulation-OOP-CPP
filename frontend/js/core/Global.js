/* Global — the signed-in user for this session (same role as Global.h in the C++ project).
   The session itself is a token held by Api; this keeps the user object the screens read from. */
const Global = {
    CurrentUser: clsUser.Empty(),

    SignIn(Result) {
        Api.SetToken(Result.token);
        clsUser.SetPermissionList(Result.permissionList);
        Global.CurrentUser = new clsUser(Result.user);
    },

    SignOut() {
        Api.SetToken(null);
        Global.CurrentUser = clsUser.Empty();
    },

    /* Keep the user signed in across a page refresh within the same browser tab. */
    async RestoreSession() {
        if (!Api.Restore()) return false;
        try {
            const r = await Api.get("/api/auth/me");
            clsUser.SetPermissionList(r.permissionList);
            Global.CurrentUser = new clsUser(r.user);
            return true;
        } catch (e) { Api.SetToken(null); return false; }
    },

    /* Re-reads your own account (after your access was edited). */
    async Refresh() {
        const r = await Api.get("/api/auth/me");
        Global.CurrentUser = new clsUser(r.user);
    },
};
