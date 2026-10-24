# Bank system simulation (OOP) - C++ backend + web frontend
#   make          build the server
#   make run      build and start it, then open http://localhost:8080
#   make test     C++ class tests
#   make clean
all:
	$(MAKE) -C backend

run:
	$(MAKE) -C backend run

test:
	$(MAKE) -C backend test

clean:
	$(MAKE) -C backend clean

.PHONY: all run test clean
