Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outPath,
        [bool]$maskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Deep dark background
    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#09090b"))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Inner badge or safe area
    $pad = if ($maskable) { [int]($size * 0.18) } else { [int]($size * 0.08) }
    $innerSize = $size - (2 * $pad)
    
    $rect = New-Object System.Drawing.Rectangle $pad, $pad, $innerSize, $innerSize
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.ColorTranslator]::FromHtml("#2563eb"),
        [System.Drawing.ColorTranslator]::FromHtml("#1d4ed8"),
        45.0
    )
    
    # Rounded rect path
    $radius = [int]($innerSize * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    
    $g.FillPath($gradBrush, $path)
    $gradBrush.Dispose()

    # Text XL
    $fontSize = [float]($innerSize * 0.42)
    $fontFamily = [System.Drawing.FontFamily]::GenericSansSerif
    $font = New-Object System.Drawing.Font ($fontFamily, $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $destRect = [System.Drawing.RectangleF]::new($rect.X, $rect.Y, $rect.Width, $rect.Height)
    $g.DrawString("XL", $font, $textBrush, $destRect, $sf)
    
    $font.Dispose()
    $textBrush.Dispose()
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated $outPath"
}

$baseDir = "c:\my projects\expense tracker\frontend\public\icons"
Generate-Icon -size 192 -outPath "$baseDir\icon-192.png" -maskable $false
Generate-Icon -size 512 -outPath "$baseDir\icon-512.png" -maskable $false
Generate-Icon -size 512 -outPath "$baseDir\icon-maskable.png" -maskable $true
Generate-Icon -size 180 -outPath "$baseDir\apple-touch-icon.png" -maskable $false
Generate-Icon -size 32 -outPath "$baseDir\favicon-32.png" -maskable $false
