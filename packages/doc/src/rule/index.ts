import { InputRule, textblockTypeInputRule, wrappingInputRule } from "prosemirror-inputrules";
import { TextSelection } from 'prosemirror-state';
import { createTableNode } from '../command';
// 1. 标题输入规则：匹配 1 到 4 个 # 号后面加一个空格（例如 "### "）
export const headingRule = (nodeType: any, maxLevel: number) => {
    return textblockTypeInputRule(
        new RegExp("^(#{1," + maxLevel + "})\\s$"),
        nodeType,
        match => ({ level: match[1].length })
    );
}

// 2. 引用块输入规则：匹配 "> "
export const blockquoteRule = (nodeType: any) => {
    return wrappingInputRule(/^\s*>\s$/, nodeType);
}

// 编写表格的 Markdown 触发规则
export const tableMarkdownRule = new InputRule(/^\|\|\|\s$/, (state, match, start, end) => {
    const $pos = state.doc.resolve(start);

    // 严格防御：只有在当前行首（也就是没有任何前置文字的空行）才允许触发
    if ($pos.parentOffset === 0) {
        const tr = state.tr;

        // 1. 彻底清空触发当前 Markdown 规则的这整个空行段落数据
        // $pos.before() 到 $pos.after() 代表了当前这一整行的物理绝对区间
        const currentBlockStart = $pos.before($pos.depth);
        const currentBlockEnd = $pos.after($pos.depth);

        // 2. 利用刚才已经验证成功的 createTableNode 函数生成 3x3 表格
        const tableNode = createTableNode(state.schema, 3, 3);

        // 3. 用生成的完整表格节点，干净利落地替换掉刚才的整个空行
        tr.replaceWith(currentBlockStart, currentBlockEnd, tableNode);

        // 4. 🚨 体验优化：表格生成后，把编辑器的闪烁光标自动定位到新表格的【第一个单元格内】
        // 否则光标会丢失或停留在表格外部无法直接打字
        const firstCellPos = currentBlockStart + 3; // 物理计算第一个单元格的内部文本位置
        if (firstCellPos < tr.doc.content.size) {
            // 动态通过状态机寻找表格内的选区位置并注入
            const $firstCell = tr.doc.resolve(firstCellPos);
            tr.setSelection(TextSelection.create(tr.doc, $firstCell.pos));
        }

        return tr.scrollIntoView();
    }
    return null;
});