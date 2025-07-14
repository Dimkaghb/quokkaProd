try {
    $body = @{
        username = "testuser"
        password = "testpass123"
    } | ConvertTo-Json
    
    Write-Host "Testing /auth/signup endpoint..."
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/auth/signup' -Method POST -Body $body -ContentType 'application/json'
    Write-Host "✅ Registration successful: $($response | ConvertTo-Json)"
} catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    }
}