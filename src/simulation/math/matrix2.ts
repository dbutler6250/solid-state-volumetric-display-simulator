import { add, complex, multiply, type Complex } from './complex';

/** 2x2 matrix type used to accumulate layer transfer matrices. */
export type Matrix2 = readonly [
  readonly [Complex, Complex],
  readonly [Complex, Complex],
];

/** Returns the 2x2 identity matrix. */
export const identityMatrix2 = (): Matrix2 => [
  [complex(1), complex(0)],
  [complex(0), complex(1)],
];

/** Multiplies two 2x2 matrices. */
export const multiplyMatrix2 = (a: Matrix2, b: Matrix2): Matrix2 => [
  [
    add(multiply(a[0][0], b[0][0]), multiply(a[0][1], b[1][0])),
    add(multiply(a[0][0], b[0][1]), multiply(a[0][1], b[1][1])),
  ],
  [
    add(multiply(a[1][0], b[0][0]), multiply(a[1][1], b[1][0])),
    add(multiply(a[1][0], b[0][1]), multiply(a[1][1], b[1][1])),
  ],
];
