export function effect(fn, options?) {
  //创建一个响应式effect 数据变化后可以重新执行
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run();
  });

  _effect.run();
}

export let activeEffect;

class ReactiveEffect {
  public active = true; //创建的effect是响应式的
  constructor(public fn, public schedulder) {}

  run() {
    if (!this.active) {
      return this.fn(); //不是激活的，执行后，什么都不做
    }
    
    activeEffect = this;
    return this.fn; //依赖收集
  }
}
