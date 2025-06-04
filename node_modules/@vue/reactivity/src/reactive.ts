import { isObject } from "@vue/shared";
import { mutableHandlers } from "./baseHandler";
import { ReactiveFlags } from "./constants";

//同一个对象代理多次，缓存起来，不重新创建
const reactiveMap = new WeakMap(); //防止内存泄露

function createReactiveObject(target) {
  if (!isObject(target)) {
    return target;
  }

  //判断有没有代理过,已经代理过了就不会再代理了
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  const exitsProxy = reactiveMap.get(target);
  if (exitsProxy) {
    return exitsProxy;
  }

  let proxy = new Proxy(target, mutableHandlers);

  reactiveMap.set(target, proxy);

  return proxy;
}

//reactive shallowReactive
export function reactive(target) {
  return createReactiveObject(target);
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}
