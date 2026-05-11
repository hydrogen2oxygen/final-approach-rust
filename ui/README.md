# Final Approach UI - Rust Edition

## Persona

### Designer
The designer creates and manages map designs, including defining territories, colors, and other settings. Designs can be created locally or in the online UI.

In the online UI, map designs are saved in the browser’s local storage and can be downloaded or uploaded as JSON files. This allows designers to share and collaborate on map designs.

### Territory Manager
The territory manager assigns territories to preachers using the local app. Once a territory is assigned, the corresponding map design is uploaded to the server as a JSON file. Preachers access it through a unique link (UUID).

### Preacher
Preachers access assigned territories through a UUID link on their smartphone or tablet. The online UI loads the specific map design, allowing them to view assigned territories and related information.

### Group Leader
Group leaders oversee preachers in their group. They can view map designs, assigned territories, and related information provided by the territory manager.

Choose from https://jossef.github.io/material-design-icons-iconfont/ the icons for the following roles:
- Designer: `design_services`
- Territory Manager: `manage_accounts`
- Preacher: `person`
- Group Leader: `group`

## Online UI
The app for the online UI is built with Angular and Material Design. It allows users to create, edit, and manage map designs and territories.

Map designs are uploaded individually to the server, inside specific folders for each congregation. The online UI provides a user-friendly interface for managing these designs. Inside the Settings dialog, users can set the server URL and other configurations for the SFTP connection.

The server is able to simulate SFTP and web server functionality during development. This allows for testing and development without needing a real server setup.
