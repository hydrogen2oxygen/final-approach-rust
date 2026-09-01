import {Component} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';

export interface RemoteOverviewAccess {
  preacherName: string;
  password: string;
}

@Component({
  selector: 'app-remote-overview-access-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './remote-overview-access-dialog.component.html',
  styleUrl: './remote-overview-access-dialog.component.scss'
})
export class RemoteOverviewAccessDialogComponent {

  preacherName = new FormControl('', {nonNullable: true, validators: Validators.required});
  password = new FormControl('', {nonNullable: true, validators: Validators.required});

  constructor(private dialogRef: MatDialogRef<RemoteOverviewAccessDialogComponent>) {
  }

  open(): void {
    const preacherName = this.preacherName.value.trim();

    if (!preacherName || !this.password.value) {
      this.preacherName.markAsTouched();
      this.password.markAsTouched();
      return;
    }

    this.dialogRef.close({
      preacherName,
      password: this.password.value
    } satisfies RemoteOverviewAccess);
  }
}
