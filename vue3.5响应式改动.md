1.在 Vue3.5 以前的响应式中主要有两个角色：Sub（订阅者）、Dep（依赖）。其中的订阅者有 watchEffect、watch、render 函数、computed 等。依赖有 ref、reactive 等响应式变量。
Sub 订阅者和 Dep 依赖他们两的关系是多对多的关系！！！

<!--
dep.set(effect, effect._trackId);  Dep是用一个Map来存Sub
effect.deps[effect._depsLength++] = dep  Sub是用一个对象来存Dep
-->

在 Vue3.5 版本新的响应式中，Sub 订阅者和 Dep 依赖之间不再有直接的联系，而是新增了一个 Link 作为桥梁。Sub 订阅者通过 Link 访问到 Dep 依赖，同理 Dep 依赖也是通过 Link 访问到 Sub 订阅者。

Dep 依赖和 Sub 订阅者不再有直接的联系，而是通过 Link 节点作为桥梁。
依赖收集的过程中会构建 Dep 依赖的队列，队列是由 Link 节点组成。以及构建 Sub 订阅者的队列，队列同样是由 Link 节点组成。
依赖触发时就可以通过 Dep 依赖的队列的队尾出发，Link 节点可以访问和触发对应的 Sub 订阅者。
然后依次从队尾向队头移动，依次触发队列中每个 Link 节点的 Sub 订阅者。

2.关于 computed
computed 计算属性不仅是 Sub 订阅者还是 Dep 依赖。 原因是 computed 可以像 watchEffect 那样监听里面的响应式变量，当响应式变量改变后会触发 computed 的回调。还可以将 computed 的返回值当做 ref 那样的普通响应式变量去使用，所以我们才说 computed 不仅是 Sub 订阅者还是 Dep 依赖。
所以这里就是调用 link.sub.notify()不会触发计算属性 doubleCount 中的回调函数重新执行，而是去触发计算属性 doubleCount 的订阅者，也就是 render 函数。
在执行 render 函数之前会再去通过脏检查（依靠版本计数实现）去判断是否需要重新执行计算属性的回调，如果需要执行计算属性的回调那么就去执行 render 函数重新渲染。
