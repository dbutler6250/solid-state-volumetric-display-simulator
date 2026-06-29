export type Complex = {
  re: number;
  im: number;
};

export const complex = (re: number, im = 0): Complex => ({ re, im });

export const add = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const subtract = (a: Complex, b: Complex): Complex => ({
  re: a.re - b.re,
  im: a.im - b.im,
});

export const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

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

export const scale = (a: Complex, factor: number): Complex => ({
  re: a.re * factor,
  im: a.im * factor,
});

export const magnitudeSquared = (a: Complex): number => a.re * a.re + a.im * a.im;
