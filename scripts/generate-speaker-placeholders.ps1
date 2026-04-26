Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$speakersPath = Join-Path $projectRoot 'src\api\data\Speakers.json'
$photosPath = Join-Path $projectRoot 'src\site\assets\media\photos'

if (!(Test-Path $photosPath)) {
  New-Item -ItemType Directory -Path $photosPath | Out-Null
}

$speakers = Get-Content $speakersPath -Raw | ConvertFrom-Json

foreach ($speaker in $speakers) {
  $relativePhoto = $speaker.photo -replace '^/assets/media/photos/', ''
  $targetPath = Join-Path $photosPath $relativePhoto
  $directory = Split-Path -Parent $targetPath

  if (!(Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }

  $bitmap = New-Object System.Drawing.Bitmap 640, 640
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $rect = New-Object System.Drawing.Rectangle 0, 0, 640, 640
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(241, 90, 72),
    [System.Drawing.Color]::FromArgb(15, 154, 148),
    45
  )
  $graphics.FillRectangle($gradient, $rect)

  $overlayBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
  $graphics.FillEllipse($overlayBrush, 60, 60, 520, 520)

  $initials = (($speaker.prenom.Substring(0, 1)) + ($speaker.nom.Substring(0, 1))).ToUpperInvariant()
  $font = New-Object System.Drawing.Font('Arial', 150, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $nameFont = New-Object System.Drawing.Font('Arial', 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $subtitleFont = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = [System.Drawing.Brushes]::White
  $accentBrush = [System.Drawing.Brushes]::WhiteSmoke

  $initialSize = $graphics.MeasureString($initials, $font)
  $graphics.DrawString($initials, $font, $textBrush, (640 - $initialSize.Width) / 2, 176)

  $fullName = "$($speaker.prenom) $($speaker.nom)"
  $nameSize = $graphics.MeasureString($fullName, $nameFont)
  $graphics.DrawString($fullName, $nameFont, $textBrush, (640 - $nameSize.Width) / 2, 454)

  $subtitle = 'Photo exemple a remplacer'
  $subtitleSize = $graphics.MeasureString($subtitle, $subtitleFont)
  $graphics.DrawString($subtitle, $subtitleFont, $accentBrush, (640 - $subtitleSize.Width) / 2, 510)

  $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

  $gradient.Dispose()
  $overlayBrush.Dispose()
  $font.Dispose()
  $nameFont.Dispose()
  $subtitleFont.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}