#!/usr/bin/env python3
"""API tests. Start the server on a throwaway data folder first, then:
     python3 backend/tests/api_tests.py http://127.0.0.1:8181
Run against a fresh data folder (the tests create and delete their own records)."""
import json, sys, urllib.request, urllib.error

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8181").rstrip("/")
ok = bad = 0


def call(method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data is not None: req.add_header("Content-Type", "application/json")
    if token: req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return r.status, (txt if raw else (json.loads(txt) if txt else None))
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        return e.code, (json.loads(txt) if txt else None)


def check(name, cond, extra=""):
    global ok, bad
    if cond: ok += 1
    else: bad += 1; print("FAIL:", name, extra)


def login(u, p):
    s, b = call("POST", "/api/auth/login", {"userName": u, "password": p})
    return s, b


# ---- auth
s, b = login("User2", "3456"); check("login ok", s == 200 and b["token"], b)
T = b["token"]; check("login hides password", "password" not in json.dumps(b["user"]))
check("permissionList has 9", len(b["permissionList"]) == 9)
s, b = call("GET", "/api/auth/me", token=T); check("me", s == 200 and b["user"]["userName"] == "User2")
s, b = call("GET", "/api/clients"); check("no token 401", s == 401 and b["error"]["code"] == "unauthenticated")
s, b = call("GET", "/api/clients", token="bogus"); check("bad token 401", s == 401)
s, b = login("User2", ""); check("empty password 400", s == 400 and "password" in b["error"]["fields"])
s, b = login("Nobody", "x"); check("wrong login 401", s == 401 and b["error"]["attemptsLeft"] == 2, b)
s, b = login("Nobody", "x"); check("second fail", s == 401 and b["error"]["attemptsLeft"] == 1)
s, b = login("Nobody", "x"); check("third fail locks", s == 423 and b["error"]["retryAfter"] == 30, b)
s, b = login("Nobody", "x"); check("still locked", s == 423)
s, b = login("User2", "3456"); check("other user not locked", s == 200)

# ---- limited user (User1: manage users + login register)
s, b = login("User1", "3456"); T1 = b["token"]
s, b = call("GET", "/api/clients", token=T1); check("User1 cannot list clients", s == 403 and b["error"]["code"] == "forbidden")
s, b = call("POST", "/api/transactions/deposit", {"account": "A101", "amount": 5}, token=T1); check("User1 cannot deposit", s == 403)
s, b = call("GET", "/api/data/files", token=T1); check("User1 cannot see data", s == 403)
s, b = call("GET", "/api/users", token=T1); check("User1 can list users", s == 200 and len(b) >= 6)
s, b = call("GET", "/api/login-register", token=T1); check("User1 sees login register", s == 200 and len(b) > 0)
s, b = call("GET", "/api/overview", token=T1)
check("overview gated", s == 200 and b["totalBalances"] is None and b["signInsTotal"] is not None, b)

# ---- clients
s, b = call("GET", "/api/clients", token=T); check("list clients", s == 200 and len(b) >= 5)
check("no pin in list", "pin" not in json.dumps(b).lower())
acc0 = b[0]["account"]
s, c = call("GET", "/api/clients/" + acc0, token=T); check("get client", s == 200 and c["account"] == acc0)
s, b = call("GET", "/api/clients/ZZZ999", token=T); check("missing client 404", s == 404)
s, b = call("GET", "/api/clients/suggest", token=T); check("suggest", s == 200 and "name" in b[0])
new = {"account": "t-1", "pin": "1234", "firstName": "Test", "lastName": "Client", "email": "t@x.com", "phone": "+1 555 0100", "balance": 100}
s, b = call("POST", "/api/clients", new, token=T); check("create client", s == 201 and b["account"] == "T-1", b)
s, b = call("POST", "/api/clients", new, token=T); check("duplicate 409", s == 409 and "account" in b["error"]["fields"])
s, b = call("POST", "/api/clients", {**new, "account": "t-2", "email": "bad", "balance": -5, "pin": "1"}, token=T)
check("validation collects all", s == 400 and {"email", "balance", "pin"} <= set(b["error"]["fields"]), b)
s, b = call("PUT", "/api/clients/T-1", {"firstName": "Tess", "lastName": "Client", "email": "t@x.com", "phone": "+1 555 0100", "balance": 100}, token=T)
check("update keeps pin when omitted", s == 200 and b["firstName"] == "Tess", b)

# ---- transactions
s, b = call("POST", "/api/transactions/deposit", {"account": "T-1", "amount": 50.25}, token=T)
check("deposit", s == 200 and b["client"]["balance"] == 150.25 and b["receipt"]["type"] == "Deposit", b)
s, b = call("POST", "/api/transactions/deposit", {"account": "T-1", "amount": 0}, token=T); check("zero deposit rejected", s == 400)
s, b = call("POST", "/api/transactions/deposit", {"account": "T-1", "amount": 1.234}, token=T); check("3 decimals rejected", s == 400)
s, b = call("POST", "/api/transactions/withdraw", {"account": "T-1", "amount": 1000}, token=T)
check("overdraw 422", s == 422 and b["error"]["code"] == "insufficient_funds" and "amount" in b["error"]["fields"], b)
s, b = call("POST", "/api/transactions/withdraw", {"account": "T-1", "amount": 25}, token=T); check("withdraw", s == 200 and b["client"]["balance"] == 125.25)
call("POST", "/api/clients", {**new, "account": "T-2", "balance": 0}, token=T)
s, b = call("POST", "/api/transactions/transfer", {"from": "T-1", "to": "T-1", "amount": 5}, token=T); check("self transfer rejected", s == 400 and "to" in b["error"]["fields"])
s, b = call("POST", "/api/transactions/transfer", {"from": "T-1", "to": "T-2", "amount": 100}, token=T)
check("transfer", s == 200 and b["receipt"]["from"]["newBalance"] == 25.25 and b["receipt"]["to"]["newBalance"] == 100, b)
s, b = call("GET", "/api/transactions/transfers", token=T); check("transfer log newest first", s == 200 and b[0]["from"] == "T-1" and b[0]["by"] == "User2", b[:1])
s, b = call("GET", "/api/transactions/balances", token=T); check("balances", s == 200 and b["total"] > 0 and b["totalInWords"].endswith(("dollars", "cents")), b.get("totalInWords"))
s, b = call("GET", "/api/overview", token=T); check("overview full", b["totalBalances"] > 0 and len(b["recentTransfers"]) >= 1 and b["transfersToday"] >= 1)

# ---- delete
s, b = call("DELETE", "/api/clients/T-1", token=T); check("delete client", s == 200 and b["deleted"] == "T-1")
call("DELETE", "/api/clients/T-2", token=T)
s, b = call("GET", "/api/clients/T-1", token=T); check("deleted gone", s == 404)

# ---- currencies
s, b = call("GET", "/api/currencies", token=T); check("currencies", s == 200 and len(b) > 100)
s, b = call("GET", "/api/currencies/lookup?code=eur", token=T); check("lookup code", s == 200 and b["code"] == "EUR")
s, b = call("GET", "/api/currencies/lookup?code=XXX", token=T); check("lookup miss 404", s == 404)
s, b = call("GET", "/api/currencies/lookup?country=Egypt", token=T); check("lookup country", s == 200 and b["code"] == "EGP", b)
s, b = call("POST", "/api/currencies/convert", {"amount": 100, "from": "USD", "to": "EUR"}, token=T)
check("convert", s == 200 and abs(b["result"] - 100 * b["rateTo"] / b["rateFrom"]) < 1e-6, b)
s, b = call("PUT", "/api/currencies/EUR", {"rate": 0.5}, token=T); check("update rate", s == 200 and b["rate"] == 0.5 and b["countriesUpdated"] >= 1, b)
s, b = call("PUT", "/api/currencies/EUR", {"rate": 0}, token=T); check("rate zero rejected", s == 400)

# ---- users
nu = {"userName": "tester", "password": "abcd", "firstName": "T", "lastName": "U", "email": "t@u.com", "phone": "12345", "permissions": 3}
s, b = call("POST", "/api/users", nu, token=T); check("create user", s == 201 and b["access"] == ["View client list", "Add clients"], b)
s, b = call("POST", "/api/users", nu, token=T); check("dup user 409", s == 409)
s, b = call("POST", "/api/users", {**nu, "userName": "t2", "permissions": 0}, token=T); check("no permission rejected", s == 400 and "permissions" in b["error"]["fields"])
s, b = login("tester", "abcd"); TT = b["token"]
s, b = call("GET", "/api/clients", token=TT); check("new user can list", s == 200)
s, b = call("DELETE", "/api/clients/A101", token=TT); check("new user cannot delete", s == 403)
s, b = call("PUT", "/api/users/tester", {**nu, "password": "", "permissions": -1}, token=T); check("update user full access", s == 200 and b["fullAccess"], b)
s, b = login("tester", "abcd"); check("password kept when blank", s == 200)
s, b = call("DELETE", "/api/users/User2", token=T); check("cannot delete self", s == 409 and b["error"]["code"] == "cannot_delete_self")
s, b = call("DELETE", "/api/users/tester", token=T); check("delete user", s == 200)

# ---- data + logout
s, b = call("GET", "/api/data/files", token=T); check("data files", s == 200 and len(b) == 5)
s, b = call("GET", "/api/data/files/Users.txt", token=T, raw=True); check("download file", s == 200 and "#//#" in b)
check("passwords encrypted at rest", "#//#3456" not in b and "3456#//#" not in b)
s, b = call("GET", "/api/data/files/..%2Fsecret", token=T); check("path traversal blocked", s == 404)
s, b = call("POST", "/api/auth/logout", token=T1); check("logout", s == 204)
s, b = call("GET", "/api/users", token=T1); check("token dead after logout", s == 401)
s, b = call("POST", "/api/auth/login", None); check("empty body 400", s == 400)

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
