import { Component } from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from "@angular/material/dialog";

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

}
