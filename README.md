# Final Approach

<p align="center">
  <img src="ui/public/icon-512.png" width="180" alt="Final Approach icon">
</p>

<p align="center">
  <strong>Map design, assignment tracking and sharing for congregation territories</strong><br>
  Draw territories, manage assignments and publish maps from one application.
</p>

---

Final Approach is a Windows desktop application for congregation territory work. It combines an OpenStreetMap-based map editor with territory assignment records and an optional PHP-based publishing workflow for people who need to view their maps remotely.

### Download

The easiest way to use Final Approach on Windows is to install the latest released version:

**[Download the latest release](https://github.com/hydrogen2oxygen/final-approach-rust/releases/latest)**

Windows releases currently include both an `.exe` setup and an `.msi` installer.

### What you can do

- Draw, edit and delete territory polygons on an interactive OpenStreetMap
- Attach a territory number and name to a polygon, including foreign-language territories and coverage status
- Import a KML file and export the selected territory as KML for Google Earth
- Maintain publishers, groups, assignments, returns and territory history
- Record and flag "do not visit" entries
- Search for territories and publishers
- Export a selected map as PDF, place four selected maps on one PDF, and generate a PDF containing territory QR codes
- Export the S-13 territory assignment record as PDF and publishers/territories as an Excel-compatible `.xlsx` file
- Use separate Designer, Manager, Publisher and Group Leader views
- Store and use all management data locally without a database server
- Optionally publish the web UI, territory maps and password-protected territory overviews to a PHP-capable web server
- View published maps on a phone or browser, share territory links and show the current GPS position

### Basic workflow

1. In **Designer** mode, set the home map position and draw the territory polygons.
2. Select each polygon, enter its territory number and name, and save it as that territory's map.
3. In **Manager** mode, maintain publishers and assign, return or register territories.
4. Print maps and records or export KML, QR codes and spreadsheet data as needed.
5. If remote access is configured, synchronize changes to the PHP endpoint and share the generated territory or overview links.

The polygon/map data and the management record for a territory are stored separately but linked by the territory number. The congregation record contains publishers, groups, colors and remote-server settings.

### Data

Final Approach stores management data as JSON files. The desktop application places them in its application data directory, separated into:

```text
mapDesigns/   # one saved map per territory
territories/  # territory details and assignment history
congregation/ # congregation, publisher and configuration data
```

The saved home position and zoom level are browser/WebView-local settings. Remote publication is optional and requires a PHP-capable web server configured in the application settings.

Web Push notifications for subscribed preacher overviews are described in [docs/push-notifications.md](docs/push-notifications.md).

### Updates

The Tauri desktop application can check for signed updates published through GitHub Releases. New versions are available on the project's **[Releases page](https://github.com/hydrogen2oxygen/final-approach-rust/releases)**.

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

The Angular UI is embedded in the Rust executable. Actix Web serves that UI and a local JSON API on `127.0.0.1`; the Tauri wrapper starts this executable as a sidecar on an available port and supplies the application data directory.

When the Rust executable is started directly without a data-directory argument, it uses a `data` directory next to the executable. It creates `mapDesigns`, `territories` and `congregation` below that directory. The Tauri build uses the operating system's application data location instead.

The optional remote deployment is different from the local Rust API: the application can generate a configured PHP endpoint and upload the compiled web UI and JSON map data to it.

### Developer notes

Useful commands:

```shell
cargo fetch
npm --prefix ui test
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
