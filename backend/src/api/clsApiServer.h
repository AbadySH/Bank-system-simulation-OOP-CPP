#pragma once
// clsApiServer — the HTTP face of the bank. Every route is registered with the access it needs,
// and that check happens here on the server, so hiding a button in the browser is never the only protection.
#include <filesystem>
#include <functional>
#include <iostream>
#include <mutex>
#include <set>
#include "../../third_party/httplib.h"
#include "clsApiCommon.h"
using namespace std;

class clsApiServer
{
public:
    struct Options
    {
        string Host = "127.0.0.1";
        int Port = 8080;
        string FrontendDir;          // empty = API only
        string CorsOrigin;           // empty = same-origin only
        bool DemoAccounts = true;    // lets the sign-in page offer the sample accounts
    };

private:
    // What a route needs before its handler runs.
    struct stAccess
    {
        enum enKind { Public, Auth, Perm, Any, Full } Kind = Auth;
        vector<int> Perms;
    };
    static stAccess Public() { return { stAccess::Public, {} }; }
    static stAccess Auth() { return { stAccess::Auth, {} }; }
    static stAccess Perm(clsUser::enPermissions P) { return { stAccess::Perm, { (int)P } }; }
    static stAccess Any(vector<int> Ps) { return { stAccess::Any, Ps }; }
    static stAccess Full() { return { stAccess::Full, {} }; }

    // Per-request state.
    struct Ctx
    {
        clsUser User;
        string Token;
        string Ip;
        int Status = 200;
        bool Raw = false;
        string RawBody, RawType, RawName;
    };
    using Handler = function<json(Ctx&, const httplib::Request&)>;

    Options _Opt;
    httplib::Server _Svr;
    mutex _Mutex;               // the record files are shared, so requests take turns
    clsSession _Sessions;

    // ------------------------------------------------------------ plumbing
    static string _Bearer(const httplib::Request& Req)
    {
        string h = Req.get_header_value("Authorization");
        const string p = "Bearer ";
        return (h.size() > p.size() && h.compare(0, p.size(), p) == 0) ? h.substr(p.size()) : "";
    }

    void _Authorize(const httplib::Request& Req, Ctx& C, const stAccess& A)
    {
        C.Ip = Req.remote_addr;
        if (A.Kind == stAccess::Public) return;
        C.Token = _Bearer(Req);
        string name = C.Token.empty() ? "" : _Sessions.Resolve(C.Token);
        C.User = name.empty() ? clsUser() : clsUser::Find(name);
        if (C.User.IsEmpty()) throw ApiError{ 401, "unauthenticated", "Sign in to continue." };

        const ApiError denied{ 403, "forbidden", "Your account doesn’t have access to this. Contact your administrator." };
        if (A.Kind == stAccess::Full && !C.User.HasFullAccess()) throw denied;
        if (A.Kind == stAccess::Perm && !C.User.CheckAccessPermission((clsUser::enPermissions)A.Perms[0])) throw denied;
        if (A.Kind == stAccess::Any)
        {
            bool ok = false;
            for (int p : A.Perms) ok = ok || C.User.CheckAccessPermission((clsUser::enPermissions)p);
            if (!ok) throw denied;
        }
    }

    static void _Fail(httplib::Response& Res, const ApiError& E)
    {
        json body = { {"error", { {"code", E.Code}, {"message", E.Message} } } };
        for (auto it = E.Extra.begin(); it != E.Extra.end(); ++it) body["error"][it.key()] = it.value();
        Res.status = E.Status;
        Res.set_content(Dump(body), "application/json; charset=utf-8");
    }

