# Check endpoints without /api prefix
Write-Host "Checking endpoints without /api prefix..." -ForegroundColor Green

# Test root endpoint
Write-Host "`nTesting root endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -Method GET -ErrorAction Stop
    Write-Host "OK / - Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "   Message: $($content.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR / - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test health endpoint
Write-Host "`nTesting health endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/healthz" -Method GET -ErrorAction Stop
    Write-Host "OK /healthz - Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "   Status: $($content.status)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR /healthz - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test old test endpoint
Write-Host "`nTesting old test endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/test" -Method GET -ErrorAction Stop
    Write-Host "OK /test - Status: $($response.StatusCode)" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "   Message: $($content.message)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR /test - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test debug routes endpoint
Write-Host "`nTesting debug routes endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/debug/routes" -Method GET -ErrorAction Stop
    Write-Host "OK /debug/routes - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "ERROR /debug/routes - Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "These endpoints are intentionally WITHOUT /api prefix:" -ForegroundColor White
Write-Host "  - / (root) - Welcome message" -ForegroundColor Gray
Write-Host "  - /healthz - Health check for deployment" -ForegroundColor Gray
Write-Host "  - /test - Legacy test endpoint" -ForegroundColor Gray
Write-Host "  - /debug/routes - Debug information" -ForegroundColor Gray
Write-Host "  - /check/docs - API documentation" -ForegroundColor Gray
Write-Host "  - /visualizations/ - Static files" -ForegroundColor Gray
Write-Host "`nAll business logic endpoints use /api prefix" -ForegroundColor Green