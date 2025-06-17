1.Vue3.5 版本中最大的改动就是响应式重构(版本计数和双向链表数据结构，灵感来源于 Preact signals)

在 Vue3.5 以前的响应式中主要有两个角色：Sub（订阅者）、Dep（依赖）。其中的订阅者有 watchEffect、watch、render 函数、computed 等。依赖有 ref、reactive 等响应式变量。

2.props 支持解构(结构后不会丧失响应式)

<!-- const {name} = defineProps({
    name:String
}) -->

3.新增 baseWatch

4.新增 onWatchCleanup

5.watch 返回值 runner 新增 pause、resume

6.watch deep 支持传入数字

7.Teleport 新增 defer 属性

8.新增 useTemplateRef
