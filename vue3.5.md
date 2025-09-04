1.Vue3.5 版本中最大的改动就是响应式重构(版本计数和双向链表数据结构，灵感来源于 Preact signals)

在 Vue3.5 以前的响应式中主要有两个角色：Sub（订阅者）、Dep（依赖）。
其中的订阅者有 watchEffect、watch、render 函数、computed 等。依赖有 ref、reactive 等响应式变量。

2.props 支持解构(结构后不会丧失响应式)

<!-- const {name} = defineProps({
    name:String
}) -->

3.新增 baseWatch
具体来说，`baseWatch`函数的引入使得开发者可以在不依赖 Vue 组件的情况下使用`watch`功能，这为一些特定的使用场景提供了更多的可能性。 4.新增 onWatchCleanup

5.watch 返回值 runner 新增 pause、resume

<!--
import { watch } from'vue'
const { pause, resume, stop } = watch(source, (newVal, oldVal) => {
    console.log('数据变化:', newVal)
})

// 暂停监听
pause()

// 恢复监听
resume()

// 永久停止
stop()
-->

6.watch deep 支持传入数字

7.Teleport 新增 defer 属性,当目标容器由 Vue 渲染且晚于 Teleport 挂载时，defer 可确保正确解析

<!--
<template>
  <Teleport deferto="#late-div">
    <div>内容</div>
  </Teleport>
  <div id="late-div"></div>
</template>
-->

8.新增 useTemplateRef

<script setup>
import { useTemplateRef } from 'vue'

const inputRef = useTemplateRef('input')
</script>

<template>
  <input ref="input">
</template>

9.onWatcherCleanup()
新增 onWatcherCleanup() API，用于在 watch 中注册清理回调：
当监听的数据源变更时，会先执行上一次注册的清理函数，再执行新的副作用。组件卸载时自动触发清理
‌ 与 onCleanup 的区别 ‌:onCleanup 是 watch 回调的第三个参数，而 onWatcherCleanup 需从 vue 显式导入
onWatcherCleanup 可在 watchEffect 中使用，适用场景更广

<!--
import { watch, onWatcherCleanup } from 'vue'

watch(id, (newId) => {
  const controller = new AbortController()

  fetch(`/api/${newId}`, { signal: controller.signal }).then(() => {
    // 回调逻辑
  })

  onWatcherCleanup(() => {
    // 终止过期请求
    controller.abort()
  })
})
-->
