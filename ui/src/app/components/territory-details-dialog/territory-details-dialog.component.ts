import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {ForeignLanguageCoverage} from '../../domains/MapDesign';

export interface TerritoryDetailsItem {
  territoryNumber: string;
  territoryName: string;
  lastAssignedAt: Date | null;
  lastPreacherName: string | null;
  foreignLanguageCoverage: ForeignLanguageCoverage;
}

export interface TerritoryDetailsDialogData {
  title: string;
  territories: TerritoryDetailsItem[];
}

@Component({
  selector: 'app-territory-details-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './territory-details-dialog.component.html',
  styleUrl: './territory-details-dialog.component.scss'
})
export class TerritoryDetailsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TerritoryDetailsDialogData,
    private dialogRef: MatDialogRef<TerritoryDetailsDialogComponent>
  ) {
  }

  protected selectTerritory(territory: TerritoryDetailsItem): void {
    this.dialogRef.close(territory.territoryNumber);
  }
}
