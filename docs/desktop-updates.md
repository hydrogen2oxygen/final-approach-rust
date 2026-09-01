# Desktop updates

The desktop application checks the latest GitHub release in the background after startup. It only displays a dialog when a newer version is available. The user must explicitly approve downloading and installing the update. A manual check is available in **Settings → Application updates**.

## One-time signing setup

Generate the Tauri updater key pair outside the repository:

```powershell
cd ui
npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\final-approach.key"
```

Keep the private key and its password in a password manager or another secure backup. Losing the key prevents publishing updates that existing installations accept.

The public key is configured in `ui/src-tauri/tauri.conf.json`. Add the complete matching private-key content as the GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY` and its password as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

The private key and password must never be added to the repository. Windows code signing is separate and is not required by the Tauri updater.

## Publishing a release

Update the same semantic version in both files:

- `ui/src-tauri/tauri.conf.json`
- `ui/src-tauri/Cargo.toml`

Create and push a matching tag such as `v0.2.0`. The release workflow builds Angular and Tauri on Windows, signs the updater artifacts, and publishes the NSIS/MSI installers, signature files, and `latest.json` to GitHub Releases.

## Testing

For an end-to-end test, install a signed release with a lower version, then publish a newer test release with the same updater key. Start the installed application and verify that the update dialog shows the release notes, that **Later** does not download anything, and that **Install update** installs and restarts the application. Also test without network access; startup must continue normally.

Run these local checks before tagging:

```powershell
cd ui
npm run build
npm run tauri:build
```

The updater cannot be fully tested with an unsigned development build. A GitHub release must contain `latest.json`, the installer/updater bundle, and its matching `.sig` file.
