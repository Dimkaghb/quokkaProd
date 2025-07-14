# Direct test of API endpoints
Write-Host "Testing API endpoints directly..." -ForegroundColor Green

# Test /api/test endpoint
Write-Host "`nTesting /api/test endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/test" -Method GET -ErrorAction Stop
    Write-Host "✅ /api/test - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ /api/test - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test /api/auth/me endpoint
Write-Host "`nTesting /api/auth/me endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/me" -Method GET -ErrorAction Stop
    Write-Host "✅ /api/auth/me - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ /api/auth/me - Status: 401 (Unauthorized - expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ /api/auth/me - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test old endpoint without /api prefix
Write-Host "`nTesting old /auth/me endpoint (should fail):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/auth/me" -Method GET -ErrorAction Stop
    Write-Host "❌ /auth/me - Status: $($response.StatusCode) (should not work)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ /auth/me - Status: 404 (Not Found - expected, old endpoint disabled)" -ForegroundColor Green
    } else {
        Write-Host "❌ /auth/me - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n✅ Direct API testing completed!" -ForegroundColor Green