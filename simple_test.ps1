$body = @{
    username = "testuser"
    password = "testpass123"
} | ConvertTo-Json

Write-Host "Testing auth endpoints..."

try {
    Write-Host "1. Testing /auth/signup"
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/auth/signup' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "✅ Signup successful"
} catch {
    Write-Host "❌ Signup failed: $($_.Exception.Message)"
}

try {
    Write-Host "2. Testing /auth/login"
    $loginBody = @{
        email = "testuser"
        password = "testpass123"
    } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    Write-Host "✅ Login successful"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
}

try {
    Write-Host "3. Testing /debug/routes"
    $routes = Invoke-RestMethod -Uri 'http://localhost:8000/debug/routes' -Method GET
    Write-Host "Available routes:"
    $routes.routes | ForEach-Object { Write-Host "  $($_.path) [$($_.methods -join ', ')]" }
} catch {
    Write-Host "❌ Routes check failed: $($_.Exception.Message)"
}