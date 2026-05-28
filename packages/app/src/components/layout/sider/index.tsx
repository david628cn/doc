import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
	Tree,
	type TreeNode,
	Menu,
	Popuover,
	Avatar,
	Dialog,
	Flex,
	View,
	IconWrapper,
	// Divider,
	Title,
	Text,
	Button,
	Confirm,
	Alert,
	Input,
	message,
	Select,
} from '@carvy/ui';
import { CreateWorkspaceForm, type CreateWorkspaceValues } from '@/components/workspace/create';
import history from '@/utils/history';
import { useCurrentWorkspace } from '@/hooks';
import { WorkspaceRole } from '@/constants';
import { PAGE_TYPE_DOCUMENT, PAGE_TYPE_OPTIONS, pageTypeLabel } from '@/constants/pageType';
import { workspaceLibraryPath, pageDocPath, homePath } from '@/utils/appPaths';
import { createPage, deletePage, movePage, updatePageMeta } from '@/api/page';
import { mapPageDtoToTreeNodes, buildMovePayloadFromTree } from '@/utils/pageTreeDrag';
import { resolveMediaSrcForImg } from '@/utils/resolveHeadSculpture';
import { filterPageTreeBySearch } from '@/utils/pageTreeFilter';
import { CLASSNAME } from '@/config';
import './index.less';


const ICON_SPACE = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor"><path d="M333 708q-17 0-29.5 12.5T291 750t12.5 29.5T333 792t29.5-12.5T375 750t-12.5-29.5T333 708m0-250q-17 0-29.5 12.5T291 500t12.5 29.5T333 542t29.5-12.5T375 500t-12.5-29.5T333 458M667 83H333q-45 0-83 22.5t-60.5 61T167 250v500q0 45 22.5 83.5t60.5 61 83 22.5h334q45 0 83-22.5t60.5-61T833 750V250q0-45-22.5-83.5t-60.5-61T667 83m83 667q0 34-24.5 58.5T667 833H333q-34 0-58.5-24.5T250 750V643q38 23 83 24h334q45-1 83-24zm0-250q0 34-24.5 58.5T667 583H333q-34 0-58.5-24.5T250 500V393q38 23 83 24h334q45-1 83-24zm-83-167H333q-34 0-58.5-24.5T250 250t24.5-58.5T333 167h334q34 0 58.5 24.5T750 250t-24.5 58.5T667 333" /></svg>
);
const ICON_AI = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1091" fill="currentColor"><path d="m668 146 81 81h112v112l81 81-24 22-57 54v115H749l-58 55-23 22-70-70-374 373-22 23L97 909l-23-22 23-23 373-374-70-70 22-23 55-58V227h115l54-57zm1 92-41 43-9 10h-78v74l-9 9-43 45 27 27 122-123 23-22 127 127-145 145 26 26 45-43 9-9h74v-78l10-9 43-41-44-44-9-10v-74h-74l-10-9zm-8 153L165 887l37 37 495-496zm-53 345h64v32h32v64h-32v32h-64v-32h-32v-64h32zm192 64h64v64h64v64h-64v64h-64v-64h-64v-64h64z" /></svg>
);
const ICON_HOME = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
	</svg>
);
const ICON_SETTINGS = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.6-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.6.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
	</svg>
);

/** 通讯录：两人剪影 */
const ICON_CONTACTS = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
	</svg>
);

const ICON_TRASH = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="#e56458"><path d="M896 213.014H725v-42q0-55-36.5-91.5t-91.5-36.5H427q-55 0-91.5 36.5t-36.5 91.5v42H128q-19 0-31 12t-12 31 12 31 31 12h43v554q0 55 36.5 91.5t91.5 36.5h426q55 0 91.5-36.5t36.5-91.5v-554h43q19 0 31-12t12-31-12-31-31-12m-512-42q0-20 11.5-31.5t31.5-11.5h170q20 0 31.5 11.5t11.5 31.5v42H384zm384 682q0 20-11.5 31.5t-31.5 11.5H299q-20 0-31.5-11.5t-11.5-31.5v-554h512zm-341-426q-20 0-31.5 11.5t-11.5 30.5v256q0 20 11.5 31.5t31.5 11.5q19 0 30.5-11.5t11.5-31.5v-256q0-19-11.5-30.5t-30.5-11.5m170 0q-19 0-30.5 11.5t-11.5 30.5v256q0 20 11.5 31.5t30.5 11.5q20 0 31.5-11.5t11.5-31.5v-256q0-19-11.5-30.5t-31.5-11.5"></path></svg>
);

