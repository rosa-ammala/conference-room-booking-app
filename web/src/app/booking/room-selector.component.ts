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

  @Output() roomSelected = new EventEmitter<string>();

  selectedRoomId: string | null = null;

  onSelect(roomId: string): void {
    this.selectedRoomId = roomId;
    this.roomSelected.emit(roomId);
  }
}
