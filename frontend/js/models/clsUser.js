/* clsUser — a system user, as the server describes it. Permissions are the same bit flags as the console
   version (1, 2, 4 … and -1 for everything); the server enforces them on every request, the browser only
   uses them to decide what to show. */
class clsUser extends clsPerson {
    static enPermissions = { eAll: -1, pListClients: 1, pAddNewClient: 2, pDeleteClient: 4, pUpdateClients: 8, pFindClient: 16,
        pTranactions: 32, pManageUsers: 64, pLogRegister: 128, pCurrency: 256 };
    static PermissionList = [];     // [{bit, label}] — filled from the server when you sign in

    static Empty() { return new clsUser(null); }
    GetUserName() { return this._d?.userName ?? ""; }
    GetPermissions() { return this._d?.permissions ?? 0; }
    HasFullAccess() { return !!this._d?.fullAccess; }
    DescribePermissions() { return this._d?.access ?? []; }
    CheckAccessPermission(Permission) {
        if (this.IsEmpty()) return false;
        return this.HasFullAccess() || (this.GetPermissions() & Permission) === Permission;
    }

    static async GetUsersList() { return (await Api.get("/api/users")).map(d => new clsUser(d)); }
    static async Find(UserName) {
        try { return new clsUser(await Api.get("/api/users/" + encodeURIComponent(UserName))); }
        catch (e) { if (e.status === 404) return clsUser.Empty(); throw e; }
    }
    static async IsUserExist(UserName) { return !(await clsUser.Find(UserName)).IsEmpty(); }

    static async Create(Fields) { return new clsUser(await Api.post("/api/users", Fields)); }
    async Update(Fields) { this._d = await Api.put("/api/users/" + encodeURIComponent(this.GetUserName()), Fields); }
    async Delete() { return Api.del("/api/users/" + encodeURIComponent(this.GetUserName())); }

    static async GetLoginRegisterList() { return Api.get("/api/login-register"); }
    static SetPermissionList(List) { clsUser.PermissionList = List; }
}