    void _Route(const string& Method, const string& Pattern, stAccess Access, Handler H)
    {
        auto fn = [this, Access, H](const httplib::Request& Req, httplib::Response& Res)
        {
            lock_guard<mutex> guard(_Mutex);
            try
            {
                Ctx c;
                _Authorize(Req, c, Access);
                json out = H(c, Req);
                if (c.Raw)
                {
                    Res.status = 200;
                    if (!c.RawName.empty()) Res.set_header("Content-Disposition", "attachment; filename=\"" + c.RawName + "\"");
                    Res.set_content(c.RawBody, c.RawType);
                }
                else if (out.is_null()) Res.status = 204;
                else { Res.status = c.Status; Res.set_content(Dump(out), "application/json; charset=utf-8"); }
            }
            catch (const ApiError& e) { _Fail(Res, e); }
            catch (const exception& e)
            {
                cerr << "[error] " << Req.method << " " << Req.path << ": " << e.what() << "\n";
                _Fail(Res, { 500, "server_error", "Something went wrong on the server. Try again." });
            }
        };
        if (Method == "GET") _Svr.Get(Pattern, fn);
        else if (Method == "POST") _Svr.Post(Pattern, fn);
        else if (Method == "PUT") _Svr.Put(Pattern, fn);
        else if (Method == "DELETE") _Svr.Delete(Pattern, fn);
    }

    static string _Param(const httplib::Request& Req, const char* Name)
    {
        auto it = Req.path_params.find(Name);
        return it == Req.path_params.end() ? "" : it->second;
    }

    static ApiError _NoClient(const string& Acc) { return ErrNotFound("No client has account number “" + Acc + "”. Check the number and try again."); }
    static ApiError _NoUser(const string& Name) { return ErrNotFound("No user is named “" + Name + "”."); }

    static clsBankClient _MustFindClient(const string& Acc)
    {
        clsBankClient c = clsBankClient::Find(Acc);
        if (c.IsEmpty()) throw _NoClient(Acc);
        return c;
    }

    static string _InWords(double Total)
    {
        long long dollars = (long long)floor(Total + 1e-9);
        int cents = (int)llround((Total - (double)dollars) * 100.0);
        string s = clsUtil::NumberToText(dollars) + (dollars == 1 ? " dollar" : " dollars");
        if (cents) s += " and " + clsUtil::NumberToText(cents) + (cents == 1 ? " cent" : " cents");
        return s;
    }

    // ------------------------------------------------------------ validation shared by create + update
    static void _CheckClientFields(clsForm& F, const clsBankClient* Existing)
    {
        auto changed = [&](const char* k, const string& orig) { return !Existing || F.Text(k) != orig; };
        if (changed("firstName", Existing ? Existing->GetFirstName() : "") && !clsInputValidate::IsNonEmpty(F.Text("firstName"))) F.Fail("firstName", "Enter a first name.");
        if (changed("lastName", Existing ? Existing->GetLastName() : "") && !clsInputValidate::IsNonEmpty(F.Text("lastName"))) F.Fail("lastName", "Enter a last name.");
        if (changed("email", Existing ? Existing->GetEmail() : "") && !clsInputValidate::IsValidEmail(F.Text("email"))) F.Fail("email", "Enter an e-mail address like name@example.com.");
        if (changed("phone", Existing ? Existing->GetPhone() : "") && !clsInputValidate::IsValidPhone(F.Text("phone"))) F.Fail("phone", "Enter a phone number with at least 5 digits.");
        if (!F.IsNumber("balance") || !clsInputValidate::IsMoney(F.Number("balance"), true))
            F.Fail("balance", "Use numbers only, with up to two decimals (for example 1500.00).");
        // A PIN is required for a new client. On update, leaving it out keeps the current one.
        string pin = F.Text("pin", false);
        if (!Existing || !pin.empty())
            if (!clsInputValidate::IsValidPin(pin)) F.Fail("pin", "The PIN must be 3 to 8 characters with no spaces.");
    }

