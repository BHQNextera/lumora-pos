$ErrorActionPreference = "Stop"
Set-Location "C:\PROJECT\lumora-pos"

$path = ".\src\pages\sale\SalePage.tsx"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$text = Get-Content $path -Raw -Encoding UTF8

$openPattern = '<section\s+className="sale-page__catalog"\s+hidden=\{\s*activeProfile\.operatingModel\s*===\s*"calculator"\s*\}\s*>'

if (-not [regex]::IsMatch($text, $openPattern)) {
    throw "CALCULATOR CATALOG OPENING NOT FOUND"
}

$openReplacement = @'
{activeProfile.operatingModel !==
                        "calculator" && (
                    <section className="sale-page__catalog">
'@

$text = [regex]::Replace(
    $text,
    $openPattern,
    $openReplacement,
    1
)

$closePattern = '(</section>\s*)(<section className="sale-page__cart">)'

if (-not [regex]::IsMatch($text, $closePattern)) {
    throw "CATALOG/CART STRUCTURAL BOUNDARY NOT FOUND"
}

$closeReplacement = @'
</section>
                    )}

                    <section className="sale-page__cart">
'@

$text = [regex]::Replace(
    $text,
    $closePattern,
    $closeReplacement,
    1
)

[IO.File]::WriteAllText(
    $path,
    $text,
    $utf8NoBom
)

Write-Host "CALCULATOR CATALOG CONDITIONAL FIX APPLIED"

Write-Host "`n=== TYPECHECK ==="
npx tsc -b --pretty false
if ($LASTEXITCODE -ne 0) {
    throw "TYPECHECK FAILED"
}

Write-Host "`n=== BUILD ==="
npm run build
if ($LASTEXITCODE -ne 0) {
    throw "BUILD FAILED"
}

Write-Host "`nCALCULATOR UI ROUTING FIX CONNECTED"
