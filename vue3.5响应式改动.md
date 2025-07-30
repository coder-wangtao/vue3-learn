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
版本计数主要有四个版本：全局变量 globalVersion、dep.version、link.version 和 computed.globalVersion。dep.version 和 link.version 如果不相等就说明当前响应式变量的值改变了，就需要让 Sub 订阅者进行更新。如果是计算属性作为 Dep 依赖时就不能通过 dep.version 和 link.version 去判断了，而是执行 refreshComputed 函数进行判断。在 refreshComputed 函数中首先会判断 globalVersion 和 computed.globalVersion 是否相等，如果相等就说明并没有响应式变量更新。如果不相等那么就会执行计算属性的回调函数，拿到最新的值后去比较计算属性的值是否改变。并且还会执行 prepareDeps 和 cleanupDeps 函数将那些计算属性不再依赖的响应式变量对应的 Link 节点从双向链表中移除。最后说一句，版本计数最大的赢家应该是 computed 计算属性，虽然引入版本计数后代码更难理解了。但是整体流程更加优雅，以及现在只需要通过判断几个 version 是否相等就能知道订阅者是否需要更新，性能当然也更好了。

3.  Vue3.5 响应式重构主要是通过双向链表和版本计数实现的，优化后内存占用减少了 56%。主要原因是：在新的响应式系统中多了一个 Link 节点用于链接 Sub 订阅者和 Dep 依赖，更新 Sub 订阅者依赖只是进行指针的变换，并且还能够复用 Link 节点以及将不再使用的 Link 节点给孤立出来便于 V8 更快的将这个 Link 节点给回收。此外还有 Sub 订阅者的触发也变得更加简单，以及现在是 computed 计算属性是惰性计算了，这些优化同样也优化了内存的使用。
