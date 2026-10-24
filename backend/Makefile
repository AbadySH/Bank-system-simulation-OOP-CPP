# Bank system simulation - backend
#   make          build ./bank-server
#   make test     build and run the core class tests
#   make run      build and start the server (from the project root, so the frontend is found)
#   make clean
CXX      ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -pthread
HEADERS  := $(shell find src -name '*.h') third_party/httplib.h third_party/nlohmann/json.hpp

bank-server: src/main.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -o $@ src/main.cpp

core_tests: tests/core_tests.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -o $@ tests/core_tests.cpp

test: core_tests
	./core_tests

run: bank-server
	cd .. && ./backend/bank-server

seed:
	cd .. && python3 tools/make_seed_header.py

clean:
	rm -f bank-server core_tests

.PHONY: test run seed clean
