import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 1. 粒子组件：负责单个小圆点的散射动画
 */
const Particle = ({ angle, distance, color }: { angle: number; distance: number; color: string }) => {
	return (
		<motion.span
			initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
			animate={{
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance,
				scale: [0, 1, 0.5, 0],
				opacity: [1, 1, 0],
			}}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.6, ease: 'easeOut' }}
			style={{
				position: 'absolute',
				width: '6px',
				height: '6px',
				borderRadius: '50%',
				backgroundColor: color,
				pointerEvents: 'none',
				zIndex: 1,
			}}
		/>
	);
};

export type FavoriteProps = {
	initialIsStarred?: boolean;
	/** 紧凑模式：用于工具栏等场景 */
	compact?: boolean;
	/**
	 * 切换收藏状态。可返回 `false` 或 resolve 为 `false` 表示失败，组件会回滚视觉状态。
	 */
	onToggle?: (isStarred: boolean) => void | boolean | Promise<void | boolean>;
};

/**
 * 2. 主组件
 */
export const Favorite = ({ initialIsStarred = false, compact = false, onToggle }: FavoriteProps) => {
	const [isStarred, setIsStarred] = useState(initialIsStarred);
	const [showParticles, setShowParticles] = useState(false);

	useEffect(() => {
		setIsStarred(initialIsStarred);
	}, [initialIsStarred]);

	const starSize = compact ? 28 : 50;
	const wrapPad = compact ? 4 : 20;

	const toggleFavorite = async () => {
		const prev = isStarred;
		const nextState = !isStarred;
		setIsStarred(nextState);

		if (nextState) {
			setShowParticles(true);
			setTimeout(() => setShowParticles(false), 700);
		}

		let ok = true;
		if (onToggle) {
			try {
				const r = await Promise.resolve(onToggle(nextState));
				if (r === false) ok = false;
			} catch {
				ok = false;
			}
		}
		if (!ok) {
			setIsStarred(prev);
		}
	};

	const particleAngles = Array.from({ length: 8 }).map((_, i) => (i * 45) * (Math.PI / 180));

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative',
				padding: `${wrapPad}px`,
			}}
		>
			<AnimatePresence>
				{showParticles &&
					particleAngles.map((angle, index) => (
						<Particle
							key={index}
							angle={angle}
							distance={compact ? 32 : 50}
							color={index % 2 === 0 ? '#FFD700' : '#FF9800'}
						/>
					))}
			</AnimatePresence>

			<motion.button
				type="button"
				onClick={() => void toggleFavorite()}
				whileTap={{ scale: 0.8 }}
				style={{
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					outline: 'none',
					padding: 0,
					WebkitTapHighlightColor: 'transparent',
				}}
			>
				<motion.svg
					width={starSize}
					height={starSize}
					viewBox="0 0 1000 1000"
					xmlns="http://www.w3.org/2000/svg"
					initial={false}
					animate={{
						scale: isStarred ? [1, 1.15, 1] : 1,
						rotate: isStarred ? [0, 8, -8, 0] : 0,
						color: isStarred ? '#EAB308' : '#9CA3AF',
					}}
					transition={{
						type: 'spring',
						stiffness: 300,
						damping: 15,
						duration: 0.4,
					}}
					style={{
						display: 'block',
					}}
				>
					<path
						fill="currentColor"
						d="M917 403q-4-12-14-19.5t-22-8.5l-237-35-106-215q-5-11-15.5-17t-22-6-22 6-15.5 17L356 340l-237 35q-12 2-21 9.5T85.5 403t-.5 22.5T96 445l172 167-42 236q-2 12 2.5 23.5t14 18.5 21.5 8 23-5l213-111 212 111q9 5 20 5 13 0 23.5-7.5t15-18.5 2.5-23l-42-237 172-167q9-8 13-19t1-23M660 570q-15 15-12 36l30 175-156-83q-20-10-40 0l-156 83 30-175q3-21-12-36L219 445l175-26q10-1 18.5-7.5T426 396l74-159 78 160q5 9 13.5 15.5T610 420l175 25z"
					/>
				</motion.svg>
			</motion.button>
		</div>
	);
};
