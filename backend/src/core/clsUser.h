#pragma once
// clsUser — authentication, bitwise permissions and the login register.
// Record format: First#//#Last#//#Email#//#Phone#//#UserName#//#Password(encrypted)#//#Permissions
#include <cstdlib>
#include <string>
#include <utility>
#include <vector>
#include "clsPerson.h"
#include "../Lib/clsDate.h"
#include "../Lib/clsStorage.h"
#include "../Lib/clsString.h"
#include "../Lib/clsUtil.h"
using namespace std;

class clsUser : public clsPerson
{
public:
    enum enMode { EmptyMode = 0, UpdateMode = 1, AddNewMode = 2 };
    enum enSaveResults { svFaildEmptyObject = 0, svSucceeded = 1, svFaildUserExists = 2 };
    enum enPermissions
    {
        eAll = -1, pListClients = 1, pAddNewClient = 2, pDeleteClient = 4, pUpdateClients = 8,
        pFindClient = 16, pTranactions = 32, pManageUsers = 64, pLogRegister = 128, pCurrency = 256
    };
    static const int AllPermissionBits = 511;   // every flag above, added together

    struct stRegisterLoginRecoed
    {
        string DateTime;
        string UserName;
        int Permission = 0;
    };

private:
    enMode _Mode;
    string _UserName;
    string _Password;
    int _Permissions;

    static string _Sep() { return "#//#"; }
    static bool _Same(const string& A, const string& B) { return clsString::EqualsIgnoreCase(clsString::Trim(A), clsString::Trim(B)); }

    static clsUser _GetEmptyUserObject() { return clsUser(EmptyMode, "", "", "", "", "", "", 0); }

    static clsUser _ConvertLinetoUserObject(const string& Line)
    {
        vector<string> v = clsString::vSplitString(Line, _Sep());
        if (v.size() < 7) return _GetEmptyUserObject();
        char* end = nullptr;
        long perm = strtol(v[6].c_str(), &end, 10);
        if (end == v[6].c_str() || *end != '\0') return _GetEmptyUserObject();
        return clsUser(UpdateMode, v[0], v[1], v[2], v[3], v[4], clsUtil::DecryptText(v[5]), (int)perm);
    }

    static string _ConverUserObjectToLine(const clsUser& U)
    {
        return clsString::SafeField(U.GetFirstName()) + _Sep() + clsString::SafeField(U.GetLastName()) + _Sep() +
               clsString::SafeField(U.GetEmail()) + _Sep() + clsString::SafeField(U.GetPhone()) + _Sep() +
               clsString::SafeField(U.GetUserName()) + _Sep() + clsUtil::EncryptText(U.GetPassword()) + _Sep() +
               to_string(U.GetPermissions());
    }

    static vector<clsUser> _LoadUsersDataFromFile()
    {
        vector<clsUser> v;
        for (const string& line : clsStorage::ReadLines(clsStorage::Users()))
        {
            clsUser u = _ConvertLinetoUserObject(line);
            if (!u.IsEmpty()) v.push_back(u);
        }
        return v;
    }

    static void _SaveUsersDataToFile(const vector<clsUser>& vUsers)
    {
        vector<string> lines;
        for (const clsUser& u : vUsers) lines.push_back(_ConverUserObjectToLine(u));
        clsStorage::WriteLines(clsStorage::Users(), lines);
    }

    void _Update()
    {
        vector<clsUser> v = _LoadUsersDataFromFile();
        for (clsUser& u : v)
            if (_Same(u.GetUserName(), _UserName)) { u = *this; break; }
        _SaveUsersDataToFile(v);
    }

    void _AddNew() { clsStorage::AppendLine(clsStorage::Users(), _ConverUserObjectToLine(*this)); }

public:
    clsUser(enMode Mode, string FirstName, string LastName, string Email, string Phone,
            string UserName, string Password, int Permissions)
        : clsPerson(FirstName, LastName, Email, Phone)
    {
        _Mode = Mode;
        _UserName = UserName;
        _Password = Password;
        _Permissions = Permissions;
    }

    clsUser() : clsUser(EmptyMode, "", "", "", "", "", "", 0) {}

