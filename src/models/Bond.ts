import Wolf from "./Wolf";
import dayjs from "dayjs";

import { config } from "../config";

export enum BondStatus {
  Pending = "pending",
  Failed = "failed",
  Active = "active",
  Breaking = "breaking",
  Broken = "broken",
  Rebonded = "rebonded"
}

export class Bond {
  public wolves: Wolf[];
  public status: BondStatus;
  public pendingSince?: Date
  public activeSince?: Date;
  public breakingSince?: Date;
  public amountOfBreaks: number = 0;
  public failedSince?: Date;
  public bondedEver: boolean = false;

  public missingData: boolean = false;
  public missingDataSince?: Date;

  public finished: boolean = false;

  public data: any[] = [];

  constructor(wolves: Wolf[], pendingSince: Date) {
    this.wolves = wolves;
    this.status = BondStatus.Pending;
    this.pendingSince = pendingSince;
  }

  public checkBond(date: Date) {
    if(this.finished) {
      return;
    }
    //Check if wolfs are still in range
    const wolf1 = this.wolves[0];
    const wolf2 = this.wolves[1];
    const bothHaveData = wolf1.isUpToDate(date) && wolf2.isUpToDate(date);

    //Handle both wolfs missing data
    if(!wolf1.isUpToDate(date) && !wolf2.isUpToDate(date)) {
      if(!this.missingData) {
        this.missingData = true;
        this.missingDataSince = date;
        return;
      }else if(dayjs(date).diff(this.missingDataSince, "day") > config.missingDataFinishedDays) {
        this.finished = true;
        return;
      }
    }

    this.missingData = false;

    //Handle on of the wolfs done
    if(wolf1.isDone || wolf2.isDone) {
      this.finished = true;
      
      if(this.status === BondStatus.Breaking) {
        this.status = this.bondedEver ? BondStatus.Rebonded : BondStatus.Active;
      }
      return;
    }

    const distance = wolf1.position.distanceTo(wolf2.position);
    const inRange = bothHaveData && distance < config.bondRangeMeters;
    
    this.data.push({
      date: date,
      distance: distance,
      inRange: inRange,
      missingData: this.missingData,
    });

    //Update bond status
    this.updateBond(inRange, date);
  }


  private updateBond(found: boolean, date: Date) {
    switch (this.status) {
      case BondStatus.Pending:
        if (!found){
          this.status = BondStatus.Failed;
          this.failedSince = date;
        }else if(dayjs(date).diff(this.pendingSince, "day") > config.bondDays){
          this.status = this.bondedEver ? BondStatus.Rebonded : BondStatus.Active;
          this.activeSince = date;
          this.bondedEver = true;
        }
        break;
      case BondStatus.Active:
        if (!found){
          this.status = BondStatus.Breaking;
          this.breakingSince = date;
        }
        break;
      case BondStatus.Breaking:
        if (found){
          this.status = this.bondedEver ? BondStatus.Rebonded : BondStatus.Active;
        } else if(dayjs(date).diff(this.breakingSince, "day") > config.breakDays){
          this.status = BondStatus.Broken;
          this.amountOfBreaks++;
        }
        break;
      case BondStatus.Broken:
        if (found){
          this.status = BondStatus.Pending;
          this.pendingSince = date;
        }
        break;
      case BondStatus.Rebonded:
        if (!found){
          this.status = BondStatus.Breaking;
          this.breakingSince = date;
        }
        break;
    }
  }
}
