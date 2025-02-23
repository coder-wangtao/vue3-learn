//主要是对节点元素的属性操作 class style event

import patchClass from "./modules/patchClass";
import patchEvent from "./modules/patchEvent";
import patchStyle from "./modules/patchStyle";
import patchAttr from "./modules/pathAttr";

export default function patchProp(el, key, preValue, nextValue) {
  if (key === "class") {
    return patchClass(el, nextValue);
  } else if (key === "style") {
    return patchStyle(el, preValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    return patchEvent(el, key, nextValue);
  } else {
    return patchAttr(el, key, nextValue);
  }
}
