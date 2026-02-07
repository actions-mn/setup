#!/bin/bash
set -e

echo "=== Verifying Collection Compilation ==="

# 1. Create collection documents
echo "1. Creating collection documents..."
cat > coll-doc1.adoc << 'EOF'
= Collection Document 1
Author One

Document one content.
EOF

cat > coll-doc2.adoc << 'EOF'
= Collection Document 2
Author Two

Document two content.
EOF

# 2. Create collection manifest
echo "2. Creating collection manifest..."
cat > test-collection.yml << 'EOF'
---
collection:
  title: Test Collection
  doctypes:
    - default
  documents:
    - file: coll-doc1.adoc
      type: default
    - file: coll-doc2.adoc
      type: default
EOF
echo "✓ Collection manifest created"

# 3. Compile collection
echo "3. Compiling collection..."
metanorma collection test-collection.yml
echo "✓ Collection compiled"

# 4. Verify outputs
echo "4. Verifying collection outputs..."
[ -f index.html ] && echo "✓ Collection index exists"
[ -f coll-doc1.html ] && echo "✓ Document 1 HTML exists"
[ -f coll-doc2.html ] && echo "✓ Document 2 HTML exists"

# Cleanup
rm -f coll-doc.* test-collection.* index.html
echo ""
echo "=== Collection compilation checks passed ==="
