import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Room } from '../core/models/room.model';

@Component({
  selector: 'app-room-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent {
  @Input({ required: true }) rooms: Room[] = [];

  @Input() selectedRoomId: string | null = null;

  @Output() roomSelected = new EventEmitter<string>();

  onSelect(roomId: string): void {
    this.roomSelected.emit(roomId);
  }
}
