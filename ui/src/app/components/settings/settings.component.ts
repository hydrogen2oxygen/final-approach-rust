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
  defaultFillColor = new FormControl('');
  defaultStrokeColor = new FormControl('');
  defaultTextFillColor = new FormControl('');
  defaultTextStrokeColor = new FormControl('');
  foreignFillColor = new FormControl('');
  foreignStrokeColor = new FormControl('');
  foreignTextFillColor = new FormControl('');
  foreignTextStrokeColor = new FormControl('');

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
      this.includeForeignLanguageGroup.setValue(this.congregation.includeForeignLanguageGroup)
      this.foreignLanguageGroupName.setValue(this.congregation.foreignLanguageGroupName)
      this.defaultFillColor.setValue(this.congregation.defaultFillColor)
      this.defaultStrokeColor.setValue(this.congregation.defaultStrokeColor)
      this.defaultTextFillColor.setValue(this.congregation.defaultTextFillColor)
      this.defaultTextStrokeColor.setValue(this.congregation.defaultTextStrokeColor)
      this.foreignFillColor.setValue(this.congregation.foreignFillColor)
      this.foreignStrokeColor.setValue(this.congregation.foreignStrokeColor)
      this.foreignTextFillColor.setValue(this.congregation.foreignTextFillColor)
      this.foreignTextStrokeColor.setValue(this.congregation.foreignTextStrokeColor)
      console.log('SettingsComponent initialized')
    })

  }

  protected save() {
    this.congregation.notes = this.note.value;
    this.congregation.name = this.congregationName.value;
    this.congregation.includeForeignLanguageGroup = this.includeForeignLanguageGroup.value;
    this.congregation.foreignLanguageGroupName = this.foreignLanguageGroupName.value;
    this.congregation.defaultFillColor = this.defaultFillColor.value;
    this.congregation.defaultStrokeColor = this.defaultStrokeColor.value;
    this.congregation.defaultTextFillColor = this.defaultTextFillColor.value;
    this.congregation.defaultTextStrokeColor = this.defaultTextStrokeColor.value;
    this.congregation.foreignFillColor = this.foreignFillColor.value;
    this.congregation.foreignStrokeColor = this.foreignStrokeColor.value;
    this.congregation.foreignTextFillColor = this.foreignTextFillColor.value;
    this.congregation.foreignTextStrokeColor = this.foreignTextStrokeColor.value;
    this.mapService.saveCongregation(this.congregation).subscribe(()=> {
      this.toastr.success('Saved', 'Settings')

      this.dialogRef.close({
        congregation: this.congregation
      });
    });
  }

  protected readonly Personas = Personas;
}
