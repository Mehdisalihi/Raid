# PowerShell script to build the project safely by bypassing non-ASCII path issues
param(
    [string]$workspace = "@mohassibe/web"
)

# Drive letter to use for mapping
$drive = "Z:"

# Target directory (current directory)
$target = Get-Location

# Map virtual drive
Write-Host "Mapping $drive to $target..."
subst $drive $target

try {
    # Determine the subdirectory based on workspace
    $subDir = if ($workspace -eq "@mohassibe/web") { "packages\web" } else { "." }
    
    # Change directory to the virtual drive
    Write-Host "Entering virtual drive $drive\$subDir..."
    Set-Location "$drive\$subDir"
    
    # Run build
    Write-Host "Running build for $workspace..."
    npm run build
}
finally {
    # Change back to original directory
    Set-Location $target
    
    # Unmap virtual drive
    Write-Host "Unmapping $drive..."
    subst $drive /D
}
