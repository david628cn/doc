import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';
import { schema } from './model';

// 新增以下导入
import { keymap } from 'prosemirror-keymap';
// baseKeymap 定义了对于很多基础按键按下后的功能，例如回车换行，删除键等。
import { baseKeymap } from 'prosemirror-commands';
// history 是操作历史，提供了对保存操作历史以及恢复等功能，undo，redo 函数对应为进行 undo 操作与 redo 操作，恢复历史数据
import { history, undo, redo } from 'prosemirror-history';

const editorState = EditorState.create({
    schema,
    // 新增 keymap 插件。
    plugins: [
      // 这里 keymap 是个函数，运行后，会生成一个插件，插件功能即将基础按键绑定到对应的功能上，例如回车换行，删除键等。
      keymap(baseKeymap),
      // 接入 history 插件，提供输入历史栈功能
      history(),
      // 将组合按键 ctrl/cmd + z, ctrl/cmd + y 分别绑定到 undo, redo 功能上
      keymap({"Mod-z": undo, "Mod-y": redo})
    ]
})
  
// 创建编辑器视图实例，并挂在到 el 上
const editorView = new EditorView(dom, {
    state: editorState
})