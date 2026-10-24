# 🏦 Bank system simulation (OOP) – C++ Backend + Web Frontend

<div align="center">

![C++](https://img.shields.io/badge/C++-17-blue?style=for-the-badge&logo=cplusplus)
![OOP](https://img.shields.io/badge/Object--Oriented-Programming-green?style=for-the-badge)
![API](https://img.shields.io/badge/REST-JSON%20API-purple?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-5--Layer%20Encryption-red?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-orange?style=for-the-badge&logo=googlechrome)
![Educational](https://img.shields.io/badge/Purpose-Educational%20Only-yellow?style=for-the-badge)

</div>

---

## 📝 Introduction

A **Bank system simulation** whose logic is written in **C++ (OOP)** and whose screen is a modern **web interface**. It keeps the exact idea and class design of the original console project (`clsBankClient`, `clsUser`, `clsCurrency`, `clsPerson` …) and replaces the black terminal with a complete **user experience**: a sign-in page, a navigation sidebar, forms with live validation, confirmation dialogs, receipts and responsive tables.

The program is split in two, the way real applications are:

- **`backend/`** – a C++17 program: the original classes + a small HTTP server that exposes them as a JSON API. It owns the rules, the permissions and the record files.
- **`frontend/`** – plain HTML, CSS and JavaScript. It only shows what the server sends and asks the server to do things.

> ⚠️ **Important Notice:** This project is a **simulation** built **strictly for educational purposes**. It is not intended for real-world banking, financial transactions, or production environments. Nothing here is real money.

> **Created by:** GitHub [@AbadySH](https://github.com/AbadySH)
>
> Based on the original console project: [AbadySH/Bank-system-simulation-OOP-](https://github.com/AbadySH/Bank-system-simulation-OOP-)

---

## 🖥️ Why This Edition Exists

The original program runs in a black terminal: numbered menus, text prompts and plain-text tables. It works, but every step is typed blind and every mistake means starting the question again.

### Why this version exists

The business logic was already good. What was missing was the experience around it. This edition keeps **the same classes, the same rules and the same record-file format** in C++, and changes only how people use them.

### Changes Made

- ✅ Kept the **C++ OOP core** and moved it behind a REST API (`backend/`)
- ✅ Replaced the terminal with a full web interface in its own folder (`frontend/`, no frameworks, no build step)
- ✅ Replaced numbered menus with a sidebar, an overview page and deep-linkable screens
- ✅ Replaced typed prompts with forms that check each field as you type (and again on the server)
- ✅ Replaced `y/n?` questions with confirmation dialogs that say exactly what will happen
- ✅ Replaced printed tables with searchable tables that become cards on a phone
- ✅ Kept the original permission bit flags (1, 2, 4, 8 …) and the `#//#` record format
- ✅ Every permission is **enforced on the server**, not just hidden in the browser
- ✅ Tested at three levels: 104 C++ class checks, 62 API checks, 57 browser checks

### Compatibility

| Part | Needs |
|---|---|
| Backend | A C++17 compiler (`g++` 8+ / `clang++` / MSVC) and `make` (or CMake). No other install: the two header-only libraries are included in `backend/third_party/` |
| Frontend | Any modern browser: Chrome / Edge, Safari, Firefox (desktop and phone) |
| Light and dark mode | ✅ Follows the system setting |

---

## 📁 Data Files (File Handling)

The server keeps the same record files as the console version, with the same names and the same line format, in a `data/` folder next to where you start it. There are **no absolute paths to edit** before running.

| File Name | Purpose |
|---|---|
| `ClientFile.txt` | Stores encrypted client account information (CRUD operations) |
| `Users.txt` | Stores encrypted system user credentials and permissions |
| `Currencies.txt` | Stores the exchange rate of every currency against the US dollar |
| `LoginRecord.text` | Stores the login history of all users (Audit Trail) |
| `TransferRecord.text` | Stores detailed transfer logs (Source, Destination, Amount, etc.) |

> ⚠️ **Important:** The first time the server starts, `data/` is created and filled with the sample records from the original project (they are compiled into the program). Full-access users can download any file, or restore the sample data, from the **Data files** screen. Files are written safely (temporary file, then rename), so a crash can't leave half a file.

---

## 🚀 Main Features

### 🔐 1. Authentication & Access

- **Secure Login System:** Credential verification with a show/hide password toggle; the browser receives a session token, never a password
- **Dynamic Permissions:** Each user has specific access rights (Admin/User). Permissions are bitwise (1, 2, 4, 8, etc.) and checked by the server on every request
- **Login Tracking:** Every successful login is recorded with a timestamp and stored in `LoginRecord.text`
- **3-Trial Lock:** Three wrong attempts lock sign-in for that user name from that computer for 30 seconds, with a live countdown

### 👥 2. Client & User Management

- **Client Operations:** Full CRUD (Add, Delete, Update, Find) with encrypted storage
- **User Operations:** Complete management of system users and their security levels, with a checkbox permission picker
- **Permissions Display:** The overview page shows which screens you can open, and the sidebar marks locked ones with a padlock

### 💰 3. Banking & Transactions

- **Balance Management:** Deposit, Withdraw, and Total Balances (with the total written in words)
- **Transfer System:** Secure money transfer between accounts with real-time validation and balance checks
- **Quick & Normal Withdraw:** One-tap quick amounts ($20 to $1,000) or any amount you type

### 🌍 4. Currency Exchange System

- **Live-Style Rates:** View currency rates relative to the USD
- **Currency Finder:** Search for any currency by code or country
- **Currency Calculator:** Instant conversions between any two currencies, updated as you type

### 🛡️ 5. Security & Logs (Audit Trail)

- **User Move Tracking:** The system records every login and every transfer, with the user who made it
- **Logs Viewer:** Clean, filterable tables for admins to review all system activities (Login Register & Transfer Log)

---

## 🏗️ Organized Code Structure (Layered Architecture)

- **Layered Architecture (Core, API, Lib / Frontend):** Clear separation of concerns for maintainability
- **Inheritance:** `clsBankClient` and `clsUser` inherit from `clsPerson`; every web screen inherits from a base `clsScreen`
- **Robust Input Validation System:** The `clsInputValidate` class checks every field on the server and returns one clear message per field
- **One error format:** every failure leaves the server as `{ "error": { "code", "message", "fields" } }`

## 💰 Financial & Banking Operations

- **Quick & Normal Withdraw Logic:** Prevents overdrafts with clear inline messages
- **Deposit System with Instant Balance Update:** Shows the balance before and after, then reflects it immediately
- **Professional Formatted Tables:** All data is displayed in clean, searchable, well-structured tables
- **One request at a time:** the server handles requests one after another, so two people can't overwrite each other's balance

## 🧾 Automatic Receipts System

- **Automatic Receipts Generation:** Every successful deposit, withdrawal and transfer produces a printable receipt, numbered by the server
- **External File Storage (File Handling):** Uses the same record files for all persistent storage
- **Detailed Transaction Logging:** Every financial move is logged with timestamps and amounts

## 🎨 User Interface

- **Light & Dark Support:** A calm banknote-inspired palette that follows your system setting
- **Modular Navigation:** A sidebar with collapsible groups, plus an overview page
- **Responsive Design:** Works on desktop, tablet and phone; tables turn into cards on small screens
- **Accessible by Default:** Keyboard friendly, visible focus, labelled controls, and reduced-motion respected

## 🔐 Encryption Engine (5-Layers)

The system protects sensitive data at rest (client PINs and user passwords) using a custom-built cryptographic logic, implemented in C++ (`clsUtil`):

1. **XOR Cipher** (Initial encryption)
2. **Random Padding** (Noise injection)
3. **Case Inversion** (Casing flip)
4. **Nested XOR** (Double security)
5. **Hexadecimal** (Final storage format)

> This is a learning exercise in layering ideas. It is **not** real security, and must never be used to protect real data. The server also speaks plain HTTP and keeps sessions in memory; a real bank would use HTTPS and a real database.

---

## 🔌 API Overview

All requests and answers are JSON. After `POST /api/auth/login`, send `Authorization: Bearer <token>`.

| Area | Endpoints | Needs |
|---|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/demo-accounts` | – |
| Overview | `GET /api/overview` | any user (shows only what your access covers) |
| Clients | `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/:account` | List / Add / Update / Delete / Find |
| Transactions | `POST /api/transactions/deposit`, `/withdraw`, `/transfer`; `GET /balances`, `/transfers` | Transactions |
| Currencies | `GET /api/currencies`, `GET /lookup?code=` or `?country=`, `POST /convert`, `PUT /:code` | Currency exchange |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/:name`, `GET /api/login-register` | Manage users / Login register |
| Data files | `GET /api/data/files`, `GET /api/data/files/:name`, `POST /api/data/reset` | Full access |

---

## 📂 Project Structure

```text
Bank-system-simulation-OOP/
├── backend/                          # C++17 server
│   ├── src/
│   │   ├── main.cpp                  # Starts the server (command-line options)
│   │   ├── Global.h                  # Data folder setting
│   │   ├── SeedData.h                # Sample records compiled in (generated)
│   │   ├── core/                     # Core Business Logic
│   │   │   ├── clsPerson.h           # Base Person Class (Inheritance)
│   │   │   ├── clsBankClient.h       # Bank Client CRUD & Transactions
│   │   │   ├── clsUser.h             # User Authentication & Permissions
│   │   │   └── clsCurrency.h         # Currency Exchange Logic
│   │   ├── Lib/                      # Utility Libraries
│   │   │   ├── clsDate.h             # Date/Time manipulation
│   │   │   ├── clsString.h           # String utilities & formatting
│   │   │   ├── clsUtil.h             # Encryption, Random, & Helpers
│   │   │   ├── clsInputValidate.h    # Input validation
│   │   │   └── clsStorage.h          # Record files (read / atomic write)
│   │   └── api/
│   │       ├── clsApiCommon.h        # Errors, form checks, JSON, sessions
│   │       └── clsApiServer.h        # All routes + permission checks
│   ├── third_party/                  # cpp-httplib + nlohmann/json (MIT)
│   ├── sample-data/                  # The original record files
│   ├── tests/                        # core_tests.cpp, api_tests.py
│   ├── Makefile
│   └── CMakeLists.txt
│
├── frontend/                         # Web interface (served by the backend)
│   ├── index.html                    # Entry point
│   ├── config.js                     # Address of the API (empty = same server)
│   ├── css/styles.css                # Design system: colors, type, components
│   ├── js/
│   │   ├── lib/                      # api.js (the only fetch code), clsDate, clsInputValidate
│   │   ├── models/                   # clsPerson, clsBankClient, clsUser, clsCurrency (views of API data)
│   │   ├── core/Global.js            # Current signed-in user
│   │   ├── ui/                       # clsScreen (base), ui.js (components), router.js
│   │   ├── screens/                  # Client/, User/, Currencies/, Main, Data
│   │   └── app.js                    # Starts the app
│   └── tests/ui_smoke.py             # 57 browser checks
│
├── tools/make_seed_header.py         # Regenerates SeedData.h from the sample data
├── Makefile                          # make / make run / make test
└── README.md
```

## 🚀 Skills Applied

- ✅ **OOP Principles:** (Inheritance, Encapsulation, Polymorphism, Abstraction)
- ✅ **Software Design:** (Modular Design, Layered Architecture, Backend / Frontend separation & Clean Code)
- ✅ **API Design:** (REST routes, one error format, per-field validation messages, server-side authorization)
- ✅ **Data Persistence:** (File-style record storage with the original line format, atomic writes)
- ✅ **Security Implementation:** (Custom 5-layer encryption, permission flags, session tokens, login lock)
- ✅ **UI/UX Design:** (Forms with live validation, confirmations, receipts, responsive layout)
- ✅ **Testing:** (104 C++ checks, 62 API checks, 57 end-to-end checks in a real browser)

> 💡 *"This journey taught me that programming isn't just about working code; programming is about building a correct, scalable system from the ground up."*

---

## 📌 How to Run

1. **Clone** (or download) the repository
2. **Build and start the server** from the project folder:
   ```bash
   make run
   ```
   (or `cd backend && make`, then run `./backend/bank-server` from the project folder; with CMake: `cmake -S backend -B build && cmake --build build`)
3. **Open <http://localhost:8080>** in your browser
4. **Sign in** with one of the sample accounts (use the *Try a demo account* button on the sign-in page):

| User name | Password | Access |
|---|---|---|
| `User2` | `3456` | Full access |
| `User3`, `User4`, `User6` | `3456` | Full access |
| `User1`, `User5` | `3456` | Limited (Manage users + Login register) |

### 🪟 Windows with Visual Studio

1. Install **Visual Studio 2022** with the workload **"Desktop development with C++"** (it includes CMake).
2. Start Visual Studio, choose **File → Open → Folder…** and pick the **`backend`** folder (the one that contains `CMakeLists.txt`).
3. Wait until the *Output* window says **"CMake generation finished"**.
4. In the top toolbar, open the dropdown next to the green ▶ button and choose **`bank-server.exe`**.
5. Press the green ▶ (or **F5**). A black window opens and prints the address. **Leave it open.**
6. Open **<http://localhost:8080>** in your browser.

### ⚙️ Server options

```text
--port 8080              Port to listen on
--host 127.0.0.1         Address to bind (this computer only; 0.0.0.0 = everyone on your network)
--data ./data            Folder for the record files
--frontend ./frontend    Folder with the web pages (default: found automatically)
--no-frontend            API only
--cors-origin <url>      Allow a frontend hosted elsewhere (and set it in frontend/config.js)
--no-demo                Don't show the sample accounts on the sign-in page
--reset                  Restore the sample data before starting
```

On Windows, build with MinGW-w64 (`g++ -std=c++17 -O2 -o bank-server.exe backend/src/main.cpp -lws2_32`) or with CMake and Visual Studio.

### 🧪 Run the Tests

```bash
make test                                              # 104 checks of the C++ classes
./backend/bank-server --data /tmp/t --reset --port 8181 &
python3 backend/tests/api_tests.py http://127.0.0.1:8181   # 62 API checks (fresh data)
APP_URL=http://127.0.0.1:8181/ python3 frontend/tests/ui_smoke.py   # 57 browser checks (pip install playwright)
```

### 🔄 Start Over

Sign in as a full-access user, open **Data files**, and choose **Restore sample data** (or start the server with `--reset`).

---

## 🔎 Small Differences From the Console Version

These changes keep the idea the same while closing a few gaps found along the way:

- The login register no longer stores or shows passwords
- PIN codes and passwords are never sent to the browser at all; leave them blank in an edit form to keep the current value
- A transfer to the same account is blocked
- You can't delete the account you are signed in with
- Money amounts are rounded to cents, so `0.1 + 0.2` is exactly `0.30`
- Balances are re-read before every deposit, withdrawal and transfer, so a stale screen can't overwrite a newer balance
- Changing a currency rate applies to every country that shares that currency (for example all euro countries)
- The *Currency exchange* permission can now be granted when creating or editing a user
- The five encryption layers described above are all applied (the console code used a single shift step, and read one character past the end of the text)
- Record files live in a relative `data/` folder instead of absolute `C:\…` paths, and the transfer log has its own file path

---

## 🧩 Third-party Code

Two single-file, MIT-licensed libraries are included in `backend/third_party/` so nothing has to be installed: [cpp-httplib](https://github.com/yhirose/cpp-httplib) (HTTP server) and [nlohmann/json](https://github.com/nlohmann/json) (JSON). Their licenses are next to them.

---

## 📄 License

This project is for educational purposes only.