    static void _CheckUserFields(clsForm& F, const clsUser* Existing)
    {
        auto changed = [&](const char* k, const string& orig) { return !Existing || F.Text(k) != orig; };
        if (changed("firstName", Existing ? Existing->GetFirstName() : "") && !clsInputValidate::IsNonEmpty(F.Text("firstName"))) F.Fail("firstName", "Enter a first name.");
        if (changed("lastName", Existing ? Existing->GetLastName() : "") && !clsInputValidate::IsNonEmpty(F.Text("lastName"))) F.Fail("lastName", "Enter a last name.");
        if (changed("email", Existing ? Existing->GetEmail() : "") && !clsInputValidate::IsValidEmail(F.Text("email"))) F.Fail("email", "Enter an e-mail address like name@example.com.");
        if (changed("phone", Existing ? Existing->GetPhone() : "") && !clsInputValidate::IsValidPhone(F.Text("phone"))) F.Fail("phone", "Enter a phone number with at least 5 digits.");
        string pw = F.Text("password", false);
        if (!Existing || !pw.empty())
            if (!clsInputValidate::IsValidPassword(pw)) F.Fail("password", "The password must be 4 to 32 characters.");
        long long perms = F.IsInteger("permissions") ? F.Integer("permissions") : 0;
        if (!(perms == clsUser::eAll || (perms >= 1 && perms <= clsUser::AllPermissionBits)))
            F.Fail("permissions", "Choose at least one screen, or give full access.");
    }

    // ------------------------------------------------------------ route groups
    void _RegisterAuth()
    {
        _Route("GET", "/api/health", Public(), [](Ctx&, const httplib::Request&) { return json{ {"status", "ok"} }; });

        // Sample accounts for the sign-in page (only while their password is still the sample one).
        _Route("GET", "/api/auth/demo-accounts", Public(), [this](Ctx&, const httplib::Request&) {
            json list = json::array();
            if (!_Opt.DemoAccounts) return list;
            for (const string& line : SeedData::UsersFile)
            {
                vector<string> f = clsString::vSplitString(line, "#//#");
                if (f.size() < 7) continue;
                clsUser u = clsUser::Find(f[4], f[5]);
                if (!u.IsEmpty()) list.push_back({ {"userName", u.GetUserName()}, {"password", f[5]}, {"fullAccess", u.HasFullAccess()}, {"access", clsUser::DescribePermissions(u.GetPermissions())} });
            }
            return list;
        });

        _Route("POST", "/api/auth/login", Public(), [this](Ctx& c, const httplib::Request& req) {
            json body = ParseBody(req.body);
            clsForm f(body);
            string name = f.Text("userName"), pass = f.Text("password", false);
            if (name.empty()) f.Fail("userName", "Enter your user name.");
            if (pass.empty()) f.Fail("password", "Enter your password.");
            f.Done();

            int wait = _Sessions.LockedFor(name, c.Ip);
            if (wait > 0) throw ApiError{ 423, "locked", "Too many wrong attempts. Try again in " + to_string(wait) + " second" + (wait == 1 ? "" : "s") + ".", json{ {"retryAfter", wait} } };

            clsUser user = clsUser::Find(name, pass);
            if (user.IsEmpty())
            {
                int left = _Sessions.RegisterFailure(name, c.Ip);
                if (left == 0)
                    throw ApiError{ 423, "locked", "Locked after " + to_string(clsSession::MaxTrials) + " failed attempts. Try again in " + to_string(clsSession::LockSeconds) + " seconds.",
                                    json{ {"retryAfter", clsSession::LockSeconds} } };
                throw ApiError{ 401, "invalid_credentials", "Invalid user name or password. You have " + to_string(left) + " attempt" + (left == 1 ? "" : "s") + " left.",
                                json{ {"attemptsLeft", left} } };
            }
            _Sessions.ClearFailures(name, c.Ip);
            user.RegisterLogin();
            return json{ {"token", _Sessions.Open(user.GetUserName())}, {"expiresInSeconds", clsSession::IdleSeconds},
                         {"user", ToJson(user)}, {"permissionList", PermissionListJson()} };
        });

        _Route("GET", "/api/auth/me", Auth(), [](Ctx& c, const httplib::Request&) {
            return json{ {"user", ToJson(c.User)}, {"permissionList", PermissionListJson()} };
        });

        _Route("POST", "/api/auth/logout", Auth(), [this](Ctx& c, const httplib::Request&) { _Sessions.Close(c.Token); return json(nullptr); });
    }

