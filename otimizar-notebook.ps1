# ============================================
# SCRIPT DE OTIMIZAÇÃO - NOTEBOOK 4GB RAM
# ============================================
# Este script otimiza Windows 11 para notebooks com pouca RAM

Write-Host "`n🚀 INICIANDO OTIMIZAÇÃO DO NOTEBOOK..." -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Verificar se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERRO: Este script precisa ser executado como ADMINISTRADOR" -ForegroundColor Red
    Write-Host "   Clique com botão direito no PowerShell e escolha 'Executar como Administrador'" -ForegroundColor Yellow
    pause
    exit
}

# ============================================
# 1. DESABILITAR PROGRAMAS DA INICIALIZAÇÃO
# ============================================
Write-Host "`n📋 [1/6] Desabilitando programas pesados da inicialização..." -ForegroundColor Yellow

$programasParaDesabilitar = @(
    "GoogleDriveFS",
    "OneDrive",
    "Cloudflare WARP",
    "AnyDesk",
    "Adobe Acrobat Synchronizer",
    "Proton VPN"
)

foreach ($prog in $programasParaDesabilitar) {
    try {
        Get-ScheduledTask | Where-Object {$_.TaskName -like "*$prog*"} | Disable-ScheduledTask -ErrorAction SilentlyContinue
        Write-Host "  ✅ Desabilitado: $prog" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  $prog - não encontrado ou já desabilitado" -ForegroundColor Gray
    }
}

# Desabilitar via registro (startup apps)
$startupPaths = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
)

foreach ($path in $startupPaths) {
    if (Test-Path $path) {
        $items = Get-ItemProperty -Path $path
        foreach ($prog in $programasParaDesabilitar) {
            $items.PSObject.Properties | Where-Object { $_.Value -like "*$prog*" } | ForEach-Object {
                try {
                    Remove-ItemProperty -Path $path -Name $_.Name -ErrorAction Stop
                    Write-Host "  ✅ Removido da inicialização: $($_.Name)" -ForegroundColor Green
                } catch {}
            }
        }
    }
}

# ============================================
# 2. AUMENTAR MEMÓRIA VIRTUAL
# ============================================
Write-Host "`n💾 [2/6] Configurando memória virtual (8 GB)..." -ForegroundColor Yellow

