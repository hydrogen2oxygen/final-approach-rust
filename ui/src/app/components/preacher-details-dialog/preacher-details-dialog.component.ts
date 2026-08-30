import {CommonModule} from '@angular/common';
import {Component, Inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {Preacher} from '../../domains/Congregation';

export interface PreacherDetailsDialogData {
  title: string;
  preachers: Preacher[];
  copyLink: (preacher: Preacher) => void;
  deletePreacher: (preacher: Preacher) => void;
  getAssignedTerritoryCount: (preacher: Preacher) => number;
  openTerritories: (preacher: Preacher) => void;
  switchGroup: (preacher: Preacher) => void;
}

@Component({
  selector: 'app-preacher-details-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './preacher-details-dialog.component.html',
  styleUrl: './preacher-details-dialog.component.scss'
})
export class PreacherDetailsDialogComponent {

  constructor(@Inject(MAT_DIALOG_DATA) public data: PreacherDetailsDialogData) {
  }
}
