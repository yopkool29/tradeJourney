# Script pour créer un fichier .env de production à partir de .env.production.example
# Génère automatiquement les mots de passe aléatoires

# Arrêter en cas d'erreur
$ErrorActionPreference = "Stop"

# Vérifier que le fichier exemple existe
if (-not (Test-Path ".env.production.example")) {
    Write-Host "❌ Fichier .env.production.example introuvable" -ForegroundColor Red
    exit 1
}

# Vérifier que .env n'existe pas déjà
if (Test-Path ".env") {
    Write-Host "⚠️  Le fichier .env existe déjà. Voulez-vous le remplacer ? (y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -notmatch '^[Yy]$') {
        Write-Host "Opération annulée" -ForegroundColor Yellow
        exit 0
    }
}

# Fonction pour générer un mot de passe PostgreSQL (sans / pour éviter les problèmes)
function Generate-Password {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $base64 = [Convert]::ToBase64String($bytes)
    # Supprimer =, +, / et limiter à 32 caractères
    return ($base64 -replace '[=+/]', '').Substring(0, 32)
}

# Fonction pour générer un secret JWT (format hexadécimal)
function Generate-JwtSecret {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
}

# Fonction pour générer un token admin (différent du JWT)
function Generate-AdminToken {
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $base64 = [Convert]::ToBase64String($bytes)
    # Supprimer =, +, / et limiter à 24 caractères
    return ($base64 -replace '[=+/]', '').Substring(0, 24)
}

Write-Host "🔐 Génération des secrets..." -ForegroundColor Cyan

# Générer les secrets (séparément pour garantir qu'ils sont différents)
$POSTGRES_PASSWORD = Generate-Password
$JWT_SECRET = Generate-JwtSecret
$ADMIN_API_TOKEN = Generate-AdminToken

Write-Host "✅ Secrets générés" -ForegroundColor Green

# Lire le fichier exemple et remplacer les valeurs
$content = Get-Content ".env.production.example" -Raw

# Remplacer les valeurs
$content = $content -replace 'CHANGE_ME_TO_STRONG_PASSWORD', $POSTGRES_PASSWORD

# Remplacer JWT_SECRET et ADMIN_API_TOKEN séparément pour éviter les conflits
$lines = $content -split "`n"
$newLines = @()

foreach ($line in $lines) {
    if ($line -match '^JWT_SECRET=CHANGE_ME_TO_RANDOM_SECRET') {
        $newLines += "JWT_SECRET=$JWT_SECRET"
    }
    elseif ($line -match '^ADMIN_API_TOKEN=CHANGE_ME_TO_RANDOM_SECRET') {
        $newLines += "ADMIN_API_TOKEN=$ADMIN_API_TOKEN"
    }
    else {
        $newLines += $line
    }
}

# Écrire le nouveau fichier .env
$newLines -join "`n" | Set-Content ".env" -NoNewline

Write-Host ""
Write-Host "📝 Fichier .env créé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "🔒 Secrets générés :" -ForegroundColor Cyan
Write-Host "   PostgreSQL Password: $POSTGRES_PASSWORD"
Write-Host "   JWT Secret: $JWT_SECRET"
Write-Host "   Admin API Token: $ADMIN_API_TOKEN"
Write-Host ""
Write-Host "⚠️  IMPORTANT :" -ForegroundColor Yellow
Write-Host "   - Sauvegardez ces secrets en lieu sûr"
Write-Host "   - Le fichier .env ne doit JAMAIS être commité dans git"
Write-Host "   - Vérifiez et ajustez les autres paramètres si nécessaire"
Write-Host ""
Write-Host "🔍 Vérifiez le contenu avec : Get-Content .env" -ForegroundColor Cyan