try {
    # Desabilitar gerenciamento automático
    $cs = Get-CimInstance Win32_ComputerSystem
    if ($cs.AutomaticManagedPagefile) {
        $cs | Set-CimInstance -Property @{AutomaticManagedPagefile=$false}
    }

    # Configurar 8GB de memória virtual (8192 MB)
    $pageFile = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue
    if ($pageFile) {
        $pageFile | Remove-CimInstance
    }

    New-CimInstance -ClassName Win32_PageFileSetting -Property @{
        Name = "C:\pagefile.sys"
        InitialSize = 8192
        MaximumSize = 8192
    } | Out-Null

    Write-Host "  ✅ Memória virtual configurada: 8 GB (fixo)" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Erro ao configurar memória virtual: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# 3. LIMPAR ARQUIVOS TEMPORÁRIOS
# ============================================
Write-Host "`n🧹 [3/6] Limpando arquivos temporários..." -ForegroundColor Yellow

$tempFolders = @(
    $env:TEMP,
    "C:\Windows\Temp",
    "C:\Windows\Prefetch"
)

$totalRemovido = 0
foreach ($folder in $tempFolders) {
    if (Test-Path $folder) {
        try {
            $antes = (Get-ChildItem $folder -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
            Get-ChildItem $folder -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            $totalRemovido += $antes
            Write-Host "  ✅ Limpo: $folder" -ForegroundColor Green
        } catch {}
    }
}
Write-Host "  💾 Espaço liberado: $([math]::Round($totalRemovido, 2)) MB" -ForegroundColor Cyan

# ============================================
# 4. DESABILITAR EFEITOS VISUAIS
# ============================================
Write-Host "`n🎨 [4/6] Otimizando efeitos visuais..." -ForegroundColor Yellow

$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "VisualFXSetting" -Value 2 # Melhor desempenho

# Desabilitar transparência
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "EnableTransparency" -Value 0

# Desabilitar animações
$regPathDWM = "HKCU:\Software\Microsoft\Windows\DWM"
Set-ItemProperty -Path $regPathDWM -Name "EnableAeroPeek" -Value 0 -ErrorAction SilentlyContinue
Set-ItemProperty -Path $regPathDWM -Name "AlwaysHibernateThumbnails" -Value 0 -ErrorAction SilentlyContinue

Write-Host "  ✅ Efeitos visuais otimizados para desempenho" -ForegroundColor Green

# ============================================
# 5. DESABILITAR SERVIÇOS DESNECESSÁRIOS
# ============================================
Write-Host "`n⚙️  [5/6] Desabilitando serviços pesados..." -ForegroundColor Yellow

$servicosParaDesabilitar = @(
    "SysMain",              # Superfetch (pré-carrega programas)
    "WSearch",              # Windows Search (indexação)
    "DiagTrack",            # Telemetria
    "dmwappushservice",     # Telemetria
    "MapsBroker"            # Mapas
)

foreach ($servico in $servicosParaDesabilitar) {
    try {
        $svc = Get-Service -Name $servico -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq 'Running') {
            Stop-Service -Name $servico -Force -ErrorAction Stop
            Set-Service -Name $servico -StartupType Disabled -ErrorAction Stop
            Write-Host "  ✅ Desabilitado: $servico" -ForegroundColor Green
        }
    } catch {
        Write-Host "  ⚠️  $servico - não encontrado ou já desabilitado" -ForegroundColor Gray
    }
}

# ============================================
# 6. OTIMIZAR VS CODE
# ============================================
Write-Host "`n⚡ [6/6] Criando configurações otimizadas para VS Code..." -ForegroundColor Yellow

$vscodeSettings = @"
{
  // OTIMIZAÇÕES DE PERFORMANCE PARA 4GB RAM
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/dist/**": true,
    "**/build/**": true
  },
  "search.followSymlinks": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/.git": true
  },
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true
  },
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "git.autofetch": false,
  "git.enableSmartCommit": false,
  "editor.minimap.enabled": false,
  "editor.suggestSelection": "first",
  "editor.quickSuggestions": {
    "other": false,
    "comments": false,
    "strings": false
  },
  "typescript.disableAutomaticTypeAcquisition": true,
  "javascript.suggest.enabled": false,
  "workbench.enableExperiments": false,
  "workbench.settings.enableNaturalLanguageSearch": false,
  "terminal.integrated.gpuAcceleration": "off",
  "editor.renderWhitespace": "none",
  "editor.renderControlCharacters": false,
  "diffEditor.ignoreTrimWhitespace": true,
  "telemetry.telemetryLevel": "off"
}
"@

$vscodeSettingsPath = "$env:APPDATA\Code\User\settings.json"
$backupPath = "$env:APPDATA\Code\User\settings.json.backup"

if (Test-Path $vscodeSettingsPath) {
    Copy-Item $vscodeSettingsPath $backupPath -Force
    Write-Host "  💾 Backup criado: settings.json.backup" -ForegroundColor Cyan
}

$vscodeSettings | Out-File -FilePath $vscodeSettingsPath -Encoding UTF8 -Force
Write-Host "  ✅ Configurações do VS Code otimizadas" -ForegroundColor Green
Write-Host "  📝 Arquivo salvo em: $vscodeSettingsPath" -ForegroundColor Gray

# ============================================
# RESUMO FINAL
# ============================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "✅ OTIMIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`n📊 O QUE FOI FEITO:" -ForegroundColor Yellow
Write-Host "  ✅ Programas pesados removidos da inicialização" -ForegroundColor White
Write-Host "  ✅ Memória virtual aumentada para 8 GB" -ForegroundColor White
Write-Host "  ✅ Arquivos temporários limpos ($([math]::Round($totalRemovido, 2)) MB)" -ForegroundColor White
Write-Host "  ✅ Efeitos visuais desabilitados" -ForegroundColor White
Write-Host "  ✅ Serviços desnecessários desabilitados" -ForegroundColor White
Write-Host "  ✅ VS Code configurado para modo leve" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "  🔄 REINICIE O NOTEBOOK para aplicar todas as mudanças" -ForegroundColor Yellow
Write-Host "  💡 Após reiniciar, você notará:" -ForegroundColor Cyan
Write-Host "     - Sistema mais responsivo" -ForegroundColor White
Write-Host "     - Menos travamentos" -ForegroundColor White
Write-Host "     - Boot mais rápido (menos programas)" -ForegroundColor White

Write-Host "`n💡 DICAS EXTRAS:" -ForegroundColor Cyan
Write-Host "  • Use Edge em vez de Chrome (mais leve)" -ForegroundColor White
Write-Host "  • Feche programas que não está usando" -ForegroundColor White
Write-Host "  • Considere upgrade de RAM (4GB → 8GB/16GB)" -ForegroundColor White

Write-Host "`n🔄 DESEJA REINICIAR AGORA? (S/N): " -ForegroundColor Yellow -NoNewline
$resposta = Read-Host

if ($resposta -eq 'S' -or $resposta -eq 's') {
    Write-Host "`n🔄 Reiniciando em 10 segundos..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Restart-Computer -Force
} else {
    Write-Host "`n👍 OK! Lembre-se de reiniciar quando possível." -ForegroundColor Cyan
}

Write-Host "`nPressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
