declare module 'jsqr' {
  interface Point {
    x: number;
    y: number;
  }

  interface QRCode {
    binaryData: number[];
    data: string;
    chunks: any[];
    version: number;
    location: {
      topRightCorner: Point;
      topLeftCorner: Point;
      bottomRightCorner: Point;
      bottomLeftCorner: Point;
      topRightFinderPattern: Point;
      topLeftFinderPattern: Point;
      bottomLeftFinderPattern: Point;
      bottomRightAlignmentPattern?: Point;
    };
  }

  interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
  }

  function jsQR(data: Uint8ClampedArray, width: number, height: number, options?: Options): QRCode | null;

  export default jsQR;
}
