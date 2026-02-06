import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export const run = () => {
    const ydoc = new Y.Doc();
    const ytasks = ydoc.getText('content');
    const provider = new WebsocketProvider('ws://localhost:9000', 'room-A', ydoc);
    provider.on('status', (event) => {
        console.log('Provider status:', event);
    });
    const testDom = document.getElementById('id-test');
    // ytasks.observeDeep(() => {
    //     console.log('task', ytasks);
    //     testDom.innerHTML = '';
    // })

    // 1. 插入 (Insert)
    // 在索引 0 处插入文字
    ytasks.insert(0, 'Hello World')

    // 2. 删除 (Delete)
    // 从索引 5 开始删除 6 个字符
    ytasks.delete(5, 6)

    // 3. 格式化 (Format/Attributes) - 仅限富文本场景
    // 给前 5 个字符添加加粗属性
    ytasks.format(0, 5, { bold: true })


    console.log('ytasks>>>>', ytasks);

    testDom.innerHTML = ytasks.toString();

    return {
        // add(text: any) {
        //     const task = new Y.Map()
        //     task.set('id', Date.now())
        //     task.set('content', text)
        //     task.set('done', false)

        //     // 使用 transact 保证原子性
        //     ydoc.transact(() => {
        //         ytasks.push([task])
        //     })
        // },
        // remove(index: number) {
        //     ytasks.delete(index, 1);
        // },
        // toggle(index: number) {
        //     const task: any = ytasks.get(index)
        //     task.set('done', !task.get('done'))
        // }
    }
}



