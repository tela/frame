BINARY = frame
CMD = ./cmd/frame
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS = -ldflags "-X main.version=$(VERSION)"
DRIVE ?= /Volumes/FRAME

.PHONY: build build-mac-arm build-mac-amd build-linux-amd build-linux-arm \
        dev dev-ui test clean ui deploy smoke

# === Build ===

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

ui:
	cd ui && pnpm install --frozen-lockfile && pnpm run build

# === Development ===

dev:
	@mkdir -p .dev
	go build $(LDFLAGS) -o $(BINARY) $(CMD) && ./$(BINARY) --root .dev --port 7890

dev-seed:
	@mkdir -p .dev
	go run $(CMD) seed --root .dev

dev-ui:
	cd ui && pnpm run dev

test:
	go test ./pkg/...

test-integration:
	go test ./tests/integration/ -v

test-all:
	go test ./...

smoke:
	./$(BINARY) smoke

clean:
	rm -f $(BINARY) $(BINARY)-*

# === Deployment ===

deploy: _check-drive build
	@echo "Deploying Frame $(VERSION) to $(DRIVE)..."
	@mkdir -p "$(DRIVE)/bin"
	@cp $(BINARY) "$(DRIVE)/bin/frame"
	@chmod +x "$(DRIVE)/bin/frame"
	@mkdir -p "$(DRIVE)/frame/cache/thumbs"
	@mkdir -p "$(DRIVE)/assets/source/incoming"
	@mkdir -p "$(DRIVE)/assets/source/managed/characters"
	@mkdir -p "$(DRIVE)/assets/source/managed/pool"
	@mkdir -p "$(DRIVE)/assets/generated/characters"
	@mkdir -p "$(DRIVE)/models/lora"
	@mkdir -p "$(DRIVE)/models/ipadapter"
	@mkdir -p "$(DRIVE)/models/voice"
	@mkdir -p "$(DRIVE)/models/llm"
	@if [ ! -f "$(DRIVE)/frame/frame.toml" ]; then \
		echo '# Frame configuration' > "$(DRIVE)/frame/frame.toml"; \
		echo 'port = 7890' >> "$(DRIVE)/frame/frame.toml"; \
		echo '' >> "$(DRIVE)/frame/frame.toml"; \
		echo '# Bifrost integration (image generation)' >> "$(DRIVE)/frame/frame.toml"; \
		echo 'bifrost_url = "http://localhost:9090"' >> "$(DRIVE)/frame/frame.toml"; \
		echo '' >> "$(DRIVE)/frame/frame.toml"; \
		echo '# Fig integration (character publishing)' >> "$(DRIVE)/frame/frame.toml"; \
		echo 'fig_url = "http://localhost:7700"' >> "$(DRIVE)/frame/frame.toml"; \
		echo "Created $(DRIVE)/frame/frame.toml"; \
	fi
	@echo ""
	@echo "=== Deploy complete ==="
	@echo "Binary:  $(DRIVE)/bin/frame ($(VERSION))"
	@echo "Config:  $(DRIVE)/frame/frame.toml"
	@echo "DB:      $(DRIVE)/frame/frame.db (created on first run)"
	@echo "Assets:  $(DRIVE)/assets/"
	@echo ""
	@echo "To start:  cd $(DRIVE)/frame && ../bin/frame"
	@echo "To stop:   frame stop"

_check-drive:
	@if [ ! -d "$(DRIVE)" ]; then \
		echo "Error: $(DRIVE) does not exist or is not mounted"; \
		exit 1; \
	fi