/** 竖向 ⋮，与文档标签栏「更多」一致 */
const ICON_MORE_VERTICAL = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<circle cx="12" cy="6" r="2" />
		<circle cx="12" cy="12" r="2" />
		<circle cx="12" cy="18" r="2" />
	</svg>
);

const ICON_RENAME = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
	</svg>
);

const ICON_PLUS = (
	<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor" aria-hidden>
		<path d="M811 469.014H555v-256q0-19-12-30.5t-31-11.5-31 11.5-12 30.5v256H213q-19 0-30.5 12t-11.5 31 11.5 31 30.5 12h256v256q0 19 12 30.5t31 11.5 31-11.5 12-30.5v-256h256q19 0 30.5-12t11.5-31-11.5-31-30.5-12" />
	</svg>
);

/** 目录：进入多选 / 显示勾选 */
const ICON_TREE_SELECT = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M3 5h2v2H3V5zm0 6h2v2H3v-2zm0 6h2v2H3v-2zm4-12h14v2H7V5zm0 6h14v2H7v-2zm0 6h14v2H7v-2z" />
	</svg>
);

/** 目录：退出多选 */
const ICON_TREE_EXIT_SELECT = (
	<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
		<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
	</svg>
);

/** 「页面」侧栏式：方形图标按钮（⋯ / +） */
const sectionToolbarIconBtn: React.CSSProperties = {
	width: `24px`,
	height: `24px`,
	minWidth: `24px`,
	padding: 0,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	borderRadius: `6px`,
};

export interface SiderProps {
	currentWorkspace?: any;
	workspaces?: any[];
	pages?: any[];
	/** me() 返回的第一个空间 id，用于侧栏个人文档树等 */
	defaultSpaceId?: string;
	/** 新建 / 删除 / 排序后刷新页面树 */
	refreshPageTree?: () => Promise<void>;
	onWorkspaceCreated?: (newWs: any) => void;
	onSelectWorkspace?: (id: string) => void;
}

