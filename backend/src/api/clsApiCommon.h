#pragma once
// clsApiCommon — building blocks for the HTTP layer: one error type, form validation,
// JSON converters for the core classes, and the session / login-lock store.
#include <cmath>
#include <cstdio>
#include <ctime>
#include <map>
#include <string>
#include <vector>
#include "../../third_party/nlohmann/json.hpp"
#include "../core/clsBankClient.h"
#include "../core/clsCurrency.h"
#include "../core/clsUser.h"
#include "../Lib/clsInputValidate.h"
using namespace std;
using json = nlohmann::json;

// ---------------------------------------------------------------- errors
// Every failure leaves the server as {"error": {"code", "message", ...}} with a matching HTTP status.
struct ApiError
{
    int Status;
    string Code;
    string Message;
    json Extra = json::object();
};

inline ApiError ErrBadRequest(const string& Message, json Fields = json::object())
{
    return { 400, "validation_error", Message, json{ {"fields", Fields} } };
}
inline ApiError ErrNotFound(const string& Message) { return { 404, "not_found", Message }; }
inline ApiError ErrConflict(const string& Code, const string& Message, json Fields = json::object())
{
    return { 409, Code, Message, json{ {"fields", Fields} } };
}

inline string Dump(const json& J) { return J.dump(-1, ' ', false, json::error_handler_t::replace); }

// "$1,234.50"
inline string Money(double V)
{
    char buf[64];
    snprintf(buf, sizeof buf, "%.2f", fabs(V));
    string s = buf, ip = s.substr(0, s.find('.')), fp = s.substr(s.find('.')), out;
    int count = 0;
    for (int i = (int)ip.size() - 1; i >= 0; i--)
    {
        out.insert(out.begin(), ip[i]);
        if (++count % 3 == 0 && i > 0) out.insert(out.begin(), ',');
    }
    return string(V < 0 ? "-$" : "$") + out + fp;
}

// ---------------------------------------------------------------- form reading
// Collects one message per bad field and throws them all together, so the browser can
// mark every wrong field at once instead of one per round trip.
class clsForm
{
private:
    json _B;
    json _Fields = json::object();

public:
    explicit clsForm(json Body) : _B(std::move(Body)) {}

    bool Has(const char* Key) const { return _B.contains(Key) && !_B[Key].is_null(); }

    void Fail(const char* Key, const string& Message)
    {
        if (!_Fields.contains(Key)) _Fields[Key] = Message;
    }

    bool Failed(const char* Key) const { return _Fields.contains(Key); }

    // Trimmed text. Missing or non-text values come back as "".
    string Text(const char* Key, bool Trim = true) const
    {
        if (!Has(Key) || !_B[Key].is_string()) return "";
        string s = _B[Key].get<string>();
        return Trim ? clsString::Trim(s) : s;
    }

    bool IsNumber(const char* Key) const { return Has(Key) && _B[Key].is_number(); }
    double Number(const char* Key) const { return IsNumber(Key) ? _B[Key].get<double>() : NAN; }
    bool IsInteger(const char* Key) const { return Has(Key) && _B[Key].is_number_integer(); }
    long long Integer(const char* Key) const { return IsInteger(Key) ? _B[Key].get<long long>() : 0; }

    void Done() const
    {
        if (!_Fields.empty()) throw ErrBadRequest("Some fields need attention.", _Fields);
    }

    // Money amount that must be above zero (deposit, withdraw, transfer).
    double PositiveAmount(const char* Key)
    {
        if (!IsNumber(Key)) { Fail(Key, Has(Key) ? "Use numbers only, with up to two decimals (for example 250.50)." : "Enter an amount."); return 0; }
        double v = Number(Key);
        if (!clsInputValidate::IsMoney(v, true)) { Fail(Key, "Use numbers only, with up to two decimals (for example 250.50)."); return 0; }
        if (v <= 0) { Fail(Key, "The amount must be more than zero."); return 0; }
        return v;
    }
};

inline json ParseBody(const string& Raw)
{
    json j = json::parse(Raw, nullptr, false);
    if (j.is_discarded() || !j.is_object()) throw ApiError{ 400, "invalid_json", "The request body must be a JSON object." };
    return j;
}

// ---------------------------------------------------------------- JSON converters
inline json ToJson(const clsBankClient& C)
{
    // The PIN is never sent to the browser.
    return { {"account", C.AccountNumber()}, {"firstName", C.GetFirstName()}, {"lastName", C.GetLastName()},
             {"fullName", C.FullName()}, {"email", C.GetEmail()}, {"phone", C.GetPhone()}, {"balance", C.GetAccountBalance()} };
}

