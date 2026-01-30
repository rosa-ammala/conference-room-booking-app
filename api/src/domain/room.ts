export const ROOMS = [
  { id: "room-a", name: "Room A" },
  { id: "room-b", name: "Room B" },
  { id: "room-c", name: "Room C" },
];

export type RoomId = (typeof ROOMS)[number]["id"];
export type Room = (typeof ROOMS)[number];

export const isValidRoomId = (roomId: string): roomId is RoomId => {
  return ROOMS.some((room) => room.id === roomId);
};

export const getRoomById = (roomId: RoomId): Room | undefined => {
  return ROOMS.find((room) => room.id === roomId);
};
