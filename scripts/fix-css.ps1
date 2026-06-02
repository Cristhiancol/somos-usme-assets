$file = Join-Path $PSScriptRoot "client\src\index.css"
$lines = Get-Content $file
$keep = $lines[0..883]
$keep | Set-Content $file -Encoding UTF8
Write-Host "Truncated to 884 lines. Done."
