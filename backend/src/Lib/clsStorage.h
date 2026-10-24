#pragma once
// clsStorage — the record files. Same names and the same "#//#" line format as the console version,
// now kept in one data folder (default: ./data). Writes go to a temp file first and are then renamed,
// so a crash can never leave a half-written file behind.
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <string>
#include <vector>
#include "../Global.h"
#include "clsString.h"
#include "clsUtil.h"
#include "../SeedData.h"
using namespace std;

class clsStorage
{
public:
    static const char* Clients()    { return "ClientFile.txt"; }
    static const char* Users()      { return "Users.txt"; }
    static const char* Currencies() { return "Currencies.txt"; }
    static const char* Login()      { return "LoginRecord.text"; }
    static const char* Transfers()  { return "TransferRecord.text"; }

    static vector<string> AllFiles() { return { Clients(), Users(), Currencies(), Login(), Transfers() }; }

    static bool IsKnownFile(const string& Name)
    {
        for (const string& f : AllFiles()) if (f == Name) return true;
        return false;
    }

    static string PathOf(const string& Name) { return Global::DataDir() + "/" + Name; }

    static bool Exists(const string& Name) { return filesystem::exists(PathOf(Name)); }

    static vector<string> ReadLines(const string& Name)
    {
        vector<string> lines;
        ifstream f(PathOf(Name));
        string line;
        while (getline(f, line))
        {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (!clsString::Trim(line).empty()) lines.push_back(line);
        }
        return lines;
    }

    static string ReadText(const string& Name)
    {
        ifstream f(PathOf(Name), ios::binary);
        return string((istreambuf_iterator<char>(f)), istreambuf_iterator<char>());
    }

    static void WriteLines(const string& Name, const vector<string>& Lines)
    {
        filesystem::create_directories(Global::DataDir());
        const string path = PathOf(Name), tmp = path + ".tmp";
        {
            ofstream f(tmp, ios::trunc | ios::binary);
            for (const string& l : Lines) f << l << '\n';
            if (!f) throw runtime_error("Could not write " + Name);
        }
        filesystem::rename(tmp, path);
    }

    static void AppendLine(const string& Name, const string& Line)
    {
        filesystem::create_directories(Global::DataDir());
        ofstream f(PathOf(Name), ios::app | ios::binary);
        f << Line << '\n';
        if (!f) throw runtime_error("Could not write " + Name);
    }

    // Fills any missing file from the sample data of the original project.
    // PINs and passwords are stored encrypted, exactly as the console version did.
    static void EnsureSeeded()
    {
        for (const string& n : AllFiles()) if (!Exists(n)) _SeedFile(n);
    }

    static void ResetAll()
    {
        for (const string& n : AllFiles()) _SeedFile(n);
    }

private:
    static void _SeedFile(const string& Name)
    {
        const string Sep = "#//#";
        const vector<string>* src = nullptr;
        if (Name == Clients()) src = &SeedData::ClientFile;
        else if (Name == Users()) src = &SeedData::UsersFile;
        else if (Name == Currencies()) src = &SeedData::CurrenciesFile;
        else if (Name == Login()) src = &SeedData::LoginRecord;
        else if (Name == Transfers()) src = &SeedData::TransferRecord;
        vector<string> out;
        for (const string& line : *src)
        {
            vector<string> f = clsString::vSplitString(line, Sep);
            if (Name == Clients() && f.size() >= 7) f[1] = clsUtil::EncryptText(f[1]);
            if (Name == Users() && f.size() >= 7) f[5] = clsUtil::EncryptText(f[5]);
            string joined;
            for (size_t i = 0; i < f.size(); i++) joined += (i ? Sep : "") + f[i];
            out.push_back(joined);
        }
        WriteLines(Name, out);
    }
};
