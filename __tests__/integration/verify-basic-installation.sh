#!/bin/bash
set -e

echo "=== Verifying Basic Metanorma Installation ==="

# 1. Command availability
echo "1. Checking command availability..."
command -v metanorma || { echo "✗ metanorma not found in PATH"; exit 1; }
echo "✓ metanorma found at: $(which metanorma)"

# 2. Version check
echo "2. Checking version..."
metanorma --version
echo "✓ Version command successful"

# 3. Help command
echo "3. Checking help output..."
metanorma help > /dev/null
echo "✓ Help command successful"

# 4. List doctypes
echo "4. Checking supported doctypes..."
metanorma list-doctypes > /dev/null
echo "✓ Doctypes listing successful"

# 5. List extensions
echo "5. Checking supported extensions..."
metanorma list-extensions > /dev/null
echo "✓ Extensions listing successful"

echo ""
echo "=== All basic installation checks passed ==="
