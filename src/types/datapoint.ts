import Position from "../models/Position";

export type DataPoint = {
  date: Date;
  position: Position;
  name: string;
};