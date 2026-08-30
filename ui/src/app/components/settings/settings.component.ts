import {Component, OnInit} from '@angular/core';
import {Personas, TerritoryMap} from '../../domains/MapDesign';
import {MapService} from '../../services/map.service';
import {Congregation, TerritoryOverview} from '../../domains/Congregation';
import {MatDialogContent, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {ToastrService} from 'ngx-toastr';
import {ApiService} from '../../services/api.service';
import {forkJoin} from 'rxjs';

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

  // apiUUID represent the UUID of the API that is used to communicate with the internet-located server, where only spacial data is stored
  apiUUID = new FormControl('');
  apiSECRET = new FormControl('');
  rootURL = new FormControl('');

  constructor(
    private dialogRef: MatDialogRef<SettingsComponent>,
    private mapService: MapService,
    private toastr: ToastrService,
    private apiService:ApiService
  ) {}

  ngOnInit(): void {
    this.mapService.loadCongregation().subscribe(congregation => {
      this.congregation = congregation[0]
      this.apiService.setCongregation(this.congregation)

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
      this.apiUUID.setValue(this.congregation.apiUUID)
      this.apiSECRET.setValue(this.congregation.apiSECRET)
      this.rootURL.setValue(this.congregation.rootURL)
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
    this.congregation.apiUUID = this.apiUUID.value;
    this.congregation.apiSECRET = this.apiSECRET.value;
    this.congregation.rootURL = this.rootURL.value;

    this.apiService.setCongregation(this.congregation)

    this.mapService.saveCongregation(this.congregation).subscribe(()=> {
      this.toastr.success('Saved', 'Settings')

      this.dialogRef.close({
        congregation: this.congregation
      });
    });
  }

  protected readonly Personas = Personas;

  protected generateUUID() {
    if (confirm("WARNING!!! Do you want to generate a new UUID?")) {
      this.apiUUID.setValue(crypto.randomUUID());
      this.congregation.apiUUID = this.apiUUID.value;
      this.apiService.setCongregation(this.congregation)
    }
  }

  protected generateSECRET() {
    if (confirm("WARNING!!! Do you want to generate a new SECRET?")) {
      this.apiSECRET.setValue(crypto.randomUUID());
      this.congregation.apiSECRET = this.apiSECRET.value;
      this.apiService.setCongregation(this.congregation)
    }
  }

  async downloadApi(): Promise<void> {
    const response = await fetch('/API.php');
    let content = await response.text();

    content = content.replace(
      "'CHANGE_ME_SECRET_KEY'",
      `'${this.apiSECRET.value}'`
    );

    const blob = new Blob([content], {
      type: 'application/x-httpd-php;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${this.apiUUID.value}.php`;
    a.click();

    URL.revokeObjectURL(url);
  }

  ping() {
    this.apiService.setCongregation(this.congregation)
    this.apiService.ping().subscribe(
      () => {
        this.toastr.success('API is reachable', 'Settings')
      },
      (error) => {
        this.toastr.error('API is not reachable', 'Settings')
      }
    )
  }

  protected uploadUI() {
    this.apiService.setCongregation(this.congregation)
    this.apiService.uploadUI().subscribe(() => {
      this.toastr.success('UI files uploaded', 'Settings')
    })
  }

  protected uploadAllTerritoriesOverview(): void {
    this.congregation.apiUUID = this.apiUUID.value;
    this.congregation.apiSECRET = this.apiSECRET.value;
    this.congregation.rootURL = this.rootURL.value;
    this.apiService.setCongregation(this.congregation);

    forkJoin({
      mapDesigns: this.mapService.loadMapDesign(),
      territories: this.mapService.loadTerritories()
    }).subscribe({
      next: result => {
        const overview = new TerritoryOverview();
        overview.preacherName = `${this.congregation.name} territories`;
        overview.updatedAt = new Date();
        overview.territoryList = result.mapDesigns
          .map((mapDesign: TerritoryMap) => {
            const territory = result.territories.find(item => item.number === mapDesign.territoryNumber);

            return {
              ...mapDesign,
              url: territory?.uuid ?? ''
            };
          })
          .sort((first, second) => {
            const languageGroupComparison = Number(first.foreignLanguageGroup) - Number(second.foreignLanguageGroup);

            if (languageGroupComparison !== 0) {
              return languageGroupComparison;
            }

            const numberComparison = first.territoryNumber.localeCompare(second.territoryNumber, undefined, {
              numeric: true,
              sensitivity: 'base'
            });

            return numberComparison !== 0
              ? numberComparison
              : first.territoryName.localeCompare(second.territoryName, undefined, {sensitivity: 'base'});
          });

        const missingUuidCount = overview.territoryList.filter(mapDesign => !mapDesign.url).length;

        this.apiService.uploadJson('overview', overview).subscribe({
          next: () => {
            this.toastr.success('All-territories overview uploaded', 'Settings');

            if (missingUuidCount > 0) {
              this.toastr.warning(
                `${missingUuidCount} territory link(s) have no remote UUID. Synchronize and upload again.`,
                'Settings'
              );
            }
          },
          error: error => {
            console.error('Error uploading all-territories overview:', error);
            this.toastr.error('All-territories overview could not be uploaded', 'Settings');
          }
        });
      },
      error: error => {
        console.error('Error loading data for all-territories overview:', error);
        this.toastr.error('Local territories could not be loaded', 'Settings');
      }
    });
  }
}
