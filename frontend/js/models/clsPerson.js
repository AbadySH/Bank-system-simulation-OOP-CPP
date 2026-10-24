/* clsPerson — what a client and a user have in common. In this edition the objects are views of what the
   C++ server sent: the server owns the rules and the record files, the browser only displays them. */
class clsPerson {
    constructor(data = null) { this._d = data; }
    IsEmpty() { return !this._d; }
    GetFirstName() { return this._d?.firstName ?? ""; }
    GetLastName() { return this._d?.lastName ?? ""; }
    FullName() { return this._d?.fullName ?? ""; }
    GetEmail() { return this._d?.email ?? ""; }
    GetPhone() { return this._d?.phone ?? ""; }
}
