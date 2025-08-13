import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { AppComponent } from './app/app.component';
import {provideHttpClient, withFetch} from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(), // required animations providers
    provideToastr(), // Toastr providers
    provideHttpClient(withFetch())
  ]
}).catch(err => console.error(err));
