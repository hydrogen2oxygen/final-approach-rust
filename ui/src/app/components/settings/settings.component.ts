import {Component, OnInit} from '@angular/core';
import {Personas} from '../../domains/MapDesign';
import {MapService} from '../../services/map.service';
import {Congregation} from '../../domains/Congregation';
import {MatDialogContent, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-settings',
  imports: [
    MatDialogContent, MatDialogModule, MatButtonModule, MatIconModule, ReactiveFormsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {

  persona: string = localStorage.getItem('persona') || Personas.DESIGNER;
  congregation: Congregation | undefined;
  congregationName = new FormControl('');
  note = new FormControl('');
  includeForeignLanguageGroup = new FormControl(false);
  foreignLanguageGroupName = new FormControl('');

  constructor(
    private dialogRef: MatDialogRef<SettingsComponent>,
    private mapService: MapService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.mapService.loadCongregation().subscribe(congregation => {
      this.congregation = congregation[0]
      this.congregationName.setValue(this.congregation.name)
      this.note.setValue(this.congregation.notes)
      console.log('SettingsComponent initialized')
    })

  }

  protected save() {
    this.congregation.notes = this.note.value;
    this.congregation.name = this.congregationName.value;
    this.mapService.saveCongregation(this.congregation).subscribe(()=> {
      this.toastr.success('Saved', 'Settings')

      this.dialogRef.close({
        congregation: this.congregation
      });
    });
  }

  protected readonly Personas = Personas;
}
