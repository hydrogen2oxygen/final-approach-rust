import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import type {Update} from '@tauri-apps/plugin-updater';
import {check} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {ToastrService} from 'ngx-toastr';
import {UpdateDialogComponent} from '../components/update-dialog/update-dialog.component';

@Injectable({providedIn: 'root'})
export class UpdateService {

  currentUpdate: Update | null = null;
  isChecking = false;
  isInstalling = false;

  private readonly isTauri = Boolean((window as any).__TAURI_INTERNALS__);
  private updateDialogOpen = false;

  constructor(
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
  }

  checkForUpdate(manualCheck = false): void {
    if (!this.isTauri) {
      if (manualCheck) {
        this.toastr.info('Update checks are only available in the desktop application.', 'Updates');
      }
      return;
    }

    if (this.isChecking || this.isInstalling) {
      return;
    }

    this.isChecking = true;
    check({timeout: 15_000})
      .then(update => {
        this.isChecking = false;
        this.currentUpdate = update;

        if (!update) {
          if (manualCheck) {
            this.toastr.success('You are already using the latest version.', 'Updates');
          }
          return;
        }

        this.showUpdateDialog(update);
      })
      .catch(error => {
        this.isChecking = false;
        console.error('Update check failed:', error);

        if (manualCheck) {
          this.toastr.error('The update check could not be completed.', 'Updates');
        }
      });
  }

  installUpdate(): void {
    if (!this.currentUpdate || this.isInstalling) {
      return;
    }

    this.isInstalling = true;
    this.currentUpdate.downloadAndInstall()
      .then(() => relaunch())
      .catch(error => {
        this.isInstalling = false;
        console.error('Update installation failed:', error);
        this.toastr.error('The update could not be installed.', 'Updates');
      });
  }

  private showUpdateDialog(update: Update): void {
    if (this.updateDialogOpen) {
      return;
    }

    this.updateDialogOpen = true;
    const dialogRef = this.dialog.open(UpdateDialogComponent, {
      width: '520px',
      maxWidth: '90vw',
      disableClose: true,
      data: {
        version: update.version,
        body: update.body
      }
    });

    dialogRef.afterClosed().subscribe(install => {
      this.updateDialogOpen = false;
      if (install) {
        this.installUpdate();
      }
    });
  }
}
