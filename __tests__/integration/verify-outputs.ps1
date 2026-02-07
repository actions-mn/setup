# Verification script for Windows
Write-Host "=== Verifying Metanorma Installation (Windows) ===" -ForegroundColor Cyan

# 1. Command availability
Write-Host "1. Checking command availability..." -ForegroundColor Yellow
$metanormaPath = Get-Command metanorma -ErrorAction SilentlyContinue
if ($metanormaPath) {
    Write-Host "✓ metanorma found at: $($metanormaPath.Source)" -ForegroundColor Green
} else {
    Write-Host "✗ metanorma not found in PATH" -ForegroundColor Red
    exit 1
}

# 2. Version check
Write-Host "2. Checking version..." -ForegroundColor Yellow
metanorma version
Write-Host "✓ Version command successful" -ForegroundColor Green

# 3. Ruby environment
Write-Host "3. Checking Ruby environment..." -ForegroundColor Yellow
ruby --version
gem --version
Write-Host "✓ Ruby environment OK" -ForegroundColor Green

# 4. Create and compile test document
Write-Host "4. Creating test document..." -ForegroundColor Yellow
@"
= Windows Test Document
Test Author

== Test Section

This document tests Metanorma on Windows.
"@ | Out-File -Encoding UTF8 test-windows.adoc

Write-Host "✓ Test document created" -ForegroundColor Green

# 5. Compile document
Write-Host "5. Compiling document..." -ForegroundColor Yellow
metanorma compile test-windows.adoc

# 6. Verify outputs
Write-Host "6. Verifying outputs..." -ForegroundColor Yellow
$outputs = @("test-windows.xml", "test-windows.html", "test-windows.doc")
foreach ($output in $outputs) {
    if (Test-Path $output) {
        $size = (Get-Item $output).Length
        Write-Host "✓ $output exists ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "✗ $output not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== All Windows checks passed ===" -ForegroundColor Green

# Cleanup
Remove-Item test-windows.*
