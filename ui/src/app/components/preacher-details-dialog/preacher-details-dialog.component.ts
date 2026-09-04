import {CommonModule} from '@angular/common';
import {Component, Inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {Preacher, ServiceGroup} from '../../domains/Congregation';

export type ServiceGroupRole = 'member' | 'overseer' | 'assistant';

export interface PreacherDetailsDialogData {
  title: string;
  preachers: Preacher[];
  copyLink: (preacher: Preacher) => void;
  deletePreacher: (preacher: Preacher) => void;
  getAssignedTerritoryCount: (preacher: Preacher) => number;
  openTerritories: (preacher: Preacher) => void;
  switchGroup: (preacher: Preacher) => void;
  canManageServiceGroups: boolean;
  serviceGroups: ServiceGroup[];
  createServiceGroup: (name: string) => boolean;
  deleteServiceGroup: (group: ServiceGroup) => void;
  assignServiceGroup: (preacher: Preacher, groupName: string) => void;
  assignServiceGroupRole: (preacher: Preacher, role: ServiceGroupRole) => void;
  getServiceGroupRole: (preacher: Preacher) => ServiceGroupRole;
}

@Component({
  selector: 'app-preacher-details-dialog',
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule],
  templateUrl: './preacher-details-dialog.component.html',
  styleUrl: './preacher-details-dialog.component.scss'
})
export class PreacherDetailsDialogComponent {

  newServiceGroupName: string = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: PreacherDetailsDialogData) {
  }

  createServiceGroup(): void {
    if (this.data.createServiceGroup(this.newServiceGroupName)) {
      this.newServiceGroupName = '';
    }
  }

  getServiceGroupName(preacher: Preacher): string {
    return preacher.serviceGroupName ?? '';
  }

  changeServiceGroup(preacher: Preacher, event: Event): void {
    this.data.assignServiceGroup(preacher, (event.target as HTMLSelectElement).value);
  }

  changeServiceGroupRole(preacher: Preacher, event: Event): void {
    this.data.assignServiceGroupRole(
      preacher,
      (event.target as HTMLSelectElement).value as ServiceGroupRole
    );
  }
}