    void _RegisterOverview()
    {
        _Route("GET", "/api/overview", Auth(), [](Ctx& c, const httplib::Request&) {
            using P = clsUser;
            json out = { {"user", ToJson(c.User)}, {"totalBalances", nullptr}, {"clientsCount", nullptr}, {"transfersToday", nullptr},
                         {"transfersTotal", nullptr}, {"signInsToday", nullptr}, {"signInsTotal", nullptr}, {"recentTransfers", nullptr}, {"recentSignIns", nullptr} };
            if (c.User.CheckAccessPermission(P::pListClients)) out["clientsCount"] = clsBankClient::GetClientsList().size();
            if (c.User.CheckAccessPermission(P::pTranactions))
            {
                auto log = clsBankClient::GetTransferLog();
                int today = 0; for (auto& t : log) today += clsDate::IsToday(t.DateTime) ? 1 : 0;
                json recent = json::array();
                for (int i = (int)log.size() - 1; i >= 0 && recent.size() < 5; i--) recent.push_back(ToJson(log[i]));
                out["totalBalances"] = clsBankClient::GetTotalBalances();
                out["transfersToday"] = today; out["transfersTotal"] = log.size(); out["recentTransfers"] = recent;
            }
            if (c.User.CheckAccessPermission(P::pLogRegister))
            {
                auto log = clsUser::GetLoginRegisterList();
                int today = 0; for (auto& r : log) today += clsDate::IsToday(r.DateTime) ? 1 : 0;
                json recent = json::array();
                for (int i = (int)log.size() - 1; i >= 0 && recent.size() < 5; i--) recent.push_back(ToJson(log[i]));
                out["signInsToday"] = today; out["signInsTotal"] = log.size(); out["recentSignIns"] = recent;
            }
            return out;
        });
    }

    void _RegisterClients()
    {
        using P = clsUser;
        const stAccess anyClientAccess = Any({ P::pListClients, P::pFindClient, P::pUpdateClients, P::pDeleteClient, P::pTranactions });

        _Route("GET", "/api/clients", Perm(P::pListClients), [](Ctx&, const httplib::Request&) {
            json a = json::array();
            for (auto& c : clsBankClient::GetClientsList()) a.push_back(ToJson(c));
            return a;
        });

        // Account number + name only: powers the type-ahead on every screen that picks a client.
        _Route("GET", "/api/clients/suggest", anyClientAccess, [](Ctx&, const httplib::Request&) {
            json a = json::array();
            for (auto& c : clsBankClient::GetClientsList()) a.push_back({ {"account", c.AccountNumber()}, {"name", c.FullName()} });
            return a;
        });

        _Route("GET", "/api/clients/:acc", anyClientAccess, [](Ctx&, const httplib::Request& req) {
            return ToJson(_MustFindClient(_Param(req, "acc")));
        });

        _Route("POST", "/api/clients", Perm(P::pAddNewClient), [](Ctx& c, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            string acc = clsString::UpperAllLatterOfTheString(f.Text("account"));
            if (!clsInputValidate::IsValidAccountNumber(acc)) f.Fail("account", "Use 2 to 12 letters, numbers or dashes.");
            _CheckClientFields(f, nullptr);
            f.Done();
            clsBankClient client = clsBankClient::GetAddNewClientObject(acc);
            client.SetPinCode(f.Text("pin", false)); client.SetFirstName(f.Text("firstName")); client.SetLastName(f.Text("lastName"));
            client.SetEmail(f.Text("email")); client.SetPhone(f.Text("phone")); client.SetAccountBalance(f.Number("balance"));
            if (client.Save() == clsBankClient::svFaildAccountNumberExists)
                throw ErrConflict("account_exists", "Account number " + acc + " is already used. Choose another.", json{ {"account", "Account number " + acc + " is already used. Choose another."} });
            c.Status = 201;
            return ToJson(client);
        });

        _Route("PUT", "/api/clients/:acc", Perm(P::pUpdateClients), [](Ctx&, const httplib::Request& req) {
            clsBankClient client = _MustFindClient(_Param(req, "acc"));
            clsForm f(ParseBody(req.body));
            _CheckClientFields(f, &client);
            f.Done();
            if (!f.Text("pin", false).empty()) client.SetPinCode(f.Text("pin", false));
            client.SetFirstName(f.Text("firstName")); client.SetLastName(f.Text("lastName"));
            client.SetEmail(f.Text("email")); client.SetPhone(f.Text("phone")); client.SetAccountBalance(f.Number("balance"));
            client.Save();
            return ToJson(client);
        });

        _Route("DELETE", "/api/clients/:acc", Perm(P::pDeleteClient), [](Ctx&, const httplib::Request& req) {
            clsBankClient client = _MustFindClient(_Param(req, "acc"));
            json out = { {"deleted", client.AccountNumber()}, {"fullName", client.FullName()}, {"balance", client.GetAccountBalance()} };
            client.Delete();
            return out;
        });
    }

