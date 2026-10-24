#pragma once
// clsInputValidate — the server's validation rules. The browser checks the same rules for
// instant feedback, but this is the copy that counts: it never trusts the client.
#include <cmath>
#include <regex>
#include <string>
using namespace std;

class clsInputValidate
{
public:
    static bool IsNonEmpty(const string& V, size_t Max = 40)
    {
        size_t b = 0, e = V.size();
        while (b < e && isspace((unsigned char)V[b])) b++;
        while (e > b && isspace((unsigned char)V[e - 1])) e--;
        return e > b && (e - b) <= Max;
    }

    static bool IsValidEmail(const string& V)
    {
        static const regex re(R"(^[^\s@]+@[^\s@]+\.[^\s@]{2,}$)");
        return V.size() <= 80 && regex_match(V, re);
    }

    static bool IsValidPhone(const string& V)
    {
        static const regex re(R"(^[+0-9][0-9 \-()]{4,18}$)");
        return regex_match(V, re);
    }

    // 3-8 characters, no spaces. Digits are typical, but older records hold other PINs.
    static bool IsValidPin(const string& V)
    {
        if (V.size() < 3 || V.size() > 8) return false;
        for (unsigned char c : V) if (isspace(c) || c < 33 || c > 126) return false;
        return true;
    }

    static bool IsValidAccountNumber(const string& V)
    {
        static const regex re(R"(^[A-Za-z0-9-]{2,12}$)");
        return regex_match(V, re);
    }

    static bool IsValidUserName(const string& V)
    {
        static const regex re(R"(^[A-Za-z0-9_.-]{3,20}$)");
        return regex_match(V, re);
    }

    static bool IsValidPassword(const string& V)
    {
        return V.size() >= 4 && V.size() <= 32;
    }

    // Money: finite, at most two decimals, within a sane range.
    static bool IsMoney(double V, bool AllowZero)
    {
        if (!isfinite(V) || V > 1e12 || V < 0) return false;
        if (V == 0) return AllowZero;
        return fabs(V * 100.0 - round(V * 100.0)) < 1e-6;
    }

    // Rates may carry up to six decimals.
    static bool IsRate(double V)
    {
        if (!isfinite(V) || V <= 0 || V > 1e12) return false;
        return fabs(V * 1e6 - round(V * 1e6)) < 1e-3;
    }
};
