import React from 'react';
import { View, Text } from '@carvy/ui';
import { resolveHeadSculptureUrl } from '@/utils/resolveHeadSculpture';

export interface GroupCompositeMember {
	head_sculpture?: string;
	username?: string;
	/** 备注（用户名）等展示名；无登录名时用作占位首字 */
	display_label?: string;
}

/** 解析群内存储的头像字段（与成员 head_sculpture 类似：URL / img:路径 / 相对路径） */
export function resolveStoredGroupAvatarUrl(raw?: string | null): string | undefined {
	if (!raw?.trim()) return undefined;
	const s = raw.trim();
	if (/^https?:\/\//i.test(s)) return s;
	if (s.startsWith('img:')) {
		return resolveHeadSculptureUrl(s.slice(4).trim());
	}
	if (s.startsWith('emoji:') || s.startsWith('svg:')) {
		return undefined;
	}
	return resolveHeadSculptureUrl(s);
}

/** 与聊天列表头像一致：优先登录名首字，其次展示名首字 */
function glyphFromMember(m: GroupCompositeMember): string {
	const login = (m.username ?? '').trim();
	if (login) return Array.from(login)[0] ?? '?';
	const label = (m.display_label ?? '').trim();
	if (label) return Array.from(label)[0] ?? '?';
	return '?';
}

/** 微信常见拼图：每行占几格（≤9 人）；行内均分宽度，行与行均分高度 */
function rowSpecsForCount(n: number): number[] {
	switch (n) {
		case 2:
			return [2];
		case 3:
			return [2, 1];
		case 4:
			return [2, 2];
		case 5:
			return [3, 2];
		case 6:
			return [3, 3];
		case 7:
			return [3, 3, 1];
		case 8:
			return [3, 3, 2];
		case 9:
			return [3, 3, 3];
		default:
			return [3, 3, 3];
	}
}

const Mini: React.FC<{
	member: GroupCompositeMember;
}> = ({ member }) => {
	const url = resolveHeadSculptureUrl(member.head_sculpture);
	const g = glyphFromMember(member);
	const [broken, setBroken] = React.useState(false);
	if (url && !broken) {
		return (
			<img
				src={url}
				alt=""
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					display: 'block',
				}}
				onError={() => setBroken(true)}
			/>
		);
	}
	return (
		<View
			style={{
				width: '100%',
				height: '100%',
				background: 'rgba(0,0,0,0.12)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Text fontWeight={600} fontSize={10} style={{ margin: 0, color: 'rgba(0,0,0,0.65)' }}>
				{g}
			</Text>
		</View>
	);
};

/**
 * 群头像：`groupAvatar` 非空则显示自定义图；否则微信群风格成员拼图（≤9 人）。
 */
export const GroupCompositeAvatar: React.FC<{
	members: GroupCompositeMember[];
	/** 服务端存储的自定义头像；非空且可解析为图片时优先展示 */
	groupAvatar?: string | null;
	size?: number;
	loading?: boolean;
	/** 无成员时的首字（通常为群名首字） */
	fallbackGlyph?: string;
}> = ({ members, groupAvatar, size = 40, loading, fallbackGlyph }) => {
	const list = members.slice(0, 9);
	const n = list.length;

	const [customBroken, setCustomBroken] = React.useState(false);
	React.useEffect(() => {
		setCustomBroken(false);
	}, [groupAvatar]);

	const customUrl = resolveStoredGroupAvatarUrl(groupAvatar ?? undefined);

	if (!loading && customUrl && !customBroken) {
		return (
			<View
				style={{
					width: size,
					height: size,
					borderRadius: size * 0.22,
					overflow: 'hidden',
					background: 'rgba(0,0,0,0.06)',
					flexShrink: 0,
				}}
			>
				<img
					src={customUrl}
					alt=""
					style={{
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						display: 'block',
					}}
					onError={() => setCustomBroken(true)}
				/>
			</View>
		);
	}

	if (loading) {
		return (
			<View
				style={{
					width: size,
					height: size,
					borderRadius: size * 0.22,
					background: 'rgba(0,0,0,0.08)',
					flexShrink: 0,
				}}
			/>
		);
	}

	if (n === 0) {
		return (
			<View
				style={{
					width: size,
					height: size,
					borderRadius: size * 0.22,
					background: 'rgba(0,0,0,0.08)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Text fontWeight={700} fontSize={Math.max(12, size * 0.38)} style={{ margin: 0 }}>
					{(fallbackGlyph ?? '?').slice(0, 1)}
				</Text>
			</View>
		);
	}

	if (n === 1) {
		return (
			<View
				style={{
					width: size,
					height: size,
					borderRadius: size * 0.22,
					overflow: 'hidden',
					background: 'rgba(0,0,0,0.06)',
					flexShrink: 0,
				}}
			>
				<Mini member={list[0]} />
			</View>
		);
	}

	const rowSpecs = rowSpecsForCount(n);
	let cursor = 0;
	const gap = 1;
	const thirdW = `calc((100% - ${2 * gap}px) / 3)`;

	return (
		<View
			style={{
				width: size,
				height: size,
				borderRadius: size * 0.22,
				overflow: 'hidden',
				background: '#d9d9d9',
				display: 'flex',
				flexDirection: 'column',
				gap,
				flexShrink: 0,
				boxSizing: 'border-box',
			}}
		>
			{rowSpecs.map((cellCount, ri) => {
				const slice = list.slice(cursor, cursor + cellCount);
				cursor += cellCount;
				const rowLen = slice.length;
				const isLastRow = ri === rowSpecs.length - 1;
				const isMiddlePattern = n === 3 && rowLen === 1;
				const isSevenTail = n === 7 && rowLen === 1 && isLastRow;

				return (
					<View
						key={ri}
						style={{
							flex: 1,
							display: 'flex',
							flexDirection: 'row',
							gap,
							minHeight: 0,
							minWidth: 0,
							alignItems: 'stretch',
							justifyContent:
								isMiddlePattern || isSevenTail ? 'center' : 'flex-start',
						}}
					>
						{slice.map((member, ci) => {
							let cellStyle: React.CSSProperties = {
								flex: 1,
								minWidth: 0,
								minHeight: 0,
								overflow: 'hidden',
								background: 'rgba(0,0,0,0.04)',
							};
							if (isMiddlePattern) {
								cellStyle = {
									...cellStyle,
									flex: `0 0 calc((100% - ${gap}px) / 2)`,
									maxWidth: `calc((100% - ${gap}px) / 2)`,
								};
							}
							if (isSevenTail) {
								cellStyle = {
									...cellStyle,
									flex: `0 0 ${thirdW}`,
									maxWidth: thirdW,
								};
							}
							return (
								<View key={`${ri}-${ci}`} style={cellStyle}>
									<Mini member={member} />
								</View>
							);
						})}
					</View>
				);
			})}
		</View>
	);
};
