// Logic tests for the core classes. Build and run with:  make test
#include <iostream>
#include <set>
#include <filesystem>
#include "../src/core/clsBankClient.h"
#include "../src/core/clsUser.h"
#include "../src/core/clsCurrency.h"
#include "../src/Lib/clsInputValidate.h"

static int pass = 0, fail = 0;
#define CHECK(name, cond) do { if (cond) pass++; else { fail++; std::cout << "FAIL: " << name << "  (line " << __LINE__ << ")\n"; } } while (0)
#define EQ(name, a, b) do { auto _a = (a); auto _b = (b); if (_a == _b) pass++; else { fail++; std::cout << "FAIL: " << name << "  got [" << _a << "] expected [" << _b << "]\n"; } } while (0)

int main()
{
    std::string dir = (std::filesystem::temp_directory_path() / ("bank-core-test-" + clsUtil::GenerateToken(4))).string();
    Global::DataDir() = dir;
    clsStorage::EnsureSeeded();
    using P = clsUser;

    // seed
    EQ("clients seeded", clsBankClient::GetClientsList().size(), 11u);
    EQ("users seeded", clsUser::GetUsersList().size(), 6u);
    EQ("currencies seeded", clsCurrency::GetCurrenciesList().size(), 222u);
    EQ("login seeded", clsUser::GetLoginRegisterList().size(), 76u);
    EQ("transfers seeded", clsBankClient::GetTransferLog().size(), 4u);

    // cipher
    for (std::string s : std::vector<std::string>{ "1234", "p@ss w0rd!", "a b", std::string(200, 'a'), "#//#", "UPPER lower 123" })
        EQ("cipher roundtrip " + s.substr(0, 8), clsUtil::DecryptText(clsUtil::EncryptText(s)), s);
    EQ("empty encrypts to empty", clsUtil::EncryptText(""), std::string(""));
    CHECK("cipher hides text", clsUtil::EncryptText("1234").find("1234") == std::string::npos);
    std::set<std::string> variants; for (int i = 0; i < 20; i++) variants.insert(clsUtil::EncryptText("1234"));
    CHECK("random padding differs", variants.size() > 1);
    EQ("decrypt garbage is safe", clsUtil::DecryptText("zz!!"), std::string(""));
    EQ("decrypt odd length is safe", clsUtil::DecryptText("abc"), std::string(""));

    // stored encrypted, read back plain
    EQ("A101 pin", clsBankClient::Find("A101").GetPinCode(), std::string("12032"));
    CHECK("pin not plain in file", clsStorage::ReadText(clsStorage::Clients()).find("#//#12032#//#") == std::string::npos);
    EQ("find case-insensitive", clsBankClient::Find("a101").AccountNumber(), std::string("A101"));
    CHECK("find missing", clsBankClient::Find("NOPE").IsEmpty());
    CHECK("find blank", clsBankClient::Find("  ").IsEmpty());
    CHECK("pin ok", !clsBankClient::Find("A101", "12032").IsEmpty());
    CHECK("pin bad", clsBankClient::Find("A101", "0000").IsEmpty());

    // users + permissions
    CHECK("login ok", !clsUser::Find("User2", "3456").IsEmpty());
    CHECK("login any case", !clsUser::Find("user2", "3456").IsEmpty());
    CHECK("login bad pass", clsUser::Find("User2", "x").IsEmpty());
    CHECK("login unknown", clsUser::Find("ghost", "3456").IsEmpty());
    clsUser u1 = clsUser::Find("User1"), u2 = clsUser::Find("User2");
    CHECK("User1 manage users", u1.CheckAccessPermission(P::pManageUsers));
    CHECK("User1 login register", u1.CheckAccessPermission(P::pLogRegister));
    CHECK("User1 no clients", !u1.CheckAccessPermission(P::pListClients));
    CHECK("User1 no currency", !u1.CheckAccessPermission(P::pCurrency));
    bool all = true; for (auto& p : P::PermissionList()) all = all && u2.CheckAccessPermission((P::enPermissions)p.first);
    CHECK("User2 everything", all);
    CHECK("empty user nothing", !clsUser::Find("").CheckAccessPermission(P::pListClients));
    EQ("permission bits add up", (int)P::PermissionList().size(), 9);
    EQ("describe 192", P::DescribePermissions(192).size(), 2u);
    EQ("describe -1", P::DescribePermissions(-1)[0], std::string("Full access"));
    size_t before = clsUser::GetLoginRegisterList().size(); u2.RegisterLogin();
    EQ("login registered", clsUser::GetLoginRegisterList().size(), before + 1);
    EQ("login record user", clsUser::GetLoginRegisterList().back().UserName, std::string("User2"));
    CHECK("no password in login log", clsStorage::ReadText(clsStorage::Login()).find("3456") == std::string::npos);

    clsUser nu = clsUser::GetAddNewUserObject("tester");
    nu.SetFirstName("T"); nu.SetLastName("U"); nu.SetEmail("t@u.io"); nu.SetPhone("12345"); nu.SetPassword("pw12"); nu.SetPermissions(33);
    EQ("add user", (int)nu.Save(), (int)clsUser::svSucceeded);
    EQ("dup user", (int)clsUser::GetAddNewUserObject("TESTER").Save(), (int)clsUser::svFaildUserExists);
    clsUser nu2 = clsUser::Find("tester"); nu2.SetPermissions(-1); nu2.Save();
    EQ("update perms", clsUser::Find("tester").GetPermissions(), -1);
    EQ("password roundtrip", clsUser::Find("tester").GetPassword(), std::string("pw12"));
    CHECK("delete user", clsUser::Find("tester").Delete() && clsUser::Find("tester").IsEmpty());
    EQ("users back to 6", clsUser::GetUsersList().size(), 6u);

    // clients
    clsBankClient nc = clsBankClient::GetAddNewClientObject("t9");
    nc.SetPinCode("4321"); nc.SetFirstName("Eve#//#X"); nc.SetLastName("Line\nBreak"); nc.SetEmail("e@x.io"); nc.SetPhone("55555"); nc.SetAccountBalance(100);
    EQ("add client", (int)nc.Save(), (int)clsBankClient::svSucceeded);
    EQ("account uppercased", clsBankClient::Find("T9").AccountNumber(), std::string("T9"));
    EQ("dup client", (int)clsBankClient::GetAddNewClientObject("T9").Save(), (int)clsBankClient::svFaildAccountNumberExists);
    EQ("12 clients, file intact", clsBankClient::GetClientsList().size(), 12u);
    CHECK("separator escaped", clsBankClient::Find("T9").GetFirstName().find("#//#") == std::string::npos);
    EQ("empty object save", (int)clsBankClient::Find("zzz").Save(), (int)clsBankClient::svFaildEmptyObject);

    auto T9 = [] { return clsBankClient::Find("T9"); };
    CHECK("deposit ok", T9().Deposit(50.25)); EQ("balance 150.25", T9().GetAccountBalance(), 150.25);
    CHECK("deposit 0 rejected", !T9().Deposit(0)); CHECK("deposit negative rejected", !T9().Deposit(-5));
    CHECK("withdraw too much", !T9().Withdraw(1000)); EQ("unchanged", T9().GetAccountBalance(), 150.25);
    CHECK("withdraw ok", T9().Withdraw(50.25)); EQ("balance 100", T9().GetAccountBalance(), 100.0);
    CHECK("withdraw exact", T9().Withdraw(100)); EQ("balance 0", T9().GetAccountBalance(), 0.0);
    { auto a = T9(); a.Deposit(0.1); } { auto a = T9(); a.Deposit(0.2); }
    EQ("0.1+0.2 = 0.30", T9().GetAccountBalance(), 0.3);
    { auto stale = T9(); auto fresh = T9(); fresh.Deposit(10); stale.Deposit(5); }
    EQ("stale object refreshed", T9().GetAccountBalance(), 15.3);

    double total0 = clsBankClient::GetTotalBalances(); size_t log0 = clsBankClient::GetTransferLog().size();
    clsBankClient src = clsBankClient::Find("A101"), dst = clsBankClient::Find("A102");
    double sb = src.GetAccountBalance(), db = dst.GetAccountBalance();
    CHECK("transfer ok", src.Transfer(500, dst, "User2"));
    EQ("src debited", clsBankClient::Find("A101").GetAccountBalance(), sb - 500);
    EQ("dst credited", clsBankClient::Find("A102").GetAccountBalance(), db + 500);
    EQ("total unchanged", clsBankClient::GetTotalBalances(), total0);
    EQ("log +1", clsBankClient::GetTransferLog().size(), log0 + 1);
    auto last = clsBankClient::GetTransferLog().back();
    CHECK("log fields", last.SourceClient == "A101" && last.DestinationClient == "A102" && last.Amount == 500 && last.UserName == "User2" &&
                        last.SourceClientAmount == sb - 500 && last.DestinationClientAmount == db + 500);
    { auto a = clsBankClient::Find("A07"), b = clsBankClient::Find("A101"); CHECK("too much rejected", !a.Transfer(99999, b, "User2")); }
    { auto a = clsBankClient::Find("A101"), b = clsBankClient::Find("A101"); CHECK("self transfer rejected", !a.Transfer(1, b, "User2")); }
    EQ("failures not logged", clsBankClient::GetTransferLog().size(), log0 + 1);
    EQ("A101 untouched by failures", clsBankClient::Find("A101").GetAccountBalance(), sb - 500);
    CHECK("delete client", clsBankClient::Find("T9").Delete() && clsBankClient::Find("T9").IsEmpty());
    EQ("clients back to 11", clsBankClient::GetClientsList().size(), 11u);

    // currency
    clsCurrency usd = clsCurrency::FindByCode("usd"), eur = clsCurrency::FindByCode("EUR");
    CHECK("usd found", !usd.IsEmpty()); EQ("usd rate", usd.Rate(), 1.0); CHECK("eur found", !eur.IsEmpty());
    EQ("100 USD -> USD", usd.ConvertToOtherCurrency(100, usd), 100.0);
    CHECK("USD -> EUR", std::fabs(usd.ConvertToOtherCurrency(100, eur) - 100 * eur.Rate()) < 1e-9);
    CHECK("EUR -> USD", std::fabs(eur.ConvertToUSD(eur.Rate()) - 1) < 1e-9);
    clsCurrency jpy = clsCurrency::FindByCode("JPY");
    CHECK("cross roundtrip", std::fabs(jpy.ConvertToOtherCurrency(eur.ConvertToOtherCurrency(100, jpy), eur) - 100) < 1e-6);
    int rows = eur.UpdateRate(0.5);
    CHECK("shared by several countries", rows > 1);
    bool allHalf = true; for (auto& c : clsCurrency::GetCurrenciesList()) if (c.CurrencyCode() == "EUR") allHalf = allHalf && c.Rate() == 0.5;
    CHECK("rate applied to all rows", allHalf);
    EQ("currency count same", clsCurrency::GetCurrenciesList().size(), 222u);
    CHECK("find by country", !clsCurrency::FindByCountry("albania").IsEmpty());
    CHECK("zero rate safe", clsCurrency(clsCurrency::UpdateMode, "x", "XXX", "x", 0).ConvertToUSD(10) == 0);

    // helpers
    EQ("words 0", clsUtil::NumberToText(0), std::string("Zero"));
    EQ("words 21000", clsUtil::NumberToText(21000), std::string("Twenty One Thousand"));
    EQ("words big", clsUtil::NumberToText(1234567), std::string("One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven"));
    EQ("words 115", clsUtil::NumberToText(115), std::string("One Hundred Fifteen"));
    CHECK("money ok", clsInputValidate::IsMoney(250.5, false) && clsInputValidate::IsMoney(0, true) && !clsInputValidate::IsMoney(0, false));
    CHECK("money rejects", !clsInputValidate::IsMoney(1.234, false) && !clsInputValidate::IsMoney(-5, false) && !clsInputValidate::IsMoney(1e13, false) && !clsInputValidate::IsMoney(NAN, true));
    CHECK("email", clsInputValidate::IsValidEmail("a@b.co") && !clsInputValidate::IsValidEmail("a@b") && !clsInputValidate::IsValidEmail("a b@c.io"));
    CHECK("pin", clsInputValidate::IsValidPin("1234") && clsInputValidate::IsValidPin("d212") && !clsInputValidate::IsValidPin("12") && !clsInputValidate::IsValidPin("12 34"));
    CHECK("phone", clsInputValidate::IsValidPhone("+20 100 555 1234") && !clsInputValidate::IsValidPhone("12") && !clsInputValidate::IsValidPhone("abc12345"));
    CHECK("account", clsInputValidate::IsValidAccountNumber("A-101") && !clsInputValidate::IsValidAccountNumber("a b") && !clsInputValidate::IsValidAccountNumber("x"));
    CHECK("today", clsDate::IsToday(clsDate::GetSystemDateTimeString())); CHECK("not today", !clsDate::IsToday("1/1/2000 - 1:1:1"));
    CHECK("key shape", clsUtil::GenerateKey().size() == 19);

    // reset
    clsStorage::ResetAll();
    EQ("reset clients", clsBankClient::GetClientsList().size(), 11u);
    EQ("reset A101", clsBankClient::Find("A101").GetAccountBalance(), 21000.0);
    EQ("reset transfers", clsBankClient::GetTransferLog().size(), 4u);
    CHECK("reset rate", clsCurrency::FindByCode("EUR").Rate() != 0.5);

    std::filesystem::remove_all(dir);
    std::cout << pass << " passed, " << fail << " failed\n";
    return fail ? 1 : 0;
}
