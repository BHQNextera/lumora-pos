$ErrorActionPreference = "Stop"

Set-Location "C:\PROJECT\lumora-pos"

$path = ".\src\components\pos\CalculatorSaleEntry.tsx"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$text = Get-Content $path -Raw -Encoding UTF8

$pattern = 'const keypadRows = \[\s*\["1", "2", "3"\],\s*\["4", "5", "6"\],\s*\["7", "8", "9"\],\s*\["ENTER", "BACKSPACE", "CLEAR"\],\s*\];'

$replacement = @'
const keypadRows = [
    ["3", "2", "1"],
    ["6", "5", "4"],
    ["9", "8", "7"],
    ["ENTER", "BACKSPACE", "CLEAR"],
];
'@

if (-not [regex]::IsMatch($text, $pattern)) {
    throw "KEYPAD ROWS ANCHOR NOT FOUND"
}

$text = [regex]::Replace(
    $text,
    $pattern,
    $replacement,
    1
)

[IO.File]::WriteAllText(
    $path,
    $text,
    $utf8NoBom
)

Write-Host "CALCULATOR KEYPAD ORDER CORRECTED"

npx tsc -b --pretty false
if ($LASTEXITCODE -ne 0) {
    throw "TYPECHECK FAILED"
}

npm run build
if ($LASTEXITCODE -ne 0) {
    throw "BUILD FAILED"
}

Write-Host "`nCALCULATOR KEYPAD V3 CONNECTED"
