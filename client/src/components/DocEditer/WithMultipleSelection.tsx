
import { Range, Element, Text } from 'slate';

// 多选区管理插件
const WithMultipleSelection = (editor: any) => {
    const { onChange } = editor;

    // 存储多个选区
    editor.multipleSelections = [];

    // 添加选区
    editor.addSelection = (selection: any) => {
        if (selection && !Range.isCollapsed(selection)) {
            editor.multipleSelections.push(selection);
            editor.onChange(); // 触发重新渲染
        }
    };

    // 清除所有选区
    editor.clearSelections = () => {
        editor.multipleSelections = [];
        editor.onChange();
    };

    // 重写onChange以处理装饰器
    editor.onChange = () => {
        // 创建装饰器范围
        const ranges = editor.multipleSelections.map((selection: any) => ({
            anchor: selection.anchor,
            focus: selection.focus,
            highlight: true,
            color: getRandomColor() // 为每个选区生成不同颜色
        }));

        // 设置装饰器
        editor.decorate = (entry: any) => {
            const [node, path] = entry;

            if (Text.isText(node)) {
                const nodeRanges = ranges.filter((range: any) =>
                    Range.intersection(range, { anchor: { path, offset: 0 }, focus: { path, offset: node.text.length } })
                );

                return nodeRanges;
            }

            return [];
        };

        onChange();
    };

    return editor;
};

// 辅助函数：生成随机颜色
const getRandomColor = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    return colors[Math.floor(Math.random() * colors.length)];
};

export {
    WithMultipleSelection
};
