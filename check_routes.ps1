Write-Host "Checking available routes..."

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:8000/debug/routes' -Method GET
    Write-Host "Auth available: $($response.auth_available)"
    Write-Host "New modules available: $($response.new_modules_available)"
    Write-Host "\nAvailable routes:"
    
    foreach ($route in $response.routes) {
        $methods = $route.methods -join ','
        Write-Host "  [$methods] $($route.path)"
    }
    
    # Check specifically for auth routes
    $authRoutes = $response.routes | Where-Object { $_.path -like "*/auth/*" }
    if ($authRoutes.Count -gt 0) {
        Write-Host "\n✅ Auth routes found:"
        foreach ($route in $authRoutes) {
            $methods = $route.methods -join ','
            Write-Host "  [$methods] $($route.path)"
        }
    } else {
        Write-Host "\n❌ No auth routes found"
    }
    
} catch {
    Write-Host "Failed to get routes: $($_.Exception.Message)"
}