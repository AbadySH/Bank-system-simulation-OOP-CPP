#pragma once
// clsCurrency — exchange rates relative to the US dollar.
// Record format: Country#//#CurrencyCode#//#CurrencyName#//#Rate
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <set>
#include <string>
#include <vector>
#include "../Lib/clsStorage.h"
#include "../Lib/clsString.h"
using namespace std;

class clsCurrency
{
public:
    enum enMode { EmptyMode = 0, UpdateMode = 1 };

private:
    enMode _Mode;
    string _Country;
    string _CurrencyCode;
    string _CurrencyName;
    double _Rate;

    static string _Sep() { return "#//#"; }

    static clsCurrency _GetEmptyCurrencyObject() { return clsCurrency(EmptyMode, "", "", "", 0); }

    static clsCurrency _ConvertLinetoCurrencyObject(const string& Line)
    {
        vector<string> v = clsString::vSplitString(Line, _Sep());
        if (v.size() < 4) return _GetEmptyCurrencyObject();
        char* end = nullptr;
        double rate = strtod(v[3].c_str(), &end);
        if (end == v[3].c_str() || *end != '\0' || !isfinite(rate)) return _GetEmptyCurrencyObject();
        return clsCurrency(UpdateMode, v[0], v[1], v[2], rate);
    }

    static string _ConverCurrencyObjectToLine(const clsCurrency& C)
    {
        char rate[64];
        snprintf(rate, sizeof rate, "%.6f", C.Rate());
        return clsString::SafeField(C.Country()) + _Sep() + clsString::SafeField(C.CurrencyCode()) + _Sep() +
               clsString::SafeField(C.CurrencyName()) + _Sep() + rate;
    }

    static vector<clsCurrency> _Load()
    {
        vector<clsCurrency> v;
        for (const string& line : clsStorage::ReadLines(clsStorage::Currencies()))
        {
            clsCurrency c = _ConvertLinetoCurrencyObject(line);
            if (!c.IsEmpty()) v.push_back(c);
        }
        return v;
    }

public:
    clsCurrency(enMode Mode, string Country, string CurrencyCode, string CurrencyName, double Rate)
    {
        _Mode = Mode;
        _Country = Country;
        _CurrencyCode = CurrencyCode;
        _CurrencyName = CurrencyName;
        _Rate = Rate;
    }

    bool IsEmpty() const { return _Mode == EmptyMode; }
    string Country() const { return _Country; }
    string CurrencyCode() const { return _CurrencyCode; }
    string CurrencyName() const { return _CurrencyName; }
    double Rate() const { return _Rate; }

    // Several countries share one currency (USD, EUR ...), so the new rate is applied to every row with that code.
    // Returns how many rows were changed.
    int UpdateRate(double NewRate)
    {
        _Rate = NewRate;
        vector<clsCurrency> v = _Load();
        vector<string> lines;
        int changed = 0;
        for (clsCurrency& c : v)
        {
            if (clsString::EqualsIgnoreCase(c.CurrencyCode(), _CurrencyCode)) { c._Rate = NewRate; changed++; }
            lines.push_back(_ConverCurrencyObjectToLine(c));
        }
        clsStorage::WriteLines(clsStorage::Currencies(), lines);
        return changed;
    }

    static vector<clsCurrency> GetAllUSDRates() { return _Load(); }
    static vector<clsCurrency> GetCurrenciesList() { return _Load(); }

    static clsCurrency FindByCode(const string& CurrencyCode)
    {
        string code = clsString::UpperAllLatterOfTheString(clsString::Trim(CurrencyCode));
        for (const clsCurrency& c : _Load())
            if (clsString::UpperAllLatterOfTheString(c.CurrencyCode()) == code) return c;
        return _GetEmptyCurrencyObject();
    }

    static clsCurrency FindByCountry(const string& Country)
    {
        string name = clsString::UpperAllLatterOfTheString(clsString::Trim(Country));
        for (const clsCurrency& c : _Load())
            if (clsString::UpperAllLatterOfTheString(c.Country()) == name) return c;
        return _GetEmptyCurrencyObject();
    }

    static bool IsCurrencyExist(const string& CurrencyCode) { return !FindByCode(CurrencyCode).IsEmpty(); }

    double ConvertToUSD(double Amount) const { return _Rate > 0 ? Amount / _Rate : 0; }

    double ConvertToOtherCurrency(double Amount, const clsCurrency& Currency2) const
    {
        double usd = ConvertToUSD(Amount);
        if (clsString::UpperAllLatterOfTheString(clsString::Trim(Currency2.CurrencyCode())) == "USD") return usd;
        return usd * Currency2.Rate();
    }
};