    static json _Receipt(const Ctx& C, const string& Type, double Amount)
    {
        return { {"no", clsUtil::GenerateKey()}, {"type", Type}, {"dateTime", clsDate::GetSystemDateTimeDisplay()},
                 {"teller", C.User.GetUserName()}, {"amount", Amount} };
    }

    void _RegisterTransactions()
    {
        using P = clsUser;
        const stAccess tx = Perm(P::pTranactions);

        _Route("POST", "/api/transactions/deposit", tx, [](Ctx& c, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            string acc = f.Text("account");
            if (acc.empty()) f.Fail("account", "Choose the client to deposit to.");
            double amount = f.PositiveAmount("amount");
            f.Done();
            clsBankClient client = _MustFindClient(acc);
            client.Deposit(amount);
            json r = _Receipt(c, "Deposit", amount);
            r["account"] = client.AccountNumber(); r["clientName"] = client.FullName(); r["newBalance"] = client.GetAccountBalance();
            return json{ {"receipt", r}, {"client", ToJson(client)} };
        });

        _Route("POST", "/api/transactions/withdraw", tx, [](Ctx& c, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            string acc = f.Text("account");
            if (acc.empty()) f.Fail("account", "Choose the client to withdraw from.");
            double amount = f.PositiveAmount("amount");
            f.Done();
            clsBankClient client = _MustFindClient(acc);
            if (!client.Withdraw(amount))
                throw ApiError{ 422, "insufficient_funds", "That is more than the available balance of " + Money(client.GetAccountBalance()) + ".",
                                json{ {"fields", { {"amount", "That is more than the available balance of " + Money(client.GetAccountBalance()) + "."} } }, {"balance", client.GetAccountBalance()} } };
            json r = _Receipt(c, "Withdrawal", amount);
            r["account"] = client.AccountNumber(); r["clientName"] = client.FullName(); r["newBalance"] = client.GetAccountBalance();
            return json{ {"receipt", r}, {"client", ToJson(client)} };
        });

        _Route("POST", "/api/transactions/transfer", tx, [](Ctx& c, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            string from = f.Text("from"), to = f.Text("to");
            if (from.empty()) f.Fail("from", "Choose the account to send from.");
            if (to.empty()) f.Fail("to", "Choose the account to receive the money.");
            if (!from.empty() && clsString::EqualsIgnoreCase(from, to)) f.Fail("to", "Choose a different account. You can’t transfer to the same account.");
            double amount = f.PositiveAmount("amount");
            f.Done();
            clsBankClient src = _MustFindClient(from), dst = _MustFindClient(to);
            if (amount > src.GetAccountBalance())
                throw ApiError{ 422, "insufficient_funds", "That is more than the available balance of " + Money(src.GetAccountBalance()) + ".",
                                json{ {"fields", { {"amount", "That is more than the available balance of " + Money(src.GetAccountBalance()) + "."} } }, {"balance", src.GetAccountBalance()} } };
            if (!src.Transfer(amount, dst, c.User.GetUserName())) throw ApiError{ 500, "server_error", "The transfer failed. Check the balance and try again." };
            json r = _Receipt(c, "Transfer", amount);
            r["from"] = { {"account", src.AccountNumber()}, {"name", src.FullName()}, {"newBalance", src.GetAccountBalance()} };
            r["to"] = { {"account", dst.AccountNumber()}, {"name", dst.FullName()}, {"newBalance", dst.GetAccountBalance()} };
            return json{ {"receipt", r} };
        });

        _Route("GET", "/api/transactions/balances", tx, [](Ctx&, const httplib::Request&) {
            auto clients = clsBankClient::GetClientsList();
            double total = clsBankClient::GetTotalBalances();
            json rows = json::array();
            for (auto& c : clients)
                rows.push_back({ {"account", c.AccountNumber()}, {"fullName", c.FullName()}, {"balance", c.GetAccountBalance()},
                                 {"share", total > 0 ? c.GetAccountBalance() / total * 100.0 : 0.0} });
            return json{ {"total", total}, {"totalInWords", _InWords(total)}, {"clients", rows} };
        });

        _Route("GET", "/api/transactions/transfers", tx, [](Ctx&, const httplib::Request&) {
            auto log = clsBankClient::GetTransferLog();
            json a = json::array();
            for (int i = (int)log.size() - 1; i >= 0; i--) a.push_back(ToJson(log[i]));
            return a;
        });
    }

