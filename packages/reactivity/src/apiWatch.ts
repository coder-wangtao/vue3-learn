import { isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";

export function watch(source, cb, options = {} as any) {
  return doWatch(source, cb, options);
}

function traverse(source, depth, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) {
    return source;
  }
  if (depth) {
    if (currentDepth >= depth) {
      return source;
    }
    currentDepth++;
  }
  if (seen.has(source)) {
    return source;
  }

  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen);
  }
  return source;
}

function doWatch(source, cb, { deep }) {
  const reactiveGetter = (source) =>
    traverse(source, deep === false ? 1 : undefined);

  //忏悔书呢个一个可以给ReactivEffect来使用的getter，需要对这个对象进行取值操作，会关联当前的reactiveEffect
  let getter = () => reactiveGetter(source);
  let oldValue;

  const job = () => {
    const newValue = effect.run();
    cb(newValue, oldValue);
    oldValue = newValue;
  };

  const effect = new ReactiveEffect(getter, job);

  effect.run();
}
