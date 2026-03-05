# تشغيل Docker - استخدم هذا الملف بعد تثبيت Docker Desktop
# Run: .\docker-build.ps1

Set-Location $PSScriptRoot

Write-Host "جاري البناء..." -ForegroundColor Cyan
docker compose build --no-cache

if ($LASTEXITCODE -eq 0) {
    Write-Host "جاري التشغيل..." -ForegroundColor Green
    docker compose up -d
    Write-Host "تم. افتح http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "فشل البناء. تأكد أن Docker Desktop مثبت ويعمل." -ForegroundColor Red
}
