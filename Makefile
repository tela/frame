BINARY = frame
CMD = ./cmd/frame
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS = -ldflags "-X main.version=$(VERSION)"

.PHONY: build build-mac-arm build-mac-amd build-linux-amd build-linux-arm dev dev-ui test clean ui

build: ui
	go build $(LDFLAGS) -o $(BINARY) $(CMD)

build-mac-arm: ui
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY)-darwin-arm64 $(CMD)

build-mac-amd: ui
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY)-darwin-amd64 $(CMD)

build-linux-amd: ui
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BINARY)-linux-amd64 $(CMD)

build-linux-arm: ui
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BINARY)-linux-arm64 $(CMD)

dev:
	go build $(LDFLAGS) -o $(BINARY) $(CMD) && ./$(BINARY) --root .

dev-ui:
	cd ui && pnpm run dev

test:
	go test ./...

clean:
	rm -f $(BINARY) $(BINARY)-*

ui:
	cd ui && pnpm install --frozen-lockfile && pnpm run build
