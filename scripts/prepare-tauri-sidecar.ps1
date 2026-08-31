$ErrorActionPreference = 'Stop'

$repositoryRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
$serverManifest = Join-Path $repositoryRoot 'Cargo.toml'
$serverTargetDirectory = Join-Path $repositoryRoot 'ui\src-tauri\backend-target'
$serverBinary = Join-Path $serverTargetDirectory 'release\finalApproach.exe'
$sidecarDirectory = Join-Path $repositoryRoot 'ui\src-tauri\binaries'
$sidecarBinary = Join-Path $sidecarDirectory 'finalApproach-server-x86_64-pc-windows-msvc.exe'

cargo build --release --features desktop-sidecar --manifest-path $serverManifest --target-dir $serverTargetDirectory
if ($LASTEXITCODE -ne 0) {
    throw 'Could not build the Final Approach backend.'
}

New-Item -ItemType Directory -Force -Path $sidecarDirectory | Out-Null
Copy-Item -LiteralPath $serverBinary -Destination $sidecarBinary -Force
