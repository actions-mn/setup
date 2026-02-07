#!/bin/bash
set -e

echo "=== Verifying Document Compilation ==="

# 1. Create test document
echo "1. Creating test document..."
cat > test-document.adoc << 'EOF'
= Integration Test Document
Test Author <test@example.com>
v1.0, $(date +%Y-%m-%d)

== Purpose

This document verifies that Metanorma can compile documents correctly.

== Test Section

Verify compilation produces all expected output formats.

=== Subsection

Nested content test.

== Requirements

=== Requirement 1

The system shall compile AsciiDoc to XML.

=== Requirement 2

The system shall generate HTML output.

=== Requirement 3

The system shall support Word output.

== Bibliography

* [[[ref1,1]]], Test Reference, Example Org, 2025
EOF
echo "✓ Test document created"

# 2. Compile document
echo "2. Compiling document..."
metanorma compile test-document.adoc
echo "✓ Compilation successful"

# 3. Verify outputs
echo "3. Verifying output files..."

OUTPUTS=("test-document.xml" "test-document.html" "test-document.doc")
for output in "${OUTPUTS[@]}"; do
  if [ -f "$output" ]; then
    size=$(wc -c < "$output")
    echo "✓ $output exists ($size bytes)"
  else
    echo "✗ $output not found"
    exit 1
  fi
done

# 4. Verify XML structure
echo "4. Verifying XML structure..."
if command -v xmllint &> /dev/null; then
  xmllint --noout test-document.xml && echo "✓ XML is well-formed"
else
  echo "⚠ xmllint not available, skipping XML validation"
fi

# 5. Check for expected elements
echo "5. Checking for expected content..."
grep -q "Integration Test Document" test-document.xml && echo "✓ Title found in XML"
grep -q "Test Section" test-document.xml && echo "✓ Section found in XML"
grep -q "Requirement 1" test-document.xml && echo "✓ Requirement found in XML"

echo ""
echo "=== Document compilation checks passed ==="

# Cleanup
rm -f test-document.*
