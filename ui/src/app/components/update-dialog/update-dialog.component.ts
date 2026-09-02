import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';

export interface UpdateDialogData {
  version: string;
  body?: string | null;
}

@Component({
  selector: 'app-update-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './update-dialog.component.html',
  styleUrl: './update-dialog.component.scss'
})
export class UpdateDialogComponent {

  constructor(@Inject(MAT_DIALOG_DATA) protected data: UpdateDialogData) {
  }
}
