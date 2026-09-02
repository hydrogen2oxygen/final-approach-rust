import {Component, Inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {Preacher, RegistryEntry, Territory} from '../../domains/Congregation';
import {MapService} from '../../services/map.service';

export interface PreacherTerritoryAssignment {
  territoryName: string;
  territoryNumber: string;
  assignedAt: Date;
}

export interface PreacherTerritoriesDialogData {
  preacherName: string;
  assignments: PreacherTerritoryAssignment[];
  territories: Territory[];
  territoryChanged: () => void;
}

@Component({
  selector: 'app-preacher-territories-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  templateUrl: './preacher-territories-dialog.component.html'
})
export class PreacherTerritoriesDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PreacherTerritoriesDialogData,
    private dialogRef: MatDialogRef<PreacherTerritoriesDialogComponent>,
    private mapService: MapService
  ) {
  }

  register(assignment: PreacherTerritoryAssignment): void {
    this.dialogRef.close(assignment.territoryNumber);
  }

  /**
   * Returns the territory to the pool, assigning it to a virtual Preacher named "CongregationPool"
   * @param assignment
   * @protected
   */
  protected backToPool(assignment: PreacherTerritoryAssignment): void {
    const territory = this.data.territories.find(item => item.number === assignment.territoryNumber);
    if (!territory) {
      return;
    }

    const openEntry = territory.registryEntryList.find(entry => !entry.returnDate);
    if (openEntry) {
      openEntry.returnDate = new Date();
    }

    const congregationPool = new Preacher();
    congregationPool.name = 'CongregationPool';

    const registryEntry = new RegistryEntry();
    registryEntry.territoryNumber = territory.number;
    registryEntry.territoryName = territory.name;
    registryEntry.preacher = congregationPool;
    registryEntry.returnDate = null;

    territory.registryEntryList.unshift(registryEntry);
    territory.uuid = crypto.randomUUID();
    if (territory.registryEntryList.length > 20) {
      territory.registryEntryList.pop();
    }

    this.mapService.saveTerritory(territory).subscribe(() => {
      this.data.assignments = this.data.assignments.filter(item => item !== assignment);
      this.data.territoryChanged();
    });

  }
}
