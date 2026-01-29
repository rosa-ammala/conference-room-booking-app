import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
// Router-konfiguraatiota ei vielä tarvita, mutta jätetään valmius:
// import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // provideRouter([]),
  ],
};
