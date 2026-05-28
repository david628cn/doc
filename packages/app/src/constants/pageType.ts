/** 与后端 model.PageType 对齐 */

export const PAGE_TYPE_DOCUMENT = 'document';
export const PAGE_TYPE_PPT = 'ppt';

export const PAGE_TYPE_OPTIONS: { label: string; value: string }[] = [
	{ label: '文档', value: PAGE_TYPE_DOCUMENT },
	{ label: 'PPT', value: PAGE_TYPE_PPT },
];

/** 分组标题顺序：其余类型按字典序排在后面 */
export const PAGE_TYPE_SECTION_ORDER: string[] = [PAGE_TYPE_DOCUMENT, PAGE_TYPE_PPT];

export function pageTypeLabel(code: string | undefined): string {
	const c = code?.trim() || PAGE_TYPE_DOCUMENT;
	switch (c) {
		case PAGE_TYPE_DOCUMENT:
			return '文档';
		case PAGE_TYPE_PPT:
			return 'PPT';
		default:
			return c;
	}
}
