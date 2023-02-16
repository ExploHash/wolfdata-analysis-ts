export default class Position {
  public lat: number;
  public lon: number;

  constructor(lat: number, lon: number) {
    this.lat = lat;
    this.lon = lon;
  }

  public distanceTo(other: Position): number {
    var R = 6371; // Radius of the earth in km
    var dLat = this.deg2rad(other.lat - this.lat); // deg2rad below
    var dLon = this.deg2rad(other.lon - this.lon);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this.lat)) *
        Math.cos(this.deg2rad(other.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c * 1000; // Distance in m
    return d;
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  public static averagePositions(positions: Position[]): Position {
    let lat = 0;
    let lon = 0;
    positions.forEach((pos) => {
      lat += pos.lat;
      lon += pos.lon;
    });
    return new Position(lat / positions.length, lon / positions.length);
  }
}
