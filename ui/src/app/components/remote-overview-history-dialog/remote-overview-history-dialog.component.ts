import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {
  RemoteOverviewHistoryEntry,
  RemoteOverviewHistoryService
} from '../../services/remote-overview-history.service';

@Component({
  selector: 'app-remote-overview-history-dialog',
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './remote-overview-history-dialog.component.html',
  styleUrl: './remote-overview-history-dialog.component.scss'
})
export class RemoteOverviewHistoryDialogComponent {

  entries: RemoteOverviewHistoryEntry[];

  constructor(
    private dialogRef: MatDialogRef<RemoteOverviewHistoryDialogComponent>,
    private historyService: RemoteOverviewHistoryService
  ) {
    this.entries = this.historyService.getEntries();
  }

  open(entry: RemoteOverviewHistoryEntry): void {
    this.dialogRef.close(entry);
  }

  remove(event: MouseEvent, entry: RemoteOverviewHistoryEntry): void {
    event.stopPropagation();
    this.historyService.remove(entry.id);
    this.entries = this.historyService.getEntries();
  }
}
