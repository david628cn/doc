export interface ColorItem {
    label: string;
    value: string;
    type: 'color' | 'backgroundColor';
}

export const TEXT_COLORS: ColorItem[] = [
    { label: '黑色', value: 'rgba(31,35,41,1)', type: 'color' },
    { label: '灰色', value: 'rgba(143,149,158,1)', type: 'color' },
    { label: '红色', value: 'rgba(216,57,49,1)', type: 'color' },
    { label: '橙色', value: 'rgba(222,120,2,1)', type: 'color' },
    { label: '黄色', value: 'rgba(220,155,4,1)', type: 'color' },
    { label: '绿色', value: 'rgba(46,161,33,1)', type: 'color' },
    { label: '蓝色', value: 'rgba(36,91,219,1)', type: 'color' },
    { label: '紫色', value: 'rgba(100,37,208,1)', type: 'color' }
];

export const HIGHLIGHT_COLORS: ColorItem[] = [
    { label: '透明', value: 'rgba(255,255,255,0)', type: 'backgroundColor' },
    { label: '浅灰色', value: 'rgba(242,243,245,1)', type: 'backgroundColor' },
    { label: '浅红色', value: 'rgba(251,191,188,1)', type: 'backgroundColor' },
    { label: '浅橙色', value: 'rgba(254,212,164,0.8)', type: 'backgroundColor' },
    { label: '浅黄色', value: 'rgba(255,246,122,0.8)', type: 'backgroundColor' },
    { label: '浅绿色', value: 'rgba(183,237,177,0.8)', type: 'backgroundColor' },
    { label: '浅蓝色', value: 'rgba(186,206,253,0.7)', type: 'backgroundColor' },
    { label: '浅紫色', value: 'rgba(205,178,250,0.7)', type: 'backgroundColor' },
    { label: '中灰色', value: 'rgba(222,224,227,0.8)', type: 'backgroundColor' },
    { label: '灰色', value: 'rgba(187,191,196,1)', type: 'backgroundColor' },
    { label: '红色', value: 'rgba(247,105,100,1)', type: 'backgroundColor' },
    { label: '橙色', value: 'rgba(255,165,61,1)', type: 'backgroundColor' },
    { label: '黄色', value: 'rgba(255,233,40,1)', type: 'backgroundColor' },
    { label: '绿色', value: 'rgba(98,210,86,1)', type: 'backgroundColor' },
    { label: '蓝色', value: 'rgba(78,131,253,0.55)', type: 'backgroundColor' },
    { label: '紫色', value: 'rgba(147,90,246,0.55)', type: 'backgroundColor' }
];

// 内部复用的公共颜色解析工具函数
export function getRgba(colorStr: string) {
    if (!colorStr) return { r: 0, g: 0, b: 0, a: 1 };
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
            a: match[4] !== undefined ? parseFloat(match[4]) : 1
        };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
}

export function rgbaToString(obj: { r: number; g: number; b: number; a: number }) {
    return `rgba(${obj.r},${obj.g},${obj.b},${obj.a})`;
}
