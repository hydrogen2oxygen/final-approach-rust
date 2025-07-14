import { Component, Inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-info-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './info-dialog.component.html'
})
export class InfoDialogComponent {
    appName: string;
    version: string;
    home: any;
    

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { appName: string, version: string, home: any },
        private dialogRef: MatDialogRef<InfoDialogComponent>
    ) {
        this.appName = data.appName;
        this.version = data.version;
        this.home = data.home;
    }
}
