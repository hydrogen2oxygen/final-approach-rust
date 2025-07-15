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

### Notes on Design
- all in one page, all components are dialogs
- fake sftp and webserver during developing mode
- ...

### Notes for me
````shell
ng generate component info-dialog
````
https://jossef.github.io/material-design-icons-iconfont/

Folder structure

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