export let activeEffectScope;

// const scope = effectScope()
// scope.run(() => {
//   const doubled = computed(() => counter.value * 2)
//   watch(doubled, () => console.log(doubled.value))
//   watchEffect(() => console.log('Count: ', doubled.value))
// })
// scope.stop()

class EffectScope {
  active = true;
  effects = []; // effects 收集内部的 effect
  parent; // parent:用来记录父 effectScope。
  scopes; // scopes 收集所有的子 effectScope
  constructor(detached = false) {
    //effectScope 有一个参数叫做 detached，默认是 false,表示当前 effectScope 可以被父亲 effectScope 收集；
    // true 的话表示当前 effectScope 不可以被父亲 effectScope 收集。
    if (!detached && activeEffectScope) {
      activeEffectScope.scopes || (activeEffectScope.scopes = []).push(this);
    }
  }
  run(fn) {
    if (this.active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = this.parent;
        this.parent = null;
      }
    }
  }
  stop() {
    if (this.active) {
      for (let i = 0; i < this.effects.length; i++) {
        this.effects[i].stop();
      }
      this.active = false;
    }
    if (this.scopes) {
      for (let i = 0; i < this.scopes.length; i++) {
        this.scopes[i].stop();
      }
    }
  }
}

export function recordEffectScope(effect) {
  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.push(effect);
  }
}

export function effectScope(detached) {
  return new EffectScope(detached);
}
