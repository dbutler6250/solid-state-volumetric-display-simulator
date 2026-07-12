/** Minimal complex-number helpers for the transfer-matrix solver. */
export type Complex = {
  re: number;
  im: number;
};

export const complex = (re: number, im = 0): Complex => ({ re, im });

/** Adds two complex values. */
export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

/** Subtracts one complex value from another. */
export const subtract = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

/** Multiplies two complex values. */
export const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

/** Divides one complex value by another. */
export const divide = (a: Complex, b: Complex): Complex => {
  const denominator = b.re * b.re + b.im * b.im;

  if (denominator === 0) {
    throw new Error('Cannot divide by zero-valued complex number.');
  }

  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator,
  };
};

/** Scales a complex value by a real factor. */
export const scale = (a: Complex, factor: number): Complex => ({
  re: a.re * factor,
  im: a.im * factor,
});

/** Returns the squared magnitude of a complex value. */
export const magnitudeSquared = (a: Complex): number => a.re * a.re + a.im * a.im;

/** Returns the complex conjugate. */
export const conjugate = (a: Complex): Complex => ({ re: a.re, im: -a.im });

/** Returns the complex square root using the principal branch. */
export const sqrt = (a: Complex): Complex => {
  const magnitude = Math.hypot(a.re, a.im);
  const real = Math.sqrt(Math.max(0, (magnitude + a.re) / 2));
  const imag = Math.sqrt(Math.max(0, (magnitude - a.re) / 2));
  return a.im >= 0 ? { re: real, im: imag } : { re: real, im: -imag };
};

/** Returns the complex cosine. */
export const cos = (a: Complex): Complex => ({
  re: Math.cos(a.re) * Math.cosh(a.im),
  im: -Math.sin(a.re) * Math.sinh(a.im),
});

/** Returns the complex sine. */
export const sin = (a: Complex): Complex => ({
  re: Math.sin(a.re) * Math.cosh(a.im),
  im: Math.cos(a.re) * Math.sinh(a.im),
});
