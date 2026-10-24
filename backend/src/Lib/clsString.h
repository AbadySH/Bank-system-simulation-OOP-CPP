#pragma once
// clsString — small string helpers used by the record-file layer.
#include <algorithm>
#include <cctype>
#include <string>
#include <vector>
using namespace std;

class clsString
{
public:
    // Splits on a delimiter string. Empty fields are kept, so "a#//##//#c" has three fields.
    static vector<string> vSplitString(const string& S1, const string& Delim = " ")
    {
        vector<string> vString;
        if (Delim.empty()) { vString.push_back(S1); return vString; }
        size_t start = 0, pos;
        while ((pos = S1.find(Delim, start)) != string::npos)
        {
            vString.push_back(S1.substr(start, pos - start));
            start = pos + Delim.size();
        }
        vString.push_back(S1.substr(start));
        return vString;
    }

    static string UpperAllLatterOfTheString(string S1)
    {
        for (char& c : S1) c = (char)toupper((unsigned char)c);
        return S1;
    }

    static string LowerAllLatterOfTheString(string S1)
    {
        for (char& c : S1) c = (char)tolower((unsigned char)c);
        return S1;
    }

    static bool EqualsIgnoreCase(const string& A, const string& B)
    {
        return LowerAllLatterOfTheString(A) == LowerAllLatterOfTheString(B);
    }

    static string Trim(const string& S1)
    {
        size_t b = 0, e = S1.size();
        while (b < e && isspace((unsigned char)S1[b])) b++;
        while (e > b && isspace((unsigned char)S1[e - 1])) e--;
        return S1.substr(b, e - b);
    }

    // Record files use "#//#" between fields and one record per line,
    // so neither may appear inside a value.
    static string SafeField(string Value, const string& Separator = "#//#")
    {
        size_t pos;
        while ((pos = Value.find(Separator)) != string::npos) Value.replace(pos, Separator.size(), "#/ /#");
        for (char& c : Value) if (c == '\n' || c == '\r') c = ' ';
        return Value;
    }
};
