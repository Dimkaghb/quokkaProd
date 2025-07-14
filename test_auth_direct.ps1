Write-Host "Testing auth endpoints directly..."

# Test /auth/signup
try {
    $signupBody = @{
        username = "testuser123"
        password = "testpass123"
    } | ConvertTo-Json
    
    Write-Host "Testing /auth/signup..."
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/auth/signup' -Method POST -Body $signupBody -ContentType 'application/json'
    Write-Host "✅ Signup successful: $($response | ConvertTo-Json)"
} catch {
    Write-Host "❌ Signup failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode"
    }
}

# Test /auth/login
try {
    $loginBody = @{
        email = "testuser123"
        password = "testpass123"
    } | ConvertTo-Json
    
    Write-Host "Testing /auth/login..."
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    Write-Host "✅ Login successful: $($response | ConvertTo-Json)"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode"
    }
}