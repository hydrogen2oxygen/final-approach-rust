# Final Approach Rust Edition
Rust (a programming language similar to C++) based territory designer and manager software.

# Developer
````shell
cd ui
npm install
ng build
cd ..
cargo build --release
````
Run
````shell
.\target\release\finalApproach.exe
````

PowerShell Run
````powershell
$env:RUST_LOG="info"; cargo run
````

### Notes on Design
- all in one page, all components are dialogs
- fake sftp and webserver during developing mode
- ...

### Notes for me
````shell
ng generate component info-dialog
````
https://jossef.github.io/material-design-icons-iconfont/

#### Features from OL version 10
https://openlayers.org/en/latest/examples/export-map.html

#### Folder structure

````
-- finalApproach.exe
-- data
   -- settings.json
   -- territories
   -- mapdesign
   -- public
      -- index.html ... (ui)
      -- data 
````

#### Workflow
1. Design the map
2. Save the map design as a JSON file inside data/mapdesign
   - The map design includes the territory definitions, colors, and other settings.
   - The JSON file should be named according to the map design (e.g., `my_map_design.json`).
   - Temporary files are stored in `data/mapdesign/temp` and contains a timestamp in the filename.
   - The map design can be saved multiple times, overwriting the previous version.
3. Create a territory definition
   - Territories are defined in the `data/territories` folder.
   - Each territory is a JSON file with its own properties (e.g., number, name, color, coordinates).
   - The territory definitions can be created and edited through the UI. 
4. Export the map design (extra export button appears, else if settings are not set it is disabled)