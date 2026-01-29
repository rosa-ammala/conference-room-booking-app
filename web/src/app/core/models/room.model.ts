// Kokoushuoneen perusmalli – vastaa backendin Room-tyyppiä.
// Huoneet ovat kovakoodattuja/configista tulevia, eikä niille ole CRUD-APIa.
export interface Room {
  id: string;
  name: string;
}
