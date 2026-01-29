/**
 * Kokoushuoneen perusmalli – vastaa backendin Room-tyyppiä.
 *
 * Huom:
 * - Huoneet ovat kovakoodattuja/configista tulevia, eikä niille ole CRUD-APIa.
 */
export interface Room {
  id: string;   // esim. "room-a"
  name: string; // esim. "Room A"
}
