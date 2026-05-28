/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** 空字符串表示与页面同域（由 Nginx 反代 /api、/oauth 等） */
	readonly VITE_CONTEXT_PATH?: string;
}
