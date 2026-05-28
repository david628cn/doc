/** 模糊搜索：关键字为空则不过滤；否则任一字段包含即命中（不区分大小写） */
export function matchesTextSearch(query: string, ...parts: (string | undefined | null | number)[]): boolean {
	const q = String(query ?? '').trim().toLowerCase();
	if (!q) return true;
	for (const p of parts) {
		if (p == null || p === '') continue;
		if (String(p).toLowerCase().includes(q)) return true;
	}
	return false;
}
