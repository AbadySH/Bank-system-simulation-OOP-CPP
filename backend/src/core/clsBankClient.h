#pragma once
// clsBankClient — client accounts: CRUD, deposit, withdraw, transfer and the transfer log.
// Record format (same as the console version):
//   AccountNumber#//#PinCode(encrypted)#//#FirstName#//#LastName#//#Email#//#Phone#//#Balance
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
#include "clsPerson.h"
#include "../Lib/clsDate.h"
#include "../Lib/clsStorage.h"
#include "../Lib/clsString.h"
#include "../Lib/clsUtil.h"
using namespace std;

class clsBankClient : public clsPerson
{
public:
    enum enMode { EmptyMode = 0, UpdateMode = 1, AddNewMode = 2 };
    enum enSaveResults { svFaildEmptyObject = 0, svSucceeded = 1, svFaildAccountNumberExists = 2 };

    struct stTransferRecoed
    {
        string DateTime;
        string SourceClient;
        string DestinationClient;
        double Amount = 0;
        double SourceClientAmount = 0;
        double DestinationClientAmount = 0;
        string UserName;
    };

private:
    enMode _Mode;
    string _AccountNumber;
    string _PinCode;
    double _AccountBalance;

    static string _Sep() { return "#//#"; }
    static double _Round(double n) { return round(n * 100.0) / 100.0; }
    static bool _Same(const string& A, const string& B) { return clsString::EqualsIgnoreCase(clsString::Trim(A), clsString::Trim(B)); }

    static bool _ToDouble(const string& s, double& out)
    {
        char* end = nullptr;
        out = strtod(s.c_str(), &end);
        return end != s.c_str() && *end == '\0' && isfinite(out);
    }

    static clsBankClient _GetEmptyClientObject()
    {
        return clsBankClient(EmptyMode, "", "", "", "", "", "", 0);
    }

    static clsBankClient _ConvertLinetoClientObject(const string& Line)
    {
        vector<string> v = clsString::vSplitString(Line, _Sep());
        double balance = 0;
        if (v.size() < 7 || !_ToDouble(v[6], balance)) return _GetEmptyClientObject();
        return clsBankClient(UpdateMode, v[2], v[3], v[4], v[5], v[0], clsUtil::DecryptText(v[1]), balance);
    }

    static string _ConverClientObjectToLine(const clsBankClient& C)
    {
        char bal[64];
        snprintf(bal, sizeof bal, "%.2f", C.GetAccountBalance());
        return clsString::SafeField(C.AccountNumber()) + _Sep() + clsUtil::EncryptText(C.GetPinCode()) + _Sep() +
               clsString::SafeField(C.GetFirstName()) + _Sep() + clsString::SafeField(C.GetLastName()) + _Sep() +
               clsString::SafeField(C.GetEmail()) + _Sep() + clsString::SafeField(C.GetPhone()) + _Sep() + bal;
    }

    static vector<clsBankClient> _LoadClientsDataFromFile()
    {
        vector<clsBankClient> vClients;
        for (const string& line : clsStorage::ReadLines(clsStorage::Clients()))
        {
            clsBankClient c = _ConvertLinetoClientObject(line);
            if (!c.IsEmpty()) vClients.push_back(c);
        }
        return vClients;
    }

    static void _SaveClientsDataToFile(const vector<clsBankClient>& vClients)
    {
        vector<string> lines;
        for (const clsBankClient& c : vClients) lines.push_back(_ConverClientObjectToLine(c));
        clsStorage::WriteLines(clsStorage::Clients(), lines);
    }

    void _Update()
    {
        vector<clsBankClient> v = _LoadClientsDataFromFile();
        for (clsBankClient& c : v)
            if (_Same(c.AccountNumber(), _AccountNumber)) { c = *this; break; }
        _SaveClientsDataToFile(v);
    }

    void _AddNew() { clsStorage::AppendLine(clsStorage::Clients(), _ConverClientObjectToLine(*this)); }

    // Re-read the stored balance so an object loaded earlier can never overwrite a newer balance.
    void _Refresh()
    {
        clsBankClient fresh = Find(_AccountNumber);
        if (!fresh.IsEmpty()) _AccountBalance = fresh.GetAccountBalance();
    }

    void _RegisterTransferLog(double Amount, const clsBankClient& Dest, const string& UserName)
    {
        char a[64], b[64], c[64];
        snprintf(a, sizeof a, "%.2f", Amount);
        snprintf(b, sizeof b, "%.2f", GetAccountBalance());
        snprintf(c, sizeof c, "%.2f", Dest.GetAccountBalance());
        string line = clsDate::GetSystemDateTimeString() + _Sep() + clsString::SafeField(AccountNumber()) + _Sep() +
                      clsString::SafeField(Dest.AccountNumber()) + _Sep() + a + _Sep() + b + _Sep() + c + _Sep() + clsString::SafeField(UserName);
        clsStorage::AppendLine(clsStorage::Transfers(), line);
    }

public:
    clsBankClient(enMode Mode, string FirstName, string LastName, string Email, string Phone,
                  string AccountNumber, string PinCode, double AccountBalance)
        : clsPerson(FirstName, LastName, Email, Phone)
    {
        _Mode = Mode;
        _AccountNumber = AccountNumber;
        _PinCode = PinCode;
        _AccountBalance = _Round(AccountBalance);
    }

