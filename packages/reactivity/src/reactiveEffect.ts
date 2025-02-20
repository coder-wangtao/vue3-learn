import { activeEffect, trackEffect, triggerEffects } from "./effect";

const targetMap = new WeakMap(); //存放依赖收集的关系 防止内存泄露

export const createDep = (cleanup, key) => {
  const dep = new Map() as any;
  dep.cleanup = cleanup;
  dep.name = key;
  return dep;
};

export function track(target, key) {
  //activeEffect 有这个属性 说明这个key是在effect中访问的，没有说明在effect之外访问的不用进行收集
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }

    let dep = depsMap.get(key);

    if (!dep) {
      //新增的
      depsMap.set(
        key,
        (dep = createDep(() => {
          depsMap.delete(key); //后面用于清理不需要的属性
        }, key))
      );
    }

    trackEffect(activeEffect, dep);  //将当前的effect放入到dep(映射表)中，后续可以根据值的变化触发次dep中存放的effect
  }
}

export function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let dep = depsMap.get(key);
  if (dep) {
    triggerEffects(dep);
  }
}
