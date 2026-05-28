import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, Select, TextColorDropdown, Popuover } from './ui';
// import { Doc } from './index';

function App() {
	const elRef: any = useRef(null);
	const popuoverContainerRef: any = useRef(null);
	const menuRef: any = useRef(null);
	const textColorRef: any = useRef(null);

	const selectRef: any = useRef(null);
	const selectElRef: any = useRef(null);
	const textColorElRef: any = useRef(null);

	const popover0Ref: any = useRef(null);
	const popover1Ref: any = useRef(null);
	const btn0Ref: any = useRef(null);
	const btn1Ref: any = useRef(null);

	const textAlignRef: any = useRef(null);
	const markBarRef: any = useRef(null);
	const editorToolbarRef: any = useRef(null);

	useEffect(() => {
		menuRef.current = new Menu(elRef.current, {
			className: 'custom-theme',
			popuoverContainer: popuoverContainerRef.current,
			mode: 'inline',
			// mode: 'popuover',
			// shortKey: true,
			fieldNames: {
				key: 'id',
				label: 'name',
				children: 'subItems'
			},
			items: [
				{
					id: 'dashboard-group',
					name: '仪表盘分组',
					type: 'group',
					subItems: [
						{ id: 'analysis', name: '分析页', icon: '📊' },
						{ id: 'monitor', name: '监控台', icon: '🖥️' }
					]
				},
				{ type: 'divider' }, // 分割线
				{
					id: 'sub-system',
					name: '系统管理子单',
					icon: '⚙️',
					subItems: [
						{
							id: 'user-manage',
							name: '用户权限中心',
							icon: '👥',
							subItems: [
								{ id: 'user-list', name: '管理员用户列表' },
								{ id: 'role-control', name: '角色策略指派' }
							]
						},
						{ id: 'log-audit', name: '系统安全审计日志', icon: '📝' }
					]
				},
				{
					id: 'extension-service',
					name: '高级扩展云应用',
					icon: '☁️',
					subItems: [
						{ id: 'cloud-storage', name: '云对象存储空间' },
						{ id: 'cdn-delivery', name: 'CDN 内容加速配置' }
					]
				}
			],
			onSelect({ key, selectedKeys }) {
				console.log(`当前选择的节点是: ${key}`, `所有已选中的列表:`, selectedKeys);
			}
		});

		// menuRef.current.filter('指派');



		selectRef.current = new Select(selectElRef.current, {
			placeholder: '请选择需要的菜单功能...',
			options: [
				{
					id: 'group_sys',
					name: '系统设置',
					itemsList: [
						{ id: 'user_manage', name: '用户账户管理' },
						{ id: 'auth_setting', name: '权限资源控制' }
					]
				},
				{
					id: 'group_data',
					name: '数据分析',
					itemsList: [
						{ id: 'sales_report', name: '销售业绩报表' },
						{ id: 'finance_log', name: '财务对账日志' }
					]
				}
			],
			popuoverContainer: popuoverContainerRef.current,
			// shortKey: true,
			// 配置您所需要的关键字映射名称
			fieldNames: {
				key: 'id',
				label: 'name',
				children: 'itemsList'
			},
			value: 'sales_report',
			shortKey: true,
			onSelect(value, item) {
				console.log('Select 最终捕获到的选值 Key:', value);
				console.log('对应的原始完整数据节点对象:', item);
			}
		});
		// selectRef.current.value = 'sales_report'
		// selectRef.current.disabled = true;
    	// selectRef.current.readonly = true;


		textColorRef.current = new TextColorDropdown(textColorElRef.current, {
			title: '文本字体与背景高亮颜色',
			keyName: 'my_editor_color_history', // 独立控制最近使用颜色的本地缓存 Key
			
			// 初始化默认值
			defaultValue: {
				color: 'rgba(31,35,41,1)',          // 默认黑字
				backgroundColor: 'rgba(255,246,122,0.8)' // 默认浅黄背景
			},

			// 选中颜色时的回调
			onChange(params) {
				console.log('最新的颜色复合值对象:', params.value); 
				// 格式为: { color: "rgba(...)", backgroundColor: "rgba(...)" }
				
				console.log('具体改变的类型:', params.type); // 'color' 或 'backgroundColor'
				console.log('命中的颜色配置原始数据:', params.item);
			},

			// 下拉面板展开状态变化回调
			onDropdownChange(params) {
				console.log('下拉悬浮面板是否打开:', params.open);
			}
		});


		popover0Ref.current = new Popuover(btn0Ref.current, {
			trigger: 'click', 
			pos: 'tl-bl?',    // 經典下拉框左對齊自適應
			// gap: 6,
			// mask: true,       // 啟用防誤觸半透明遮罩層
			items: menuRef.current,
			onChange(status) {
				console.log(`[Popover] 狀態變更 -> 是否展開: ${status.open}, 觸發動作: ${status.action}`);
			}
		});

		popover1Ref.current = new Popuover(null, {
			// trigger: 'click', 
			pos: 'tl-bl?',    // 經典下拉框左對齊自適應
			// gap: 6,
			// mask: true,       // 啟用防誤觸半透明遮罩層
			items: menuRef.current,
			container: popuoverContainerRef.current,
			onChange(status) {
				console.log(`[Popover] 狀態變更 -> 是否展開: ${status.open}, 觸發動作: ${status.action}`);
			}
		});


		// 1. 一句话全功能拉起整个工具栏
		// const richEditorToolbar = new EditorToolbar(editorToolbarRef.current, {
		// 	// 初始传入的数据状态大束
		// 	data: {
		// 		textAlign: 'left', // 初始左对齐选中
		// 		strong: false, em: true, s: false, u: false, link: false, code: false, sup: false, sub: false,
		// 		textStyle: { color: 'rgba(31,35,41,1)', backgroundColor: 'rgba(255,255,255,0)' }
		// 	},
			
		// 	// 全场唯一的联动命令总监听钩子
		// 	onChange(params) {
		// 		console.log(`📡 工具栏向编辑器内核派发命令！`);
		// 		console.log(`改变动作大类: ${params.type}, 具体变更项: ${params.name}, 写入的新值:`, params.value);
		// 		console.log(`全量最新的全配置 Data 大状态树：`, params.data);
				
		// 		// 示例：直接把params.data套用或传给你的文档内核进行同步
		// 		// myDocumentCore.applyChanges(params);
		// 	}
		// });

	}, []);

	return (
		<div ref={popuoverContainerRef} style={{
			padding: '300px',
			display: 'flex',
			flexDirection: 'column',
			gap: '6px'
		}}>
			<div ref={elRef} style={{ width: '380px' }}></div>
			<div ref={selectElRef} style={{ width: '380px' }}></div>
			<div ref={textColorElRef} style={{ width: '380px' }}></div>
			<div>
				<button ref={btn0Ref}>绑定</button>
				<button ref={btn1Ref} onClick={() => {
					popover1Ref.current.show(btn1Ref.current.getBoundingClientRect());
				}}>手动</button>
			</div>
			<div ref={editorToolbarRef} style={{ width: '380px' }}></div>
		</div>
	);
}

// Render the app
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}

export default App;