$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Thrift Marketplace..." -ForegroundColor Green

$server = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "cd /d `"$root`" && npm run dev:server" `
  -WindowStyle Normal -PassThru

$env:BROWSER = "none"
$client = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "cd /d `"$root`" && set BROWSER=none && npm run dev:client" `
  -WindowStyle Normal -PassThru

Write-Host "Server PID: $($server.Id)  (http://localhost:5000)" -ForegroundColor Cyan
Write-Host "Client PID: $($client.Id)  (http://localhost:3000)" -ForegroundColor Cyan
Write-Host "Close the two cmd windows to stop." -ForegroundColor Yellow
