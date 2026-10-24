#pragma once
// clsUtil — random helpers, the 5-layer text cipher and number-to-words.
// Educational only: the cipher demonstrates layering, it is NOT real security.
#include <cstdint>
#include <mutex>
#include <random>
#include <string>
#include <vector>
using namespace std;

class clsUtil
{
private:
    static mt19937_64& _Engine()
    {
        static mt19937_64 engine{ random_device{}() ^ (uint64_t)chrono_seed() };
        return engine;
    }
    static uint64_t chrono_seed();
    static mutex& _Lock() { static mutex m; return m; }

    static constexpr const char* KEY1 = "BANK-OOP";
    static constexpr const char* KEY2 = "SIMULATION";

    static uint8_t _InvertCase(uint8_t v)
    {
        if (v >= 65 && v <= 90) return (uint8_t)(v + 32);
        if (v >= 97 && v <= 122) return (uint8_t)(v - 32);
        return v;
    }

public:
    enum enCharType { SamallLetter = 1, CapitalLetter = 2, Digit = 3, MixChars = 4, SpecialCharacter = 5 };

    static int RandomNumber(int From, int To)
    {
        lock_guard<mutex> g(_Lock());
        return uniform_int_distribution<int>(From, To)(_Engine());
    }

    static char GetRandomCharacter(enCharType CharType)
    {
        if (CharType == MixChars) CharType = (enCharType)RandomNumber(1, 3);
        switch (CharType)
        {
        case SamallLetter:     return (char)RandomNumber(97, 122);
        case CapitalLetter:    return (char)RandomNumber(65, 90);
        case Digit:            return (char)RandomNumber(48, 57);
        case SpecialCharacter: return (char)RandomNumber(33, 47);
        default:               return (char)RandomNumber(65, 90);
        }
    }

    static string GenerateWord(enCharType CharType, short Length)
    {
        string Word;
        for (int i = 0; i < Length; i++) Word += GetRandomCharacter(CharType);
        return Word;
    }

    static string GenerateKey(enCharType CharType = CapitalLetter)
    {
        return GenerateWord(CharType, 4) + "-" + GenerateWord(CharType, 4) + "-" +
               GenerateWord(CharType, 4) + "-" + GenerateWord(CharType, 4);
    }

    // A long random token for sessions.
    static string GenerateToken(size_t Bytes = 32)
    {
        static const char* hex = "0123456789abcdef";
        string t;
        for (size_t i = 0; i < Bytes; i++)
        {
            int v = RandomNumber(0, 255);
            t += hex[v >> 4]; t += hex[v & 15];
        }
        return t;
    }

    // ---------- 5-layer cipher ----------
    // 1 XOR cipher   2 random padding   3 case inversion   4 nested XOR   5 hexadecimal
    static string EncryptText(const string& Text)
    {
        if (Text.empty()) return "";
        const string k1 = KEY1, k2 = KEY2;
        vector<uint8_t> p(Text.size() * 2);
        for (size_t i = 0; i < Text.size(); i++)
        {
            p[2 * i] = (uint8_t)Text[i] ^ (uint8_t)k1[i % k1.size()];          // 1
            p[2 * i + 1] = (uint8_t)RandomNumber(33, 126);                     // 2
        }
        string out;
        static const char* hex = "0123456789abcdef";
        for (size_t i = 0; i < p.size(); i++)
        {
            uint8_t c = _InvertCase(p[i]);                                     // 3
            uint8_t n = c ^ (uint8_t)k2[i % k2.size()] ^ (uint8_t)(i & 255);   // 4
            out += hex[n >> 4]; out += hex[n & 15];                            // 5
        }
        return out;
    }

    // Returns "" when the text is not valid cipher output.
    static string DecryptText(const string& Text)
    {
        if (Text.empty() || Text.size() % 4 != 0) return "";
        const string k1 = KEY1, k2 = KEY2;
        auto nib = [](char c) -> int {
            if (c >= '0' && c <= '9') return c - '0';
            if (c >= 'a' && c <= 'f') return c - 'a' + 10;
            if (c >= 'A' && c <= 'F') return c - 'A' + 10;
            return -1;
        };
        string out;
        for (size_t i = 0; i < Text.size() / 2; i++)
        {
            int hi = nib(Text[2 * i]), lo = nib(Text[2 * i + 1]);
            if (hi < 0 || lo < 0) return "";
            uint8_t n = (uint8_t)((hi << 4) | lo);
            uint8_t c = n ^ (uint8_t)k2[i % k2.size()] ^ (uint8_t)(i & 255);   // 4
            uint8_t p = _InvertCase(c);                                        // 3
            if (i % 2 == 0) out += (char)(p ^ (uint8_t)k1[(i / 2) % k1.size()]); // 2, 1
        }
        return out;
    }

    // ---------- number to words ----------
    static string NumberToText(long long Number)
    {
        if (Number < 0) Number = -Number;
        if (Number == 0) return "Zero";
        static const char* ones[] = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
        static const char* tens[] = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };
        auto below1000 = [&](long long x, vector<string>& w) {
            if (x >= 100) { w.push_back(ones[x / 100]); w.push_back("Hundred"); x %= 100; }
            if (x >= 20) { w.push_back(tens[x / 10]); x %= 10; }
            if (x > 0) w.push_back(ones[x]);
        };
        struct Scale { long long size; const char* name; };
        const Scale scales[] = { {1000000000000LL, "Trillion"}, {1000000000LL, "Billion"}, {1000000LL, "Million"}, {1000LL, "Thousand"} };
        vector<string> words;
        for (const Scale& s : scales)
            if (Number >= s.size) { below1000(Number / s.size, words); words.push_back(s.name); Number %= s.size; }
        below1000(Number, words);
        string out;
        for (size_t i = 0; i < words.size(); i++) out += (i ? " " : "") + words[i];
        return out;
    }
};

#include <chrono>
inline uint64_t clsUtil::chrono_seed()
{
    return (uint64_t)chrono::high_resolution_clock::now().time_since_epoch().count();
}
