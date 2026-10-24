#pragma once
// clsPerson — base class shared by clients and users (inheritance).
#include <string>
using namespace std;

class clsPerson
{
private:
    string _FirstName;
    string _LastName;
    string _Email;
    string _Phone;

public:
    clsPerson() {}

    clsPerson(string FirstName, string LastName, string Email, string Phone)
    {
        _FirstName = FirstName;
        _LastName = LastName;
        _Email = Email;
        _Phone = Phone;
    }

    void SetFirstName(string FirstName) { _FirstName = FirstName; }
    string GetFirstName() const { return _FirstName; }

    void SetLastName(string LastName) { _LastName = LastName; }
    string GetLastName() const { return _LastName; }

    void SetEmail(string Email) { _Email = Email; }
    string GetEmail() const { return _Email; }

    void SetPhone(string Phone) { _Phone = Phone; }
    string GetPhone() const { return _Phone; }

    string FullName() const { return _FirstName + " " + _LastName; }
};