inline json ToJson(const clsUser& U)
{
    // The password is never sent to the browser.
    return { {"userName", U.GetUserName()}, {"firstName", U.GetFirstName()}, {"lastName", U.GetLastName()},
             {"fullName", U.FullName()}, {"email", U.GetEmail()}, {"phone", U.GetPhone()},
             {"permissions", U.GetPermissions()}, {"fullAccess", U.HasFullAccess()}, {"access", clsUser::DescribePermissions(U.GetPermissions())} };
}

inline json ToJson(const clsCurrency& C)
{
    return { {"country", C.Country()}, {"code", C.CurrencyCode()}, {"name", C.CurrencyName()}, {"rate", C.Rate()} };
}

inline json ToJson(const clsBankClient::stTransferRecoed& T)
{
    return { {"dateTime", T.DateTime}, {"from", T.SourceClient}, {"to", T.DestinationClient}, {"amount", T.Amount},
             {"fromBalanceAfter", T.SourceClientAmount}, {"toBalanceAfter", T.DestinationClientAmount}, {"by", T.UserName} };
}

inline json ToJson(const clsUser::stRegisterLoginRecoed& R)
{
    return { {"dateTime", R.DateTime}, {"userName", R.UserName}, {"permissions", R.Permission},
             {"fullAccess", R.Permission == clsUser::eAll}, {"accessCount", (int)clsUser::DescribePermissions(R.Permission).size()} };
}

inline json PermissionListJson()
{
    json a = json::array();
    for (const auto& p : clsUser::PermissionList()) a.push_back({ {"bit", p.first}, {"label", p.second} });
    return a;
}

// ---------------------------------------------------------------- sessions
// Tokens live in memory only: restarting the server signs everyone out.
class clsSession
{
public:
    static constexpr int MaxTrials = 3;
    static constexpr int LockSeconds = 30;
    static constexpr int IdleSeconds = 2 * 60 * 60;

private:
    struct stSession { string UserName; time_t Expires; };
    struct stGuard { int Fails = 0; time_t LockedUntil = 0; };
    map<string, stSession> _Tokens;
    map<string, stGuard> _Guards;

    static string _Key(const string& UserName, const string& Ip)
    {
        return clsString::LowerAllLatterOfTheString(UserName) + "|" + Ip;
    }

    void _Tidy()
    {
        time_t now = time(nullptr);
        for (auto it = _Tokens.begin(); it != _Tokens.end();) it = (it->second.Expires < now) ? _Tokens.erase(it) : next(it);
        for (auto it = _Guards.begin(); it != _Guards.end();) it = (it->second.LockedUntil < now && it->second.Fails == 0) ? _Guards.erase(it) : next(it);
    }

public:
    // Seconds the caller must still wait, or 0 when sign-in is allowed.
    int LockedFor(const string& UserName, const string& Ip)
    {
        auto it = _Guards.find(_Key(UserName, Ip));
        if (it == _Guards.end()) return 0;
        int left = (int)(it->second.LockedUntil - time(nullptr));
        return left > 0 ? left : 0;
    }

    // Records a wrong password. Returns the attempts left (0 means the form is now locked).
    int RegisterFailure(const string& UserName, const string& Ip)
    {
        if (_Guards.size() > 2000) _Tidy();
        stGuard& g = _Guards[_Key(UserName, Ip)];
        g.Fails++;
        if (g.Fails >= MaxTrials) { g.Fails = 0; g.LockedUntil = time(nullptr) + LockSeconds; return 0; }
        return MaxTrials - g.Fails;
    }

    void ClearFailures(const string& UserName, const string& Ip) { _Guards.erase(_Key(UserName, Ip)); }

    string Open(const string& UserName)
    {
        if (_Tokens.size() > 2000) _Tidy();
        string token = clsUtil::GenerateToken(32);
        _Tokens[token] = { UserName, time(nullptr) + IdleSeconds };
        return token;
    }

    // Returns the user name behind a token (and extends the session), or "" when it is unknown or expired.
    string Resolve(const string& Token)
    {
        auto it = _Tokens.find(Token);
        if (it == _Tokens.end()) return "";
        if (it->second.Expires < time(nullptr)) { _Tokens.erase(it); return ""; }
        it->second.Expires = time(nullptr) + IdleSeconds;
        return it->second.UserName;
    }

    void Close(const string& Token) { _Tokens.erase(Token); }
    void CloseAll() { _Tokens.clear(); }
};
