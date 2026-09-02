import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
    selector: 'app-documentation',
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    templateUrl: './documentation.component.html',
    styleUrl: './documentation.component.scss'
})
export class DocumentationComponent {

}
