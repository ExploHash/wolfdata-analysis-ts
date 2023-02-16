import { Bond } from "./Bond";
import Position from "./Position";
import dayjs from "dayjs";
import { config } from "../config";

export default class Wolf {
  public position: Position;
  public lastUpdated: Date;
  public name: string;
  public bonds: Bond[];

  public noData: boolean = false;
  public noDataSince?: Date;
  public isDone: boolean = false;

  constructor(position: Position, name: string, date: Date) {
    this.position = position;
    this.lastUpdated = date;
    this.name = name;
    this.bonds = [];
  }

  public poke(date: Date) {
    if(this.noData){
      if(dayjs(date).diff(this.noDataSince, "day") > config.wolfMissingDataDoneDays) {
        this.isDone = true;
      }
    }else{
      this.noData = true;
      this.noDataSince = date;
    }
  }

  public isUpToDate(date: Date) {
    return dayjs(date).isSame(this.lastUpdated, "day");
  }

  public hasBondWith(wolf: Wolf) {
    return this.bonds.some((bond) =>
      bond.wolves.some((foundWolf) => foundWolf.name === wolf.name)
    );
  }

  public addBond(wolf: Wolf, date: Date) {
    this.bonds.push(new Bond([this, wolf], date));
    wolf.bonds.push(new Bond([this, wolf], date));
  }

  public updatePosition(position: Position, date: Date) {
    if (this.noData) {
      this.noData = false;
      this.noDataSince = undefined;
    }

    this.position = position;
    this.lastUpdated = date;
  }

  public checkBonds(date: Date) {
    this.bonds.forEach((bond) => bond.checkBond(date));
  }
}
