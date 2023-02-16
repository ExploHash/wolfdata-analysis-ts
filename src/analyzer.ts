import * as fs from "fs";
import * as readline from "readline";
import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import { DataPoint } from "./types/datapoint";
import Position from "./models/Position";
import Wolf from "./models/Wolf";
import { config } from "./config";

export default class Analyzer {
  public wolves: Wolf[] = [];

  public start() {
    const fileStream = fs.createReadStream("data/wolves_sorted.csv");

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lastDate: dayjs.Dayjs;
    let counter = 0;
    let linesOfDay: DataPoint[] = [];

    console.log("Start processing");

    rl.on("line", (line) => {
      const parsedLine = parse(line, { delimiter: [";", ","] });
      //@ts-ignore
      const [, , dateTime, lon, lat, , , , , , , name] = parsedLine[0];

      //Get begin of day
      const date = dayjs(dateTime).startOf("day");
      if (!lastDate) {
        lastDate = date;
      }

      //If new day, handle old day
      if (!date.isSame(lastDate)) {
        this.handleDay(linesOfDay);
        linesOfDay = [];
        lastDate = date;
      }

      //Add line to day
      linesOfDay.push({
        date: date.toDate(),
        position: new Position(+lat, +lon),
        name,
      });

      counter++;
      if(counter % 1000 === 0) {
        this.printProgress(counter);
      }
    });

    rl.on("close", () => {
      //Replace key wolves with the name of the wolves
      this.printProgress(counter);
      console.log("\nFinished processing");

      const json = JSON.stringify(
        this.wolves,
        (key, value) => {
          if (key === "wolves") {
            return value.map((wolf: Wolf) => wolf.name);
          }
          return value;
        },
        2
      );
      fs.writeFileSync("data/wolves_out.json", json);
    });
  }

  private handleDay(lines: DataPoint[]) {
    //Group by name
    const groupedDataPoints = lines.reduce((acc: any, datapoint: DataPoint) => {
      if (!acc[datapoint.name]) {
        acc[datapoint.name] = [];
      }
      acc[datapoint.name].push(datapoint);
      return acc;
    }, {});

    //Create or update wolves
    for (const name in groupedDataPoints) {
      const wolf = this.wolves.find((wolf) => wolf.name === name);
      const averagePosition = Position.averagePositions(
        groupedDataPoints[name].map((dp: DataPoint) => dp.position)
      );

      if (wolf) {
        wolf.updatePosition(averagePosition, groupedDataPoints[name][0].date);
      } else {
        this.wolves.push(
          new Wolf(averagePosition, name, groupedDataPoints[name][0].date)
        );
      }
    }

    //Check bonds
    this.wolves.forEach((wolf) => wolf.checkBonds(lines[0].date));

    //Find new bonds
    for (const wolf of this.wolves) {
      for (const otherWolf of this.wolves) {
        if (wolf.name === otherWolf.name) {
          continue;
        }

        const distance = wolf.position.distanceTo(otherWolf.position);
        if (distance <= config.bondRangeMeters && !wolf.hasBondWith(otherWolf)) {
          wolf.addBond(otherWolf, lines[0].date);
        }
      }
    }
  }
  private printProgress(progress: number) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(progress + " items processed");
  }
}
