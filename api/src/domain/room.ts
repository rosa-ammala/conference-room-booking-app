export type RoomId = "room-a" | "room-b" | "room-c";

export interface Room {
  id: RoomId;
  name: string;
}

export const ROOMS: Room[] = [
  { id: "room-a", name: "Room A" },
  { id: "room-b", name: "Room B" },
  { id: "room-c", name: "Room C" },
];

export const isValidRoomId = (roomId: string): roomId is RoomId => {
  return ROOMS.some((room) => room.id === roomId);
};

export const getRoomById = (roomId: RoomId): Room | undefined => {
  return ROOMS.find((room) => room.id === roomId);
};
