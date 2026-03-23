BINARY = frame
CMD = ./cmd/frame
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS = -ldflags "-X main.version=$(VERSION)"

.PHONY: build build-mac-arm build-mac-amd build-linux-amd build-linux-arm dev test clean ui

build:
	go build $(LDFLAGS) -o $(BINARY) $(CMD)

build-mac-arm:
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY)-darwin-arm64 $(CMD)

build-mac-amd:
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY)-darwin-amd64 $(CMD)

build-linux-amd:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY)-linux-amd64 $(CMD)

build-linux-arm:
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY)-linux-arm64 $(CMD)

dev:
	go build $(LDFLAGS) -o $(BINARY) $(CMD) && ./$(BINARY) --root .

test:
	go test ./...

clean:
	rm -f $(BINARY) $(BINARY)-*

ui:
	@echo "Frontend build not yet configured"