    void _RegisterCurrencies()
    {
        const stAccess cur = Perm(clsUser::pCurrency);

        _Route("GET", "/api/currencies", cur, [](Ctx&, const httplib::Request&) {
            json a = json::array();
            for (auto& c : clsCurrency::GetCurrenciesList()) a.push_back(ToJson(c));
            return a;
        });

        // /api/currencies/lookup?code=EUR  or  ?country=Egypt
        _Route("GET", "/api/currencies/lookup", cur, [](Ctx&, const httplib::Request& req) {
            clsCurrency c = req.has_param("code") ? clsCurrency::FindByCode(req.get_param_value("code"))
                                                  : clsCurrency::FindByCountry(req.get_param_value("country"));
            if (c.IsEmpty())
                throw ErrNotFound(req.has_param("code") ? "No currency has the code “" + clsString::UpperAllLatterOfTheString(req.get_param_value("code")) + "”. Codes have three letters, like USD."
                                                        : "No country is named “" + req.get_param_value("country") + "”. Pick one from the suggestions.");
            return ToJson(c);
        });

        _Route("POST", "/api/currencies/convert", cur, [](Ctx&, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            double amount = f.Number("amount");
            if (!f.IsNumber("amount") || amount < 0 || !isfinite(amount) || amount > 1e15) f.Fail("amount", "Enter a number, like 250 or 99.50.");
            f.Done();
            clsCurrency a = clsCurrency::FindByCode(f.Text("from")), b = clsCurrency::FindByCode(f.Text("to"));
            if (a.IsEmpty()) throw ErrNotFound("No currency has the code “" + f.Text("from") + "”.");
            if (b.IsEmpty()) throw ErrNotFound("No currency has the code “" + f.Text("to") + "”.");
            return json{ {"amount", amount}, {"from", a.CurrencyCode()}, {"to", b.CurrencyCode()}, {"usdAmount", a.ConvertToUSD(amount)},
                         {"result", a.ConvertToOtherCurrency(amount, b)}, {"rateFrom", a.Rate()}, {"rateTo", b.Rate()} };
        });

        _Route("PUT", "/api/currencies/:code", cur, [](Ctx&, const httplib::Request& req) {
            clsCurrency c = clsCurrency::FindByCode(_Param(req, "code"));
            if (c.IsEmpty()) throw ErrNotFound("No currency has the code “" + clsString::UpperAllLatterOfTheString(_Param(req, "code")) + "”. Codes have three letters, like USD.");
            clsForm f(ParseBody(req.body));
            if (!f.IsNumber("rate") || !clsInputValidate::IsRate(f.Number("rate"))) f.Fail("rate", "Enter a rate above zero, using numbers only (for example 0.92).");
            f.Done();
            double old = c.Rate();
            int rows = c.UpdateRate(f.Number("rate"));
            return json{ {"code", c.CurrencyCode()}, {"name", c.CurrencyName()}, {"oldRate", old}, {"rate", c.Rate()}, {"countriesUpdated", rows} };
        });
    }

