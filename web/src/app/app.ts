import { Component } from '@angular/core';
import { BookingPageComponent } from './booking/booking-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BookingPageComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  title = 'Conference Room Booking App';
}
