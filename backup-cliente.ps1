param(
    [Parameter(Mandatory=$true)]
    [string]$cliente
)

$basePath = "$PSScriptRoot"
$clienteFolder = Join-Path $basePath "clientes\$cliente"
$clienteDb = Join-Path $basePath "data\$cliente.db"
$zipPath = Join-Path $basePath "$cliente-backup.zip"


# Eliminar el zip previo si existe, con reintentos si está bloqueado
if (Test-Path $zipPath) {
    $maxRetries = 3
    $retryCount = 0
    $deleted = $false
    while ($retryCount -lt $maxRetries -and -not $deleted) {
        try {
            Remove-Item $zipPath -Force
            $deleted = $true
        } catch {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "El archivo $zipPath está en uso. Reintentando en 2 segundos... ($retryCount/$maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            } else {
                Write-Host "❌ No se pudo eliminar el archivo $zipPath porque está en uso por otro proceso." -ForegroundColor Red
                exit 1
            }
        }
    }
}

if (!(Test-Path $clienteFolder)) {
    Write-Host "❌ La carpeta $clienteFolder no existe." -ForegroundColor Red
    exit 1
}
if (!(Test-Path $clienteDb)) {
    Write-Host "❌ El archivo $clienteDb no existe." -ForegroundColor Red
    exit 1
}

# Actualizar CLIENTE en .env
$envPath = Join-Path $basePath ".env"
if (Test-Path $envPath) {
    (Get-Content $envPath) | ForEach-Object {
        if ($_ -match "^CLIENTE=") {
            "CLIENTE=$cliente"
        } else {
            $_
        }
    } | Set-Content $envPath
    Write-Host "CLIENTE actualizado en .env a '$cliente'" -ForegroundColor Cyan
}

# Buscar todas las carpetas node_modules en el proyecto
$nodeModulesDirs = Get-ChildItem -Path $basePath -Recurse -Directory | Where-Object { $_.Name -eq 'node_modules' } | ForEach-Object { $_.FullName }

# Crear lista de carpetas y archivos a incluir en el backup
$itemsToZip = @()

# Incluir archivos del root (excepto node_modules, .git, clientes, data y el zip)
$rootItems = Get-ChildItem -Path $basePath -Exclude "node_modules", ".git", "clientes", "data", "$cliente-backup.zip"
foreach ($item in $rootItems) {
    if ($item.PSIsContainer -and ($item.Name -ne "node_modules" -and $item.Name -ne ".git" -and $nodeModulesDirs -notcontains $item.FullName)) {
        $itemsToZip += $item.FullName
    } elseif (-not ($item.Name -eq "node_modules" -or $item.Name -eq ".git" -or $nodeModulesDirs -contains $item.FullName)) {
        $itemsToZip += $item.FullName
    }
}

# Incluir carpeta web (excluyendo node_modules y .git en cualquier nivel, sin recorrer node_modules)
$webPath = Join-Path $basePath "web"
function Get-FilesNoNodeModules {
    param([string]$Path)
    $result = @()
    $items = Get-ChildItem -Path $Path -Force
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            if ($item.Name -ne "node_modules" -and $item.Name -ne ".git") {
                $result += Get-FilesNoNodeModules -Path $item.FullName
            }
        } else {
            $result += $item.FullName
        }
    }
    return $result
}
if (Test-Path $webPath) {
    $webItems = Get-FilesNoNodeModules -Path $webPath
    foreach ($item in $webItems) {
        $itemsToZip += $item
    }
}

# Incluir carpeta src (excluyendo node_modules y .git en cualquier nivel, sin recorrer node_modules)
$srcPath = Join-Path $basePath "src"
if (Test-Path $srcPath) {
    $srcItems = Get-FilesNoNodeModules -Path $srcPath
    foreach ($item in $srcItems) {
        $itemsToZip += $item
    }
}

# Incluir solo la carpeta del cliente (excluyendo node_modules y .git en cualquier nivel, sin recorrer node_modules)
if (Test-Path $clienteFolder) {
    $clienteItems = Get-FilesNoNodeModules -Path $clienteFolder
    foreach ($item in $clienteItems) {
        $itemsToZip += $item
    }
}

# Incluir solo la base de datos del cliente
if (Test-Path $clienteDb) {
    $itemsToZip += $clienteDb
}

# Eliminar duplicados
$itemsToZip = $itemsToZip | Select-Object -Unique


# Ya no es necesario filtrar node_modules, la función recursiva los excluye

Write-Host "Archivos y carpetas que se van a comprimir:" -ForegroundColor Yellow
foreach ($item in $itemsToZip) {
    if ($item -like "*node_modules*" -or $item -like "*.git*") {
        Write-Host "⚠️ Detectado: $item" -ForegroundColor Red
    } else {
        Write-Host $item
    }
}


# Medir tiempo de compresión y manejar errores
$startTime = Get-Date
Write-Host "Creando backup en $zipPath ..." -ForegroundColor Cyan
try {
    Compress-Archive -Path $itemsToZip -DestinationPath $zipPath -Force
    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host "✅ Backup creado: $zipPath" -ForegroundColor Green
    Write-Host "Duración de la compresión: $($duration.TotalSeconds) segundos" -ForegroundColor Yellow
    Write-Host "(Incluye la estructura de carpetas, excluyendo node_modules y .git en cualquier nivel, y solo la carpeta y base de datos del cliente $cliente)"
} catch {
    Write-Host "❌ Error durante la compresión: $_" -ForegroundColor Red
    exit 1
}