    void _RegisterUsers()
    {
        const stAccess mu = Perm(clsUser::pManageUsers);

        _Route("GET", "/api/users", mu, [](Ctx&, const httplib::Request&) {
            json a = json::array();
            for (auto& u : clsUser::GetUsersList()) a.push_back(ToJson(u));
            return a;
        });

        _Route("GET", "/api/users/:name", mu, [](Ctx&, const httplib::Request& req) {
            clsUser u = clsUser::Find(_Param(req, "name"));
            if (u.IsEmpty()) throw _NoUser(_Param(req, "name"));
            return ToJson(u);
        });

        _Route("POST", "/api/users", mu, [](Ctx& c, const httplib::Request& req) {
            clsForm f(ParseBody(req.body));
            string name = f.Text("userName");
            if (!clsInputValidate::IsValidUserName(name)) f.Fail("userName", "Use 3 to 20 letters, numbers, dots, dashes or underscores.");
            _CheckUserFields(f, nullptr);
            f.Done();
            clsUser u = clsUser::GetAddNewUserObject(name);
            u.SetPassword(f.Text("password", false)); u.SetFirstName(f.Text("firstName")); u.SetLastName(f.Text("lastName"));
            u.SetEmail(f.Text("email")); u.SetPhone(f.Text("phone")); u.SetPermissions((int)f.Integer("permissions"));
            if (u.Save() == clsUser::svFaildUserExists)
                throw ErrConflict("user_exists", "The user name “" + name + "” is already used. Choose another.", json{ {"userName", "The user name “" + name + "” is already used. Choose another."} });
            c.Status = 201;
            return ToJson(u);
        });

        _Route("PUT", "/api/users/:name", mu, [](Ctx&, const httplib::Request& req) {
            clsUser u = clsUser::Find(_Param(req, "name"));
            if (u.IsEmpty()) throw _NoUser(_Param(req, "name"));
            clsForm f(ParseBody(req.body));
            _CheckUserFields(f, &u);
            f.Done();
            if (!f.Text("password", false).empty()) u.SetPassword(f.Text("password", false));
            u.SetFirstName(f.Text("firstName")); u.SetLastName(f.Text("lastName"));
            u.SetEmail(f.Text("email")); u.SetPhone(f.Text("phone")); u.SetPermissions((int)f.Integer("permissions"));
            u.Save();
            return ToJson(u);
        });

        _Route("DELETE", "/api/users/:name", mu, [](Ctx& c, const httplib::Request& req) {
            clsUser u = clsUser::Find(_Param(req, "name"));
            if (u.IsEmpty()) throw _NoUser(_Param(req, "name"));
            if (clsString::EqualsIgnoreCase(u.GetUserName(), c.User.GetUserName()))
                throw ApiError{ 409, "cannot_delete_self", "You can’t delete the account you’re signed in with." };
            json out = { {"deleted", u.GetUserName()}, {"fullName", u.FullName()} };
            u.Delete();
            return out;
        });

        _Route("GET", "/api/login-register", Perm(clsUser::pLogRegister), [](Ctx&, const httplib::Request&) {
            auto log = clsUser::GetLoginRegisterList();
            json a = json::array();
            for (int i = (int)log.size() - 1; i >= 0; i--) a.push_back(ToJson(log[i]));
            return a;
        });
    }

