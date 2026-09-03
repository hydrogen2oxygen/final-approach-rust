# Final Approach

<p align="center">
  <img src="ui/public/icon-512.png" width="180" alt="Final Approach icon">
</p>

<p align="center">
  <strong>Territory design and management for congregations</strong><br>
  Create, organize, visualize and print territories on an interactive map.
</p>

---

## For users

Final Approach is a desktop application for designing and managing congregation territories.

It provides a map-based interface for defining territory boundaries, organizing territory data and preparing maps for practical use.

### Download

The easiest way to use Final Approach on Windows is to install the latest released version:

**[Download the latest release](https://github.com/hydrogen2oxygen/final-approach-rust/releases/latest)**

Windows releases currently include both an `.exe` setup and an `.msi` installer.

### What you can do

- Design territories directly on an interactive map
- Draw, edit and organize territory boundaries
- Define colors and map appearance
- Save different map designs
- Create and edit territory definitions
- Print territory maps
- Export map data for backup or further use
- Work locally without requiring an external server

### Basic workflow

1. Open Final Approach.
2. Design the congregation map and define the territory boundaries.
3. Save the map design.
4. Create or edit the individual territory definitions.
5. Print or export the territories when needed.

Map designs contain the territory geometry, colors and related display settings. Individual territory definitions are stored separately so that map layout and territory information can be managed independently.

### Data

Final Approach stores its application data locally.

The desktop version uses the application's data directory for settings, territories and map designs. This keeps the program self-contained and avoids requiring a separate database server.

### Updates

The Tauri desktop application supports release-based updates through GitHub. New versions are published on the project's **[Releases page](https://github.com/hydrogen2oxygen/final-approach-rust/releases)**.

---

## Development

Final Approach consists of:

- **Rust** backend
- **Actix Web** local server
- **Angular** frontend
- **OpenLayers** for map rendering
- **Tauri** desktop wrapper

### Build the Rust application

```shell
cd ui
npm install
npm run build
cd ..
cargo build --release
```

Run the compiled application:

```shell
.\target\release\finalApproach.exe
```

For development with logging enabled:

```powershell
$env:RUST_LOG="info"; cargo run
```

### Build the Windows desktop installer

The Tauri desktop wrapper starts the existing Actix server as a sidecar on a free local port.

```powershell
cd ui
npm install
npm run tauri:build
```

The generated NSIS and MSI installers are written to:

```text
ui/src-tauri/target/release/bundle
```

### Application structure

The application is intentionally centered around a single map workspace. Most secondary functions are opened as dialogs so that the user remains in the territory context while working.

A traditional standalone build uses a structure similar to:

```text
finalApproach.exe
data/
  settings.json
  territories/
  mapdesign/
  public/
    index.html
    ...
```

The Tauri desktop build stores application data in the user's Tauri application data directory instead.

### Map design workflow

1. Design the map.
2. Save the map design as JSON.
3. Create and maintain the individual territory definitions.
4. Export or print the finished map.

Map design files contain territory definitions, colors and other presentation settings. Temporary map designs may be stored separately with timestamps before the final version is saved.

### Developer notes

Useful commands:

```shell
cargo fetch
ng generate component info-dialog
```

References:

- [Material Design Icons](https://jossef.github.io/material-design-icons-iconfont/)
- [Angular Material Dialog](https://material.angular.dev/components/dialog/examples)
- [OpenLayers Export Map Example](https://openlayers.org/en/latest/examples/export-map.html)

Additional documentation:

- [Desktop updates](docs/desktop-updates.md)

---

## License

See [LICENSE](LICENSE).