param(
    [int] $Port = 8793,
    [string] $PythonPath
)

$ErrorActionPreference = "Stop"
$webDir = Join-Path $PSScriptRoot "web"

if ([string]::IsNullOrWhiteSpace($PythonPath)) {
    $candidates = @(
        "C:\Users\nachi\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
        "python",
        "py"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { $PythonPath = $candidate; break }
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) { $PythonPath = $command.Source; break }
    }
}

if ([string]::IsNullOrWhiteSpace($PythonPath)) {
    throw "Python was not found. Pass -PythonPath to a Python installation with numpy and openpyxl."
}

$url = "http://127.0.0.1:$Port/"
$healthUrl = "http://127.0.0.1:$Port/api/health"
try { $ready = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1 } catch { $ready = $null }
if ($ready.agent -eq "AgentFastFuriosForecaster") {
    Write-Host "AF3 is already online at $url"
    exit 0
}

$process = Start-Process -FilePath $PythonPath `
    -ArgumentList @((Join-Path $webDir "server.py"), "--host", "127.0.0.1", "--port", "$Port") `
    -WorkingDirectory $webDir `
    -WindowStyle Hidden `
    -PassThru

for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Milliseconds 250
    if ($process.HasExited) { throw "AF3 server exited during startup. Verify that numpy and openpyxl are installed." }
    try {
        $ready = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1
        if ($ready.ok) { Write-Host "AF3 mission control: $url"; exit 0 }
    } catch { }
}
throw "AF3 started but did not answer at $url within six seconds."
