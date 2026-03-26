#!/bin/bash
# Install Git hooks for Frame development.
# Run once: bash scripts/install-hooks.sh

HOOK_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

# Pre-push hook: runs all tests before pushing
cat > "$HOOK_DIR/pre-push" << 'HOOK'
#!/bin/bash
echo "Running tests before push..."
make test-all
if [ $? -ne 0 ]; then
    echo ""
    echo "Tests failed. Push aborted."
    echo "Run 'make test-all' to see failures."
    exit 1
fi
echo "All tests passed."
HOOK

chmod +x "$HOOK_DIR/pre-push"
echo "Installed pre-push hook: runs 'make test-all' before every push"
