import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';

export interface PreacherTerritoryAssignment {
  territoryName: string;
  territoryNumber: string;
  assignedAt: Date;
}

export interface PreacherTerritoriesDialogData {
  preacherName: string;
  assignments: PreacherTerritoryAssignment[];
}

@Component({
  selector: 'app-preacher-territories-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './preacher-territories-dialog.component.html'
})
export class PreacherTerritoriesDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PreacherTerritoriesDialogData,
    private dialogRef: MatDialogRef<PreacherTerritoriesDialogComponent>
  ) {
  }

  register(assignment: PreacherTerritoryAssignment): void {
    this.dialogRef.close(assignment.territoryNumber);
  }
}
