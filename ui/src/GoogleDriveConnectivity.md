# 📁 Google Drive JSON Upload mit Angular (Frontend-only, ohne Backend)

Dieses Projekt zeigt, wie man mit einer reinen Angular-Anwendung:

- einen Login via Google (OAuth2 mit PKCE) durchführt
- JSON-Dateien auf Google Drive hochlädt
- die Dateien öffentlich zugänglich macht
- anschließend anonym (ohne Login) wieder darauf zugreifen kann

---

## 🔧 Voraussetzungen

- Node.js (v16+)
- Angular CLI
- Google-Konto
- Google Cloud Console Zugriff

---

## 1. 🔐 Google Cloud Projekt & OAuth2 Client

### 1.1 Google Drive API aktivieren

1. Gehe zu https://console.cloud.google.com/
2. Neues Projekt erstellen (z. B. `angular-drive-uploader`)
3. Navigiere zu **APIs & Dienste > Bibliothek**
4. Suche nach `Google Drive API` und aktiviere sie

### 1.2 OAuth 2.0-Client-ID erstellen

1. Gehe zu **APIs & Dienste > Anmeldedaten**
2. Klicke auf **"Anmeldedaten erstellen > OAuth-Client-ID"**
3. Wähle "Webanwendung"
4. Füge Weiterleitungs-URIs hinzu:

```

[http://localhost:4200](http://localhost:4200)

````

5. Nach dem Speichern: **Client-ID notieren**

---

## 2. 📦 Angular Projekt vorbereiten

```bash
ng new drive-json-app
cd drive-json-app
npm install angular-oauth2-oidc
````

---

## 3. ⚙️ OAuth2 Konfiguration in Angular

### `src/app/auth.config.ts`

```ts
import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: 'DEINE_CLIENT_ID.apps.googleusercontent.com',
  redirectUri: window.location.origin,
  responseType: 'code',
  scope: 'openid profile https://www.googleapis.com/auth/drive.file',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: true,
  usePkce: true
};
```

---

## 4. 🧩 AppModule konfigurieren

### `src/app/app.module.ts`

```ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { OAuthModule } from 'angular-oauth2-oidc';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    OAuthModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

---

## 5. 🧠 App-Komponente mit Login & Upload

### `src/app/app.component.ts`

```ts
import { Component } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="!isLoggedIn()">
      <button (click)="login()">🔐 Google Login</button>
    </div>

    <div *ngIf="isLoggedIn()">
      <button (click)="upload()">📤 JSON hochladen</button>
    </div>
  `
})
export class AppComponent {
  constructor(private oauthService: OAuthService, private http: HttpClient) {
    this.oauthService.configure(authConfig);
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
  }

  login() {
    this.oauthService.initCodeFlow();
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  upload() {
    const data = { hello: 'world', time: new Date().toISOString() };
    const filename = 'example.json';

    this.uploadJsonFile(data, filename).then(fileId => {
      this.makeFilePublic(fileId);
    });
  }

  uploadJsonFile(json: any, filename: string): Promise<string> {
    const accessToken = this.oauthService.getAccessToken();

    const metadata = {
      name: filename,
      mimeType: 'application/json'
    };

    const file = new Blob([JSON.stringify(json)], { type: 'application/json' });

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
      body: form
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Datei-ID:', data.id);
        return data.id;
      });
  }

  makeFilePublic(fileId: string) {
    const accessToken = this.oauthService.getAccessToken();

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    })
    .then(() => {
      const publicUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      console.log('🌍 Öffentliche URL:', publicUrl);
    });
  }
}
```

---

## 6. 🌍 Öffentlichen Zugriff testen

Sobald die Datei öffentlich gemacht wurde, kann sie von **jedem Client ohne Login** geladen werden:

```ts
this.http.get('https://www.googleapis.com/drive/v3/files/DATEI_ID?alt=media')
  .subscribe(data => {
    console.log('📥 Öffentliche JSON geladen:', data);
  });
```

Oder direkt im Browser öffnen:

```
https://www.googleapis.com/drive/v3/files/DATEI_ID?alt=media
```

---

## 🔐 Hinweise zu Berechtigungen

| Zweck                                   | Scope                                        |
| --------------------------------------- | -------------------------------------------- |
| Nur eigene App-Dateien verwalten        | `https://www.googleapis.com/auth/drive.file` |
| Vollzugriff auf Drive (nicht empfohlen) | `https://www.googleapis.com/auth/drive`      |

---

## 📚 Quellen & Tools

* [Google Drive API Docs](https://developers.google.com/drive/api/v3/reference)
* [OAuth 2.0 PKCE für Web](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
* [angular-oauth2-oidc GitHub](https://github.com/manfredsteyer/angular-oauth2-oidc)

---

## ✅ Fazit

Mit dieser Integration kannst du:

* Benutzer mit Google anmelden
* JSON-Dateien auf Drive speichern
* Diese Dateien öffentlich machen
* Anonym darauf zugreifen – ideal für Karten-, Konfigurations- oder Gebietsdaten

```


