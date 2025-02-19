export function effect(fn, options?) {
  //创建一个响应式effect数据变化后可以重新执行
  const _effect = new ReactiveEffect(fn, () => {
    //scheduler
    _effect.run();
  });
  _effect.run();

  if (options) {
    Object.assign(_effect, options);
  }

  const runner = _effect.run.bind(_effect);
  runner.effect = _effect; //可以在run方法上获取effect的引用
  return runner; //外界可以让其重新run
}

export let activeEffect;

function preCleanEffect(effect) {
  effect._depsLength = 0;
  effect._trackId++; //每次执行id 都是+1 如果当前同一个effect执行，id就是相同的
}

function postCleanEffect(effect) {
  //[flag,a,b,c]
  //[flag] -> effect._depsLength = 1
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanDepEffect(effect.deps[i], effect); //删除映射表对应的effect
    }
    effect.deps.length = effect._depsLength; //更新依赖列表的长度
  }
}

class ReactiveEffect {
  _trackId = 0; //用于记录当前effect执行了几次
  deps = [];
  _depsLength = 0;
  _running = 0;

  public active = true; //创建的effect是响应式的

  //fn 用户传入的函数
  //如果fn中以来的数据发生变化后，需要重新调用 -> run()
  constructor(public fn, public scheduler) {}

  run() {
    if (!this.active) {
      return this.fn(); //不是激活的，执行后，什么都不做
    }
    let lastEffect = activeEffect;
    try {
      activeEffect = this;

      //effect重新执行前，需要将上一次的依赖清空 effect.deps
      preCleanEffect(this);
      this._running++;
      return this.fn(); //依赖收集  -> state.name state.age
    } finally {
      this._running--;
      postCleanEffect(this);
      activeEffect = lastEffect;
    }
  }

  stop() {
    this.active = false;
  }
}

export function cleanDepEffect(dep, effect) {
  dep.delete(effect);
  if (dep.size === 0) {
    dep.cleanup(); //如果map为空，则删除这个属性
  }
}

//_trackId用于记录i执行次数(防止一个属性在当前effect中多次依赖收集)
//[flag，name] 第一次
//[flag，age]  第二次

//[flag，age] 最后
export function trackEffect(effect, dep) {
  //需要重新去收集依赖，将不需要的移除掉
  // dep.set(effect, effect._trackId);
  // effect.deps[effect._depsLength++] = dep;
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId);
    let oldDep = effect.deps[effect._depsLength];
    //如果没有存过
    if (oldDep !== dep) {
      if (oldDep) {
        //删除老的
        cleanDepEffect(oldDep, effect);
      }
      //换成新的
      effect.deps[effect._depsLength++] = dep; //永远按照本次最新的来存放
    } else {
      effect._depsLength++;
    }
  }
}

export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    if (!effect._running) {
      if (effect.scheduler) {
        //如果不是正在执行，才能执行
        effect.scheduler(); //-> effect.run()
      }
    }
  }
}
