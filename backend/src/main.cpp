// Bank system simulation (OOP) — backend. Starts the HTTP server that the web frontend talks to.
// Educational simulation only: no real money, no real security.
#include <csignal>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <vector>
#include "api/clsApiServer.h"
using namespace std;

static clsApiServer* g_Server = nullptr;
static void OnSignal(int) { if (g_Server) g_Server->Stop(); }

static void PrintHelp()
{
    cout << "Bank system simulation - backend\n\n"
            "Usage: bank-server [options]\n\n"
            "  --port <n>            Port to listen on (default 8080)\n"
            "  --host <address>      Address to bind (default 127.0.0.1, this computer only; 0.0.0.0 = everyone on the network)\n"
            "  --data <folder>       Folder for the record files (default ./data, created and filled on first run)\n"
            "  --frontend <folder>   Folder with the web pages to serve (default: ./frontend or ../frontend if found)\n"
            "  --no-frontend         API only\n"
            "  --cors-origin <url>   Allow a frontend hosted elsewhere, e.g. http://localhost:5500\n"
            "  --no-demo             Don't offer the sample accounts on the sign-in page\n"
            "  --reset               Restore the sample data before starting\n"
            "  -h, --help            Show this help\n";
}

int main(int argc, char** argv)
{
    clsApiServer::Options opt;
    string dataDir = "data", frontend;
    bool noFrontend = false, reset = false;

    for (int i = 1; i < argc; i++)
    {
        string a = argv[i];
        auto next = [&](const char* name) -> string {
            if (i + 1 >= argc) { cerr << "Missing value for " << name << "\n"; exit(2); }
            return argv[++i];
        };
        if (a == "-h" || a == "--help") { PrintHelp(); return 0; }
        else if (a == "--port") { opt.Port = atoi(next("--port").c_str()); if (opt.Port < 1 || opt.Port > 65535) { cerr << "Port must be 1-65535\n"; return 2; } }
        else if (a == "--host") opt.Host = next("--host");
        else if (a == "--data") dataDir = next("--data");
        else if (a == "--frontend") frontend = next("--frontend");
        else if (a == "--no-frontend") noFrontend = true;
        else if (a == "--cors-origin") opt.CorsOrigin = next("--cors-origin");
        else if (a == "--no-demo") opt.DemoAccounts = false;
        else if (a == "--reset") reset = true;
        else { cerr << "Unknown option: " << a << "\n\n"; PrintHelp(); return 2; }
    }

    /* Find the frontend folder: first next to where you started, then by walking up from the program's own
       folder. That way it also works when an IDE starts the program from a build folder. */
    bool dataGiven = dataDir != "data";
    if (!noFrontend && frontend.empty())
    {
        vector<filesystem::path> starts = { filesystem::current_path() };
        try { starts.push_back(filesystem::absolute(argv[0]).parent_path()); } catch (...) {}
        for (auto dir : starts)
            for (int up = 0; up < 8 && frontend.empty(); up++, dir = dir.parent_path())
            {
                if (filesystem::exists(dir / "frontend" / "index.html")) { frontend = (dir / "frontend").string(); if (!dataGiven) dataDir = (dir / "data").string(); }
                if (dir == dir.parent_path()) break;
            }
    }
    opt.FrontendDir = noFrontend ? "" : frontend;

    try
    {
        Global::DataDir() = dataDir;
        if (reset) clsStorage::ResetAll(); else clsStorage::EnsureSeeded();
    }
    catch (const exception& e)
    {
        cerr << "Error: could not prepare the data folder \"" << dataDir << "\": " << e.what() << "\n";
        return 1;
    }

    clsApiServer server(opt);
    g_Server = &server;
    signal(SIGINT, OnSignal);
    signal(SIGTERM, OnSignal);

    cout << "Bank system simulation (educational - not real money)\n"
         << "  data folder : " << filesystem::absolute(dataDir).string() << "\n"
         << "  frontend    : " << (opt.FrontendDir.empty() ? "(not served - API only)" : filesystem::absolute(opt.FrontendDir).string()) << "\n"
         << "  listening   : http://" << opt.Host << ":" << opt.Port << "/\n";
    if (opt.DemoAccounts) cout << "  demo accounts are shown on the sign-in page (start with --no-demo to hide them)\n";
    if (opt.Host != "127.0.0.1" && opt.Host != "localhost") cout << "  note: reachable from other computers. Use this only on a network you trust.\n";
    cout << "  press Ctrl+C to stop\n" << flush;

    return server.Run() ? 0 : 1;
}
