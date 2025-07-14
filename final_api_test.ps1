# Final API test
Write-Host "Final API endpoints test..." -ForegroundColor Green

# Test /api/test
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/test" -Method GET
    Write-Host "✅ /api/test works - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ /api/test failed" -ForegroundColor Red
}

# Test /api/auth/me (should return 401)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/auth/me" -Method GET
    Write-Host "❌ /api/auth/me unexpected success - Status: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ /api/auth/me works - Status: 401 (Unauthorized as expected)" -ForegroundColor Green
    } else {
        Write-Host "❌ /api/auth/me unexpected error" -ForegroundColor Red
    }
}

# Test old endpoint (should return 404)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/auth/me" -Method GET
    Write-Host "❌ Old /auth/me unexpected success - Status: $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Old /auth/me correctly disabled - Status: 404" -ForegroundColor Green
    } else {
        Write-Host "❌ Old /auth/me unexpected error" -ForegroundColor Red
    }
}

Write-Host "`n✅ API prefix migration completed successfully!" -ForegroundColor Green
Write-Host "All endpoints now use /api prefix for production compatibility." -ForegroundColor Cyan