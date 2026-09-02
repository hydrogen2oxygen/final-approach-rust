import {Component} from '@angular/core';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-do-not-visit-warning-dialog',
  imports: [MatDialogModule, MatIconModule],
  templateUrl: './do-not-visit-warning-dialog.component.html',
  styleUrl: './do-not-visit-warning-dialog.component.scss'
})
export class DoNotVisitWarningDialogComponent {
}
