$srcDir = "C:\Users\Usuario\Downloads\Antigravity\adonai-tareas\src"
$utf8 = [System.Text.Encoding]::UTF8
$win1252 = [System.Text.Encoding]::GetEncoding('windows-1252')
$fixedCount = 0
$skippedCount = 0
$errorCount = 0

# Build the set of Win-1252 characters > U+00FF that are corruption artifacts
$win1252HighCPs = @(
    0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
    0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017D,
    0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
    0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178
)
$win1252ByteMap = @{}
foreach ($cp in $win1252HighCPs) {
    $b = $win1252.GetBytes([string][char]$cp)
    $win1252ByteMap[$cp] = [int]$b[0]
}

$files = Get-ChildItem -Path $srcDir -Recurse -Include "*.tsx", "*.ts"
Write-Host "Found $($files.Count) .tsx/.ts files to check"

foreach ($file in $files) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)

        $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF

        # Decode as UTF-8
        $s = $utf8.GetString($bytes)

        # Detect corruption: chars in 0xC0-0xDF range
        $hasCorruption = $false
        foreach ($c in $s.ToCharArray()) {
            $cp = [int]$c
            if ($cp -ge 0xC0 -and $cp -le 0xDF) {
                $hasCorruption = $true
                break
            }
        }

        if (-not $hasCorruption) {
            $skippedCount++
            continue
        }

        # Hybrid conversion:
        # 1. U+0000-U+00FF (Latin-1) -> single byte (corruption artifacts)
        # 2. Win-1252-specific high chars -> single Win-1252 byte
        # 3. Other high chars (emoji, etc.) -> preserve as UTF-8 bytes
        $outputBytes = [System.Collections.Generic.List[byte]]::new()
        foreach ($c in $s.ToCharArray()) {
            $cp = [int]$c
            if ($cp -le 0xFF) {
                $outputBytes.Add([byte]$cp)
            } elseif ($win1252ByteMap.ContainsKey($cp)) {
                $outputBytes.Add([byte]$win1252ByteMap[$cp])
            } else {
                $utf8Bytes = $utf8.GetBytes([string]$c)
                foreach ($b in $utf8Bytes) {
                    $outputBytes.Add($b)
                }
            }
        }

        # Decode as UTF-8
        $fixed = $utf8.GetString($outputBytes.ToArray())

        if ($fixed -ne $s) {
            if ($hasBom) {
                $bomBytes = [byte[]]@(0xEF, 0xBB, 0xBF)
                $contentBytes = $utf8.GetBytes($fixed)
                $outBytes = New-Object byte[] ($bomBytes.Length + $contentBytes.Length)
                [Buffer]::BlockCopy($bomBytes, 0, $outBytes, 0, $bomBytes.Length)
                [Buffer]::BlockCopy($contentBytes, 0, $outBytes, $bomBytes.Length, $contentBytes.Length)
                [System.IO.File]::WriteAllBytes($file.FullName, $outBytes)
            } else {
                [System.IO.File]::WriteAllText($file.FullName, $fixed, $utf8)
            }
            Write-Host "FIXED: $($file.FullName)"
            $fixedCount++
        } else {
            $skippedCount++
        }
    } catch {
        Write-Warning "ERROR processing $($file.FullName): $_"
        $errorCount++
    }
}

Write-Host "`n=== SUMMARY ==="
Write-Host "Fixed: $fixedCount"
Write-Host "Skipped (no corruption): $skippedCount"
Write-Host "Errors: $errorCount"
Write-Host "Total checked: $(($fixedCount + $skippedCount + $errorCount))"
