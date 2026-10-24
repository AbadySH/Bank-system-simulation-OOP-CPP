#pragma once
// Global — settings shared by the whole program (the console version kept CurrentUser here;
// on a server every request has its own signed-in user, so that lives in the API layer instead).
#include <string>
using namespace std;

struct Global
{
    // Folder that holds the record files. Set once at start-up (see main.cpp).
    static string& DataDir() { static string dir = "data"; return dir; }
};