    bool IsEmpty() const { return _Mode == EmptyMode; }
    string GetUserName() const { return _UserName; }
    void SetUserName(string UserName) { _UserName = UserName; }
    void SetPassword(string Password) { _Password = Password; }
    string GetPassword() const { return _Password; }
    void SetPermissions(int Permissions) { _Permissions = Permissions; }
    int GetPermissions() const { return _Permissions; }
    bool HasFullAccess() const { return _Permissions == eAll; }

    // ---------- queries ----------
    static clsUser Find(const string& UserName)
    {
        string key = clsString::Trim(UserName);
        if (key.empty()) return _GetEmptyUserObject();
        for (const string& line : clsStorage::ReadLines(clsStorage::Users()))
        {
            clsUser u = _ConvertLinetoUserObject(line);
            if (!u.IsEmpty() && _Same(u.GetUserName(), key)) return u;
        }
        return _GetEmptyUserObject();
    }

    static clsUser Find(const string& UserName, const string& Password)
    {
        clsUser u = Find(UserName);
        return (!u.IsEmpty() && u.GetPassword() == Password) ? u : _GetEmptyUserObject();
    }

    static bool IsUserExist(const string& UserName) { return !Find(UserName).IsEmpty(); }
    static clsUser GetAddNewUserObject(const string& UserName)
    {
        return clsUser(AddNewMode, "", "", "", "", clsString::Trim(UserName), "", 0);
    }
    static vector<clsUser> GetUsersList() { return _LoadUsersDataFromFile(); }

    // ---------- commands ----------
    enSaveResults Save()
    {
        switch (_Mode)
        {
        case EmptyMode: return svFaildEmptyObject;
        case UpdateMode: _Update(); return svSucceeded;
        case AddNewMode:
            if (IsUserExist(_UserName)) return svFaildUserExists;
            _AddNew();
            _Mode = UpdateMode;
            return svSucceeded;
        }
        return svFaildEmptyObject;
    }

    bool Delete()
    {
        vector<clsUser> kept;
        for (const clsUser& u : _LoadUsersDataFromFile())
            if (!_Same(u.GetUserName(), _UserName)) kept.push_back(u);
        _SaveUsersDataToFile(kept);
        _Mode = EmptyMode;
        return true;
    }

    bool CheckAccessPermission(enPermissions Permission) const
    {
        if (IsEmpty()) return false;
        if (_Permissions == eAll) return true;
        return (Permission & _Permissions) == Permission;
    }

    // ---------- login register: DateTime#//#UserName#//#Permissions ----------
    void RegisterLogin() const
    {
        clsStorage::AppendLine(clsStorage::Login(),
            clsDate::GetSystemDateTimeString() + _Sep() + clsString::SafeField(GetUserName()) + _Sep() + to_string(GetPermissions()));
    }

    static bool ConvertRegisterLoginRecoed(const string& Line, stRegisterLoginRecoed& Out)
    {
        vector<string> v = clsString::vSplitString(Line, _Sep());
        if (v.size() < 3) return false;
        char* end = nullptr;
        long perm = strtol(v[2].c_str(), &end, 10);
        if (end == v[2].c_str() || *end != '\0') return false;
        Out.DateTime = v[0]; Out.UserName = v[1]; Out.Permission = (int)perm;
        return true;
    }

    static vector<stRegisterLoginRecoed> GetLoginRegisterList()
    {
        vector<stRegisterLoginRecoed> out;
        for (const string& line : clsStorage::ReadLines(clsStorage::Login()))
        {
            stRegisterLoginRecoed r;
            if (ConvertRegisterLoginRecoed(line, r)) out.push_back(r);
        }
        return out;
    }

    // ---------- permissions, in bit order ----------
    static vector<pair<int, string>> PermissionList()
    {
        return { {pListClients, "View client list"}, {pAddNewClient, "Add clients"}, {pDeleteClient, "Delete clients"},
                 {pUpdateClients, "Update clients"}, {pFindClient, "Find clients"}, {pTranactions, "Transactions"},
                 {pManageUsers, "Manage users"}, {pLogRegister, "View login register"}, {pCurrency, "Currency exchange"} };
    }

    static vector<string> DescribePermissions(int Value)
    {
        if (Value == eAll) return { "Full access" };
        vector<string> out;
        for (const auto& p : PermissionList()) if ((Value & p.first) == p.first) out.push_back(p.second);
        return out;
    }
};
