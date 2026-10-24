#pragma once
// clsDate — date helpers. The record files keep the original "d/m/yyyy - h:m:s" format.
#include <cstdio>
#include <ctime>
#include <string>
using namespace std;

class clsDate
{
private:
    static tm _LocalTime(time_t t)
    {
        tm out{};
#ifdef _WIN32
        localtime_s(&out, &t);
#else
        localtime_r(&t, &out);
#endif
        return out;
    }

public:
    static string GetSystemDateTimeString()
    {
        tm n = _LocalTime(time(nullptr));
        char buf[64];
        snprintf(buf, sizeof buf, "%d/%d/%d - %d:%d:%d", n.tm_mday, n.tm_mon + 1, n.tm_year + 1900, n.tm_hour, n.tm_min, n.tm_sec);
        return buf;
    }

    // "22/10/2026 15:29:02" — padded, for people to read (receipts).
    static string GetSystemDateTimeDisplay()
    {
        tm n = _LocalTime(time(nullptr));
        char buf[64];
        snprintf(buf, sizeof buf, "%02d/%02d/%04d %02d:%02d:%02d", n.tm_mday, n.tm_mon + 1, n.tm_year + 1900, n.tm_hour, n.tm_min, n.tm_sec);
        return buf;
    }

    static string GetSystemDateString()
    {
        tm n = _LocalTime(time(nullptr));
        char buf[32];
        snprintf(buf, sizeof buf, "%d/%d/%d", n.tm_mday, n.tm_mon + 1, n.tm_year + 1900);
        return buf;
    }

    // "18/6/2026 - 4:5:28" -> true when that day is today.
    static bool IsToday(const string& DateTime)
    {
        int d, m, y, h, mi, s;
        if (sscanf(DateTime.c_str(), "%d/%d/%d - %d:%d:%d", &d, &m, &y, &h, &mi, &s) != 6) return false;
        tm n = _LocalTime(time(nullptr));
        return d == n.tm_mday && m == n.tm_mon + 1 && y == n.tm_year + 1900;
    }
};
