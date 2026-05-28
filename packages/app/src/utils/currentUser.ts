/** 从 localStorage 读取当前登录用户 id（与 auth 写入格式一致） */
export function getCurrentUserId(): string | null {
	try {
		const raw = localStorage.getItem('user');
		if (!raw) return null;
		const u = JSON.parse(raw) as { id?: string | number };
		if (u?.id == null) return null;
		return String(u.id);
	} catch {
		return null;
	}
}

/** 登录名 username（用于展示「备注（用户名）」中的用户名） */
export function getCurrentUserLoginName(): string {
	try {
		const raw = localStorage.getItem('user');
		if (!raw) return '';
		const u = JSON.parse(raw) as { username?: string };
		return String(u?.username ?? '').trim();
	} catch {
		return '';
	}
}

export function getCurrentUserHeadSculpture(): string {
	try {
		const raw = localStorage.getItem('user');
		if (!raw) return '';
		const u = JSON.parse(raw) as { head_sculpture?: string };
		return u?.head_sculpture;
	} catch {
		return '';
	}
}