export const Sider: React.FC<SiderProps> = (props) => {
	const { currentWorkspace, workspaces, pages, defaultSpaceId, refreshPageTree, onWorkspaceCreated, onSelectWorkspace } = props;
	const { workspaceId, role } = useCurrentWorkspace();
	const location = useLocation();
	const currentPath = location.pathname;
	const docPageMatch = currentPath.match(/^\/page\/([^/]+)/);
	/** 与树节点 key 一致（小写化），避免 UUID 大小写与 URL 不一致导致树行不高亮 */
	const selectedDocId = docPageMatch?.[1] ? String(docPageMatch[1]).toLowerCase() : undefined;
	const canMutatePages = role !== WorkspaceRole.Guest && Boolean(defaultSpaceId);

	const menuItems = useMemo(() => {
		const items: any[] = [];
		items.push({
			key: homePath(),
			label: '首页',
			icon: ICON_HOME,
		});
		if (workspaceId) {
			items.push({
				key: workspaceLibraryPath(workspaceId),
				label: '库',
				icon: ICON_SPACE,
			});
		}
		items.push(
			{ key: '/ai', label: '智能AI', icon: ICON_AI },
			{ key: '/contacts', label: '通讯录', icon: ICON_CONTACTS },
			{ key: '/profile', label: '设置', icon: ICON_SETTINGS },
		);
		return items;
	}, [workspaceId]);

	const selectedMenuKeys = useMemo(() => {
		if (workspaceId && /^\/page\//.test(currentPath)) {
			return [];
		}
		if (workspaceId && currentPath.startsWith(`/workspace/${workspaceId}/library`)) {
			return [workspaceLibraryPath(workspaceId)];
		}
		if (currentPath === '/' || /^\/home\/?$/.test(currentPath)) {
			return [homePath()];
		}
		if (workspaceId && currentPath.startsWith('/workspace/')) {
			return [];
		}
		if (currentPath === '/ai' || currentPath.startsWith('/ai/')) return ['/ai'];
		if (currentPath === '/contacts' || currentPath.startsWith('/contacts/')) return ['/contacts'];
		if (currentPath === '/profile' || currentPath.startsWith('/profile/')) return ['/profile'];
		return [];
	}, [currentPath, workspaceId]);

	const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
	/** 为 true 时文档树显示 checkbox，用于批量删除 */
	const [treeSelectMode, setTreeSelectMode] = useState(false);
	const [createTitleOpen, setCreateTitleOpen] = useState(false);
	const [createTitle, setCreateTitle] = useState('');
	const [createPageType, setCreatePageType] = useState(PAGE_TYPE_DOCUMENT);
	/** 非空：在对应页面下新建子文档；空：在知识库根下新建 */
	const [createParentId, setCreateParentId] = useState<string | null>(null);
	const [renameOpen, setRenameOpen] = useState(false);
	const [renamePageId, setRenamePageId] = useState('');
	const [renameTitle, setRenameTitle] = useState('');
	const [treeSearchQuery, setTreeSearchQuery] = useState('');

	const baseTreeData = useMemo(() => mapPageDtoToTreeNodes(pages as any[]), [pages]);
	const filteredBaseTree = useMemo(
		() => filterPageTreeBySearch(baseTreeData, treeSearchQuery),
		[baseTreeData, treeSearchQuery],
	);

	const deleteSinglePage = useCallback(
		async (pageId: string, label?: string) => {
			if (!canMutatePages) {
				Alert.warning({ message: '访客无权删除文档' });
				return;
			}
			Confirm({
				title: '删除文档',
				content: `确定删除「${label || '该文档'}」吗？其子页面将一并删除。`,
				onOk: async () => {
					const rs: any = await deletePage(pageId);
					if (rs?.code === 200) {
						setCheckedKeys((ks) => ks.filter((k) => String(k).toLowerCase() !== pageId.toLowerCase()));
						await refreshPageTree?.();
						if (selectedDocId === pageId.toLowerCase() && workspaceId) {
							history.push(workspaceLibraryPath(workspaceId));
						}
					}
				},
			});
		},
		[canMutatePages, refreshPageTree, selectedDocId, workspaceId],
	);

	const openRename = useCallback((pageId: string, title: string) => {
		setRenamePageId(pageId);
		setRenameTitle(title || '');
		setRenameOpen(true);
	}, []);

	const openCreateChild = useCallback(
		(parentPageId: string) => {
			if (!canMutatePages) {
				Alert.warning({
					message: role === WorkspaceRole.Guest ? '访客不可新建文档' : '暂无可用知识库',
				});
				return;
			}
			setCreateParentId(parentPageId);
			setCreateTitle('');
			setCreatePageType(PAGE_TYPE_DOCUMENT);
			setCreateTitleOpen(true);
		},
		[canMutatePages, role],
	);

	const submitRename = useCallback(async () => {
		const t = renameTitle.trim();
		if (!t) {
			Alert.warning({ message: '请输入标题' });
			return;
		}
		const rs: any = await updatePageMeta({ id: renamePageId, title: t });
		if (rs?.code === 200) {
			setRenameOpen(false);
			await refreshPageTree?.();
		} else {
			Alert.error({ message: rs?.message || '重命名失败' });
		}
	}, [renameTitle, renamePageId, refreshPageTree]);

	const decorateNodes = useCallback(
		(nodes: TreeNode[]): TreeNode[] =>
			nodes.map((node) => {
				const rawTitle = typeof node.title === 'string' ? node.title : '未命名';
				const pageId = String(node.key);
				const pt = (node as TreeNode & { raw?: { page_type?: string } }).raw?.page_type;
				const typeHint =
					pt && pt !== PAGE_TYPE_DOCUMENT ? (
						<Text as="span" fontSize={11} style={{ marginRight: 6, color: 'rgba(0,0,0,0.42)', flexShrink: 0 }}>
							[{pageTypeLabel(pt)}]
						</Text>
					) : null;
				return {
					...node,
					title: (
						<Flex className={`${CLASSNAME}-sider-tree-node`} align="center" gap={8} style={{ minWidth: 0, width: '100%', minHeight: 32 }}>
							{typeHint}
							<span
								style={{
									flex: 1,
									minWidth: 0,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									lineHeight: '22px',
								}}
							>
								{rawTitle}
							</span>
							<Flex
								className={`${CLASSNAME}-sider-tree-node-oper`}
								shrink={0}
								gap={2}
								align="center"
								style={{ flexShrink: 0 }}
								onPointerDown={(e) => e.stopPropagation()}
								onClick={(e) => e.stopPropagation()}
							>
								<Popuover
									trigger={['click']}
									pos="tl-bl?"
									zIndex={20}
									items={
										<Menu
											items={[
												{
													key: 'rename',
													label: '重命名',
													icon: (
														<IconWrapper iconSize="16px" style={{ color: 'rgba(0,0,0,0.65)' }}>
															{ICON_RENAME}
														</IconWrapper>
													),
												},
												{ type: 'divider' },
												{
													key: 'delete',
													label: <span style={{ color: '#ff4d4f' }}>删除</span>,
													icon: (
														<IconWrapper iconSize="16px" style={{ color: '#ff4d4f' }}>
															{ICON_TRASH}
														</IconWrapper>
													),
												},
											]}
											onSelect={(p: any) => {
												if (p?.key === 'rename') {
													openRename(pageId, rawTitle);
												}
												if (p?.key === 'delete') {
													deleteSinglePage(pageId, rawTitle);
												}
											}}
										/>
									}
								>
									<Button
										variant="link"
										color="text"
										style={{
											padding: 0,
											width: 24,
											height: 24,
											display: 'inline-flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
										}}
										title="更多"
									>
										<IconWrapper iconSize="16px">{ICON_MORE_VERTICAL}</IconWrapper>
									</Button>
								</Popuover>
								<Button
									variant="link"
									color="text"
									title="添加子文档"
									style={{
										padding: 0,
										width: 24,
										height: 24,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
									}}
									onClick={() => openCreateChild(pageId)}
								>
									<IconWrapper iconSize="16px">{ICON_PLUS}</IconWrapper>
								</Button>
							</Flex>
						</Flex>
					),
					children: node.children ? decorateNodes(node.children) : undefined,
				};
			}),
		[deleteSinglePage, openRename, openCreateChild],
	);

	const treeData = useMemo(() => {
		if (!canMutatePages) return filteredBaseTree;
		return decorateNodes(filteredBaseTree);
	}, [filteredBaseTree, canMutatePages, decorateNodes]);

	const handleCreateOpen = () => {
		if (!canMutatePages) {
			Alert.warning({
				message: role === WorkspaceRole.Guest ? '访客不可新建文档' : '暂无可用知识库',
			});
			return;
		}
		setCreateParentId(null);
		setCreateTitle('');
		setCreatePageType(PAGE_TYPE_DOCUMENT);
		setCreateTitleOpen(true);
	};

	const handleCreateSubmit = async () => {
		if (!defaultSpaceId) return;
		const title = createTitle.trim() || '未命名';
		const rs: any = await createPage({
			space_id: defaultSpaceId,
			title,
			page_type: createPageType,
			...(createParentId ? { parent_id: createParentId } : {}),
		});
		if (rs?.code === 200 && rs.data?.id) {
			setCreateTitleOpen(false);
			setCreateParentId(null);
			setCreatePageType(PAGE_TYPE_DOCUMENT);
			await refreshPageTree?.();
			history.push(pageDocPath(rs.data.id));
		} else if (rs?.message) {
			Alert.error({ message: rs.message });
		}
	};

	const handleBatchDelete = () => {
		if (!canMutatePages) {
			message.warning('访客无权删除文档' );
			return;
		}
		const keys = checkedKeys.map((k) => String(k).toLowerCase());
		if (keys.length === 0) {
			message.warning('请先在树中勾选要删除的文档');
			return;
		}
		Confirm({
			title: '批量删除',
			content: `确定删除选中的 ${keys.length} 个文档吗？其子页面将一并删除。`,
			onOk: async () => {
				for (const id of keys) {
					const rs: any = await deletePage(id);
					if (rs?.code !== 200) {
						Alert.error({ message: rs?.message || `删除 ${id} 失败` });
						await refreshPageTree?.();
						return;
					}
				}
				setCheckedKeys([]);
				setTreeSelectMode(false);
				await refreshPageTree?.();
				if (selectedDocId && keys.includes(selectedDocId) && workspaceId) {
					history.push(workspaceLibraryPath(workspaceId));
				}
			},
		});
	};

	const toggleTreeSelectMode = useCallback(() => {
		setTreeSelectMode((prev) => {
			if (prev) {
				setCheckedKeys([]);
				return false;
			}
			return true;
		});
	}, []);

	const [selectedWorspaceKeys, setSelectedWorspaceKeys] = useState<any[]>(
		currentWorkspace ? [currentWorkspace.workspace_id] : [],
	);
	const [createModalOpen, setCreateModalOpen] = useState(false);

	const workspaceDropdownItems = useMemo(() => {
		const auth = [];
		const team = [];
		if (workspaces) {
			for (let i = 0; i < workspaces.length; i++) {
				const item: any = workspaces[i];
				const menuItem = {
					key: item.workspace_id,
					label: item.name,
					icon: (
						<Avatar
							// bg={item.is_default ? 'rgb(160 137 255)' : 'rgb(231, 148, 91)'}
							bg="#171717"
							color="#fff"
							icon={(() => {
								const src = resolveMediaSrcForImg(item.icon);
								return src ? <img src={src} alt="" /> : item.icon;
							})()}
							title={item.name}
						/>
					),
				};
				if (item.is_default) {
					auth.push(menuItem);
				} else {
					team.push(menuItem);
				}
			}
		}
		const items = [
			{ type: 'group', label: '个人', children: auth },
			{ type: 'group', label: '团队', children: team },
		];
		return items;
	}, [workspaces]);

	useEffect(() => {
		if (currentWorkspace?.workspace_id) {
			setSelectedWorspaceKeys([currentWorkspace.workspace_id]);
		}
	}, [currentWorkspace]);

	const handleSuccessCreateWorkspace = async (values: CreateWorkspaceValues) => {
		setCreateModalOpen(false);
		onWorkspaceCreated?.(values);
	};

	return (
		<Flex as="aside" direction="column" shrink={0} style={{ width: '300px', borderRight: '1px solid var(--border-color)' }}>
			<Flex align="center" h="64px" px="10px">
				<Popuover trigger={['click']} pos={'tl-tr?'} zIndex={10}
					items={
						<View>
							<View w={280} overflow="auto" style={{ maxHeight: '400px' }}>
								<Menu
									selectedKeys={selectedWorspaceKeys}
									items={workspaceDropdownItems}
									onSelect={(params: any) => {
										if (params?.selectedKeys?.length) {
											setSelectedWorspaceKeys(params.selectedKeys);
											onSelectWorkspace?.(params.key);
										}
									}}
								/>
							</View>
							<View py={4} px={5}>
								<Button onClick={() => setCreateModalOpen(true)} style={{ width: '100%' }}>
									新建工作区
								</Button>
							</View>
						</View>
					}
				>
					{/* <Flex align="center"> */}
						<Button variant="soft" style={{ margin: '0 5px 0 0', paddingLeft: '6px', paddingRight: 0 }}>
							<Avatar
								color="#fff"
								// bg={currentWorkspace?.is_default ? '#171717' : 'rgb(231, 148, 91)'}
								bg="#171717"
								icon={(() => {
									const src = resolveMediaSrcForImg(currentWorkspace?.icon);
									return src ? <img src={src} alt="" /> : currentWorkspace?.icon;
								})()}
								title={currentWorkspace?.name}
							/>
							<Flex as="span" style={{ maxWidth: '100px' }}>
								<Title level={3} m={0} ellipsis>
									{currentWorkspace?.name}
								</Title>
							</Flex>
							<IconWrapper fontSize={16}>
								<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path></svg>
							</IconWrapper>
						</Button>
					{/* </Flex> */}
				</Popuover>
				<Flex as="span" shrink={0}>
					<Text fontSize={10} borderRadius={6} px={4} py={3} style={{ background: 'rgba(18, 17, 42, 0.05)' }}>
						免费版
					</Text>
				</Flex>
				<Flex as="span" ml="auto">
					<Button variant="soft" style={{
						width: '24px',
						height: '32px'
					}}>
						<IconWrapper iconSize="20px">
							<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor">
								<path d="M125 333h750q15-2 25.5-14t10.5-27.5-10.5-27.5-25.5-14H125q-15 2-25.5 14T89 291.5 99.5 319t25.5 14m750 334H125q-15 2-25.5 14T89 708.5 99.5 736t25.5 14h750q15-2 25.5-14t10.5-27.5-10.5-27.5-25.5-14m0-209H125q-17 0-29.5 12.5T83 500t12.5 29.5T125 542h750q17 0 29.5-12.5T917 500t-12.5-29.5T875 458" />
							</svg>
						</IconWrapper>
					</Button>
				</Flex>
			</Flex>
			<Flex direction="column" flex={1} px={8}>
				<Flex direction="column">
					<View>
						<Menu
							key={`main-nav-${workspaceId || 'x'}-${defaultSpaceId || 's'}`}
							mode="inline"
							items={menuItems as any}
							selectedKeys={selectedMenuKeys}
							onSelect={(params: any) => {
								history.push(params.key);
							}}
						/>
					</View>
				</Flex>
				<Flex direction="column" mt={10}>
					<Flex align="center" justify="space-between" pl={12} pr={9} py={8} style={{ flexShrink: 0 }}>
						<Text fontWeight={600} fontSize={14}>目录</Text>
						<Flex align="center" gap={4}>
							{canMutatePages && (
								<>
									<Button
										variant={treeSelectMode ? 'solid' : 'soft'}
										color={treeSelectMode ? 'blue' : undefined}
										style={sectionToolbarIconBtn}
										title={treeSelectMode ? '退出选择' : '选择文档'}
										aria-label={treeSelectMode ? '退出选择' : '选择文档'}
										onClick={toggleTreeSelectMode}
									>
										<IconWrapper iconSize="16px">
											{treeSelectMode ? ICON_TREE_EXIT_SELECT : ICON_TREE_SELECT}
										</IconWrapper>
									</Button>
									<Button
										variant="soft"
										style={sectionToolbarIconBtn}
										disabled={checkedKeys.length === 0}
										title={checkedKeys.length === 0 ? '请先勾选要删除的文档' : '删除所选'}
										aria-label="删除所选"
										onClick={handleBatchDelete}
									>
										<IconWrapper iconSize="16px" style={{ color: '#e56458' }}>
											{ICON_TRASH}
										</IconWrapper>
									</Button>
								</>
							)}
							<Button variant="soft" style={sectionToolbarIconBtn} title="新建文档" onClick={handleCreateOpen}>
								<IconWrapper iconSize="16px">
									<svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor">
										<path d="M811 469.014H555v-256q0-19-12-30.5t-31-11.5-31 11.5-12 30.5v256H213q-19 0-30.5 12t-11.5 31 11.5 31 30.5 12h256v256q0 19 12 30.5t31 11.5 31-11.5 12-30.5v-256h256q19 0 30.5-12t11.5-31-11.5-31-30.5-12" />
									</svg>
								</IconWrapper>
							</Button>
						</Flex>
					</Flex>
					<View px={12} pb={8} style={{ flexShrink: 0 }}>
						<Input
							value={treeSearchQuery}
							onChange={(v: string) => setTreeSearchQuery(v)}
							placeholder="搜索目录…"
						/>
					</View>
					<View>
						<Tree
							treeData={treeData}
							sortable={canMutatePages}
							checkable={canMutatePages && treeSelectMode}
							checkedKeys={checkedKeys}
							onCheck={(keys) => setCheckedKeys(keys.map(String))}
							// virtual
							// showLine
							selectedKeys={selectedDocId ? [selectedDocId] : []}
							onSelect={(p: { key: string }) => {
								history.push(pageDocPath(p.key));
							}}
							onDragEnd={async (params: { dragNode: { key?: React.Key }; treeData: TreeNode[] }) => {
								if (!canMutatePages || !defaultSpaceId || !params.dragNode?.key) return;
								const payload = buildMovePayloadFromTree(params.treeData, String(params.dragNode.key), defaultSpaceId);
								if (!payload) return;
								const rs: any = await movePage(payload);
								if (rs?.code !== 200) {
									Alert.error({
										message: rs?.message || '排序失败',
									});
								}
								await refreshPageTree?.();
							}}
						/>
					</View>
				</Flex>
			</Flex>

			<Dialog
				open={createModalOpen}
				title="创建工作区"
				onCancel={() => setCreateModalOpen(false)}
				onPopuoverDown={() => setCreateModalOpen(false)}
				footer={null}
			>
				<CreateWorkspaceForm onSuccess={handleSuccessCreateWorkspace} />
			</Dialog>

			<Dialog
				open={createTitleOpen}
				title={createParentId ? '新建子文档' : '新建文档'}
				onCancel={() => {
					setCreateTitleOpen(false);
					setCreateParentId(null);
					setCreatePageType(PAGE_TYPE_DOCUMENT);
				}}
				onPopuoverDown={() => {
					setCreateTitleOpen(false);
					setCreateParentId(null);
					setCreatePageType(PAGE_TYPE_DOCUMENT);
				}}
				footer={
					<>
						<Button
							variant="soft"
							type="button"
							onClick={() => {
								setCreateTitleOpen(false);
								setCreateParentId(null);
								setCreatePageType(PAGE_TYPE_DOCUMENT);
							}}
						>
							取消
						</Button>
						<Button color="black" type="button" onClick={() => void handleCreateSubmit()}>
							创建
						</Button>
					</>
				}
			>
				<View style={{ padding: '8px 20px 0 20px', boxSizing: 'border-box' }}>
					<Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8}>
						文档标题
					</Text>
					<Input value={createTitle} onChange={(v: string) => setCreateTitle(v)} placeholder="输入标题，留空为「未命名」" autoFocus/>
					<Text as="div" fontSize={14} fontWeight={600} color="#37352f" mb={8} mt={16}>
						类型
					</Text>
					<Select
						options={PAGE_TYPE_OPTIONS}
						value={createPageType}
						onChange={(v: string) => setCreatePageType(v)}
						style={{ width: '100%' }}
					/>
				</View>
			</Dialog>

			<Dialog
				open={renameOpen}
				title="重命名"
				onCancel={() => setRenameOpen(false)}
				onPopuoverDown={() => setRenameOpen(false)}
				footer={
					<>
						<Button variant="soft" type="button" onClick={() => setRenameOpen(false)}>
							取消
						</Button>
						<Button color="blue" type="button" onClick={() => void submitRename()}>
							保存
						</Button>
					</>
				}
			>
				<View style={{ padding: '8px 20px 0 20px', boxSizing: 'border-box' }}>
					<Text as="div" mb={10} fontSize={14} fontWeight={600} color="rgba(0,0,0,0.65)">
						页面标题
					</Text>
					<Input value={renameTitle} onChange={(v: string) => setRenameTitle(v)} placeholder="页面标题" />
				</View>
			</Dialog>
		</Flex>
	);
};

export default Sider;
