# Test API routes with /api prefix
Write-Host "Testing API routes with /api prefix..." -ForegroundColor Green

# Test auth endpoints
Write-Host "`nTesting auth endpoints:" -ForegroundColor Yellow
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

# Test data analysis endpoints
Write-Host "`nTesting data analysis endpoints:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/agents" -Method GET -ErrorAction Stop
    Write-Host "✅ /api/agents - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ /api/agents - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test documents endpoints
Write-Host "`nTesting documents endpoints:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/documents" -Method GET -ErrorAction Stop
    Write-Host "✅ /api/documents - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ /api/documents - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test chat endpoints
Write-Host "`nTesting chat endpoints:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/chat/threads" -Method GET -ErrorAction Stop
    Write-Host "✅ /api/chat/threads - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ /api/chat/threads - Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test debug routes endpoint
Write-Host "`nTesting debug routes:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/debug/routes" -Method GET -ErrorAction Stop
    $routes = $response.Content | ConvertFrom-Json
    
    Write-Host "Available routes:" -ForegroundColor Cyan
    $apiRoutes = $routes | Where-Object { $_.path -like "/api/*" }
    
    if ($apiRoutes.Count -gt 0) {
        Write-Host "✅ API routes found:" -ForegroundColor Green
        foreach ($route in $apiRoutes) {
            Write-Host "  [$($route.methods -join ', ')] $($route.path)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ No API routes found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ /debug/routes - Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ API routes testing completed!" -ForegroundColor Green