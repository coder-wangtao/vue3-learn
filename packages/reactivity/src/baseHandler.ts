import { isObject } from "@vue/shared";
import { activeEffect } from "./effect";
import { track, trigger } from "./reactiveEffect";
import { reactive } from "./reactive";
import { ReactiveFlags } from "./constants";

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    //取值 让响应式属性 和 effect 映射起来

    //依赖收集
    track(target, key);
    let res = Reflect.get(target, key, receiver);
    if (isObject(res)) {
      //当的值也是对象的时候，我们需要对这个对象进行代理，递归代理
      return reactive(res);
    }
    return res;
  },
  set(target, key, value, receiver) {
    //找到属性，让对应的effect重新执行
    //触发更新
    let oldValue = target[key];

    let result = Reflect.set(target, key, value, receiver);

    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }

    return result;
  },
};
