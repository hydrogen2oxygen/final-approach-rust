import {Component, OnInit} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from "@angular/material/dialog";
import {Personas} from '../../domains/MapDesign';

@Component({
  selector: 'app-persona',
    imports: [
        MatButton,
        MatDialogActions,
        MatDialogClose,
        MatDialogContent,
        MatDialogTitle
    ],
  templateUrl: './persona.component.html',
  styleUrl: './persona.component.scss'
})
export class PersonaComponent {

  persona: string = localStorage.getItem('persona') || Personas.DESIGNER;

  constructor(private dialogRef: MatDialogRef<PersonaComponent>) {
  }

  protected select(persona: string) {
    localStorage.setItem('persona', persona);
    this.dialogRef.close({
      persona: persona
    });
  }
}