    void _RegisterData()
    {
        static const map<string, string> purpose = {
            { clsStorage::Clients(), "Client accounts (PINs stored encrypted)" },
            { clsStorage::Users(), "System users and permissions (passwords stored encrypted)" },
            { clsStorage::Currencies(), "Exchange rates against the US dollar" },
            { clsStorage::Login(), "Sign-in history (audit trail)" },
            { clsStorage::Transfers(), "Every transfer between accounts" } };

        _Route("GET", "/api/data/files", Full(), [](Ctx&, const httplib::Request&) {
            json a = json::array();
            for (const string& n : clsStorage::AllFiles()) a.push_back({ {"name", n}, {"purpose", purpose.at(n)}, {"records", clsStorage::ReadLines(n).size()} });
            return a;
        });

        _Route("GET", "/api/data/files/:name", Full(), [](Ctx& c, const httplib::Request& req) {
            string name = _Param(req, "name");
            if (!clsStorage::IsKnownFile(name)) throw ErrNotFound("There is no data file called “" + name + "”.");
            c.Raw = true; c.RawBody = clsStorage::ReadText(name); c.RawType = "text/plain; charset=utf-8"; c.RawName = name;
            return json(nullptr);
        });

        _Route("POST", "/api/data/reset", Full(), [this](Ctx&, const httplib::Request&) {
            clsStorage::ResetAll();
            _Sessions.CloseAll();      // everyone signs in again against the restored data
            return json(nullptr);
        });
    }

public:
    explicit clsApiServer(Options Opt) : _Opt(Opt) {}

    // Blocks until the server stops. Returns false when it could not start.
    bool Run()
    {
        _Svr.set_payload_max_length(64 * 1024);
        _Svr.set_read_timeout(10, 0);
        _Svr.set_write_timeout(10, 0);

        // Headers on every response; CORS only when asked for.
        _Svr.set_post_routing_handler([this](const httplib::Request& Req, httplib::Response& Res) {
            Res.set_header("X-Content-Type-Options", "nosniff");
            Res.set_header("X-Frame-Options", "DENY");
            Res.set_header("Referrer-Policy", "no-referrer");
            if (Req.path.rfind("/api/", 0) == 0) Res.set_header("Cache-Control", "no-store");
            if (!_Opt.CorsOrigin.empty())
            {
                Res.set_header("Access-Control-Allow-Origin", _Opt.CorsOrigin);
                Res.set_header("Vary", "Origin");
                Res.set_header("Access-Control-Allow-Headers", "Authorization, Content-Type");
                Res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            }
        });
        _Svr.Options(R"(/api/.*)", [](const httplib::Request&, httplib::Response& Res) { Res.status = 204; });

        _Svr.set_error_handler([](const httplib::Request& Req, httplib::Response& Res) {
            if (Req.path.rfind("/api/", 0) == 0 && Res.body.empty())
            {
                string code = Res.status == 404 ? "not_found" : Res.status == 405 ? "method_not_allowed" : "http_error";
                string msg = Res.status == 404 ? "There is no such address." : Res.status == 413 ? "The request is too large." : "The request could not be handled.";
                Res.set_content(Dump(json{ {"error", { {"code", code}, {"message", msg} } } }), "application/json; charset=utf-8");
            }
        });

        _RegisterAuth();
        _RegisterOverview();
        _RegisterClients();
        _RegisterTransactions();
        _RegisterCurrencies();
        _RegisterUsers();
        _RegisterData();

        if (!_Opt.FrontendDir.empty())
        {
            if (!_Svr.set_mount_point("/", _Opt.FrontendDir))
            {
                cerr << "Warning: could not serve the frontend folder \"" << _Opt.FrontendDir << "\". Running API only.\n";
            }
        }

        if (!_Svr.bind_to_port(_Opt.Host, _Opt.Port))
        {
            cerr << "Error: could not listen on " << _Opt.Host << ":" << _Opt.Port << " (is another program using that port?)\n";
            return false;
        }
        return _Svr.listen_after_bind();
    }

    void Stop() { _Svr.stop(); }
};
