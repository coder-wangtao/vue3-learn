interface Counter {
  (start: number): string;
  interval: number;
  reset(): void;
}

function getCounter(): Counter {
  let counter = function (a: number) {
    return "1";
  } as Counter;
  counter.interval = 123;
  counter.reset = function () {};
  return counter;
}
