import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-info-dialog',
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    templateUrl: './info-dialog.component.html'
})
export class InfoDialogComponent {}
