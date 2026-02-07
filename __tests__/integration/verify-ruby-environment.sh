#!/bin/bash
set -e

echo "=== Verifying Ruby Environment ==="

# 1. Ruby version
echo "1. Checking Ruby installation..."
ruby --version
echo "✓ Ruby is available"

# 2. Gem command
echo "2. Checking gem command..."
gem --version
echo "✓ Gem command is available"

# 3. Metanorma gems
echo "3. Checking Metanorma gems..."
gem list metanorma | grep -q metanorma || { echo "✗ metanorma gem not found"; exit 1; }
echo "✓ metanorma gem installed"

# 4. Key dependencies
echo "4. Checking key dependencies..."
REQUIRED_GEMS=("asciidoctor" "isodoc" "metanorma-cli")
for gem_name in "${REQUIRED_GEMS[@]}"; do
  gem list "$gem_name" -i > /dev/null && echo "✓ $gem_name is installed" || { echo "✗ $gem_name not found"; exit 1; }
done

echo ""
echo "=== Ruby environment checks passed ==="