    bool IsEmpty() const { return _Mode == EmptyMode; }
    string AccountNumber() const { return _AccountNumber; }
    void SetPinCode(string PinCode) { _PinCode = PinCode; }
    string GetPinCode() const { return _PinCode; }
    void SetAccountBalance(double AccountBalance) { _AccountBalance = _Round(AccountBalance); }
    double GetAccountBalance() const { return _AccountBalance; }

    // ---------- queries ----------
    static clsBankClient Find(const string& AccountNumber)
    {
        string key = clsString::Trim(AccountNumber);
        if (key.empty()) return _GetEmptyClientObject();
        for (const string& line : clsStorage::ReadLines(clsStorage::Clients()))
        {
            clsBankClient c = _ConvertLinetoClientObject(line);
            if (!c.IsEmpty() && _Same(c.AccountNumber(), key)) return c;
        }
        return _GetEmptyClientObject();
    }

    static clsBankClient Find(const string& AccountNumber, const string& PinCode)
    {
        clsBankClient c = Find(AccountNumber);
        return (!c.IsEmpty() && c.GetPinCode() == PinCode) ? c : _GetEmptyClientObject();
    }

    static bool IsClientExist(const string& AccountNumber) { return !Find(AccountNumber).IsEmpty(); }

    static clsBankClient GetAddNewClientObject(const string& AccountNumber)
    {
        return clsBankClient(AddNewMode, "", "", "", "", clsString::UpperAllLatterOfTheString(clsString::Trim(AccountNumber)), "", 0);
    }

    static vector<clsBankClient> GetClientsList() { return _LoadClientsDataFromFile(); }

    static double GetTotalBalances()
    {
        double total = 0;
        for (const clsBankClient& c : GetClientsList()) total += c.GetAccountBalance();
        return _Round(total);
    }

    // ---------- commands ----------
    enSaveResults Save()
    {
        switch (_Mode)
        {
        case EmptyMode:
            return svFaildEmptyObject;
        case UpdateMode:
            _Update();
            return svSucceeded;
        case AddNewMode:
            if (IsClientExist(_AccountNumber)) return svFaildAccountNumberExists;
            _AddNew();
            _Mode = UpdateMode;
            return svSucceeded;
        }
        return svFaildEmptyObject;
    }

    bool Delete()
    {
        vector<clsBankClient> kept;
        for (const clsBankClient& c : _LoadClientsDataFromFile())
            if (!_Same(c.AccountNumber(), _AccountNumber)) kept.push_back(c);
        _SaveClientsDataToFile(kept);
        _Mode = EmptyMode;
        return true;
    }

    bool Deposit(double Amount)
    {
        if (!(Amount > 0)) return false;
        _Refresh();
        _AccountBalance = _Round(_AccountBalance + Amount);
        Save();
        return true;
    }

    // Returns false (and changes nothing) when the balance is too low.
    bool Withdraw(double Amount)
    {
        if (!(Amount > 0)) return false;
        _Refresh();
        if (Amount > _AccountBalance) return false;
        _AccountBalance = _Round(_AccountBalance - Amount);
        Save();
        return true;
    }

    bool Transfer(double Amount, clsBankClient& DestinationClient, const string& UserName)
    {
        if (_Same(_AccountNumber, DestinationClient.AccountNumber())) return false;
        if (!Withdraw(Amount)) return false;
        DestinationClient.Deposit(Amount);
        _RegisterTransferLog(Amount, DestinationClient, UserName);
        return true;
    }

    // ---------- transfer log ----------
    static bool ConvertTransferRecoed(const string& Line, stTransferRecoed& Out)
    {
        vector<string> v = clsString::vSplitString(Line, _Sep());
        if (v.size() < 7) return false;
        stTransferRecoed r;
        r.DateTime = v[0]; r.SourceClient = v[1]; r.DestinationClient = v[2]; r.UserName = v[6];
        if (!_ToDouble(v[3], r.Amount) || !_ToDouble(v[4], r.SourceClientAmount) || !_ToDouble(v[5], r.DestinationClientAmount)) return false;
        Out = r;
        return true;
    }

    static vector<stTransferRecoed> GetTransferLog()
    {
        vector<stTransferRecoed> out;
        for (const string& line : clsStorage::ReadLines(clsStorage::Transfers()))
        {
            stTransferRecoed r;
            if (ConvertTransferRecoed(line, r)) out.push_back(r);
        }
        return out;
    }
};
