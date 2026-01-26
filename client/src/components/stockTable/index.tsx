import React, { useState, useEffect } from 'react';
// import { useIntl } from "react-intl";
import { Space } from 'antd';
import DataTable from '@/components/dataTable';
import { formatNumberWithUnit } from '@/utils/common';
import styles from './index.module.less';

const columns: Array<any> = [
	{
		title: '代码',
		dataIndex: 'code',
		key: 'code',
		width: 90
	},
	{
		title: '名称',
		dataIndex: 'name',
		key: 'name',
		// width: 100
	},
	{
		title: '日期',
		dataIndex: 'date',
		key: 'date',
		// width: 100
		render: (text: any, record: any, index: number) => {
			return new Date(text).toLocaleDateString();
		}
	},
	{
		title: '收盘',
		dataIndex: 'current',
		key: 'current',
		align: 'right',
		width: 100,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			let pv = parseFloat(record['prev'] || 0);
			if (v < pv) {
				color = '#4caf50';
			} else if (v > pv) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
		// (
		// 	<>
		// 		{tags.map((tag: any) => {
		// 			let color = tag.length > 5 ? 'geekblue' : 'green';
		// 			if (tag === 'loser') {
		// 				color = 'volcano';
		// 			}
		// 			return (
		// 				<Tag color={color} key={tag}>
		// 					{tag.toUpperCase()}
		// 				</Tag>
		// 			);
		// 		})}
		// 	</>
		// )
	},
	{
		title: '开盘',
		dataIndex: 'open',
		key: 'open',
		align: 'right',
		width: 100,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			let pv = parseFloat(record['prev'] || 0);
			if (v < pv) {
				color = '#4caf50';
			} else if (v > pv) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
	},
	{
		title: '最低',
		dataIndex: 'low',
		key: 'low',
		align: 'right',
		width: 100,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			let pv = parseFloat(record['prev'] || 0);
			if (v < pv) {
				color = '#4caf50';
			} else if (v > pv) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
	},
	{
		title: '最高',
		dataIndex: 'high',
		key: 'high',
		align: 'right',
		width: 100,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			let pv = parseFloat(record['prev'] || 0);
			if (v < pv) {
				color = '#4caf50';
			} else if (v > pv) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
	},
	{
		title: '昨收',
		dataIndex: 'prev',
		key: 'prev',
		align: 'right',
		width: 100,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			let pv = parseFloat(record['prev'] || 0);
			if (v < pv) {
				color = '#4caf50';
			} else if (v > pv) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
	},
	{
		title: '涨跌幅',
		dataIndex: 'price',
		key: 'price',
		align: 'right',
		width: 80,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			// v = v / 100;
			if (v < 0) {
				color = '#4caf50';
			} else if (v > 0) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}%</span>;
		}
	},
	{
		title: '涨跌额',
		dataIndex: 'amount',
		key: 'amount',
		align: 'right',
		width: 120,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			if (v < 0) {
				color = '#4caf50';
			} else if (v > 0) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}</span>;
		}
	},
	{
		title: '成交量（手）',
		dataIndex: 'quantity',
		key: 'quantity',
		align: 'right',
		width: 120,
		render: (text: any, record: any, index: number) => {
			return formatNumberWithUnit(text);
		}
	},
	{
		title: '成交额',
		dataIndex: 'volume',
		key: 'volume',
		align: 'right',
		width: 120,
		render: (text: any, record: any, index: number) => {
			return formatNumberWithUnit(text);
		}
	},
	{
		title: '振幅',
		dataIndex: 'amplitude',
		key: 'amplitude',
		align: 'right',
		width: 80,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			// v = v / 100;
			if (v < 0) {
				color = '#4caf50';
			} else if (v > 0) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}%</span>;
		}
	},
	{
		title: '换手率',
		dataIndex: 'turnover',
		key: 'turnover',
		align: 'right',
		width: 80,
		render: (text: any, record: any, index: number) => {
			let color = '#333';
			let v = parseFloat(text || 0);
			// v = v / 100;
			if (v < 0) {
				color = '#4caf50';
			} else if (v > 0) {
				color = '#ff0000';
			}
			return <span style={{ color }}>{v.toFixed(2)}%</span>;
		}
	},
	// {
	// 	title: '市盈率（动态）',
	// 	dataIndex: 'pe',
	// 	key: 'pe',
	// 	align: 'right',
	// 	width: 130,
	// 	render: (text: any, record: any, index: number) => {
	// 		let color = '#333';
	// 		let v = parseFloat(text || 0);
	// 		if (v < 0) {
	// 			color = '#4caf50';
	// 		} else if (v > 0) {
	// 			color = '#ff0000';
	// 		}
	// 		return <span style={{ color }}>{ v.toFixed(2)}</span>;
	// 	}
	// },
	// {
	// 	title: '市净率',
	// 	dataIndex: 'pb',
	// 	key: 'pb',
	// 	align: 'right',
	// 	width: 80,
	// 	render: (text: any, record: any, index: number) => {
	// 		let color = '#333';
	// 		let v = parseFloat(text || 0);
	// 		if (v < 0) {
	// 			color = '#4caf50';
	// 		} else if (v > 0) {
	// 			color = '#ff0000';
	// 		}
	// 		return <span style={{ color }}>{v.toFixed(2)}</span>;
	// 	}
	// },
	{
		title: '',
		key: 'action',
		width: 150,
		render: (text: any, record: any, index: number) => {
			return (
				<Space size="middle">
					<a>详情</a>
				</Space>
			);
		}
	}
	// {
	// 	title: 'Status',
	// 	dataIndex: 'status',
	// 	width: 120,
	// 	key: 'status',
	// 	render: (text: any, record: any, index: number) => {
	// 		return <Progress percent={ parseFloat(text) } size="small" />;
	// 	}
	// },
	// {
	// 	title: 'CreateTime',
	// 	dataIndex: 'createTime',
	// 	key: 'createTime',
	// 	width: 200,
	// 	render: (text: any, record: any, index: number) => {
	// 		return new Date(text).toLocaleString();
	// 	}
	// },
	// {
	// 	title: 'ModifyTime',
	// 	dataIndex: 'modifyTime',
	// 	key: 'modifyTime',
	// 	width: 200,
	// 	render: (text: any, record: any, index: number) => {
	// 		return new Date(text).toLocaleString();
	// 	}
	// },
	// {
	// 	title: 'Action',
	// 	dataIndex: 'action',
	// 	width: 250,
	// 	render: (_: any, record: any) => {
	// 		return <Space size="middle">
	// 			<Button onClick={(e: any) => {
	//                 // history.push({
	//                 //     pathname: '/chat',
	//                 //     query: {
	//                 //         id: record.id
	//                 //     }
	//                 // });
	//             }}>Open</Button>
	// 			<Popconfirm
	// 				title="Are you sure to delete this task?"
	// 				// description="Are you sure to delete this task?"
	// 				onConfirm={(e: any) => {
	// 					// del({
	// 					// 	id: record.id
	// 					// });
	// 				}}
	// 				okText="Yes"
	// 				cancelText="No"
	// 			>
	// 				<Button danger>Delete</Button>
	// 			</Popconfirm>
	// 		</Space>
	// 	}
	// }
];

interface IProps {
	columns?: Array<any>;
	pagination?: any;
	loading?: boolean;
	dataList?: Array<any>;
	selectedRowKeys?: Array<any>;
	onPagination?: Function;
	onRowSelection?: Function;
}

const StockTable: React.FC<IProps> = props => {
	// const [dataList, setDataList] = useState<Array<any>>(props.data || []);
	// const [pagination, setPagination] = useState(props.pagination || {
	// 	total: 0, 
	// 	pageNum: 1, 
	// 	pageSize: 10
	// });
	// const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>(props.selectedRowKeys || []);
	// const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>([]);
	// const [loading, setLoading] = useState(false);

	// const { formatMessage } = useIntl();

	// useEffect(() => {
	//     // getList({
	// 	// 	pageNum: pagination.pageNum,
	// 	// 	pageSize: pagination.pageSize
	// 	// });
	// }, []);

	// useEffect(() => {
	//     setSelectedRowKeys(props.selectedRowKeys || []);
	// }, [props.selectedRowKeys]);

	// const getList = async (params: any) => {
	//     setLoading(true);
	//     const result = await listProject(params);
	//     setLoading(false);
	// 	if (result.code === 200) {
	// 		const { list = [], total = 0 } = result.data || {};
	// 		setDataList(list);
	// 		setPagination({
	//             pageNum: params.pageNum,
	//             pageSize: params.pageSize,
	// 			total
	// 		});
	// 	} else {
	// 		setDataList([]);
	// 		setPagination({
	//             pageNum: 1,
	//             pageSize: params.pageSize,
	// 			total: 0
	// 		});
	// 	}
	// }

	// const handleSumbit = async (values: any) => {
	//     const result = await addProject(values);
	//     if (result.code === 200) {
	//         message.success(
	//             formatMessage({
	//                 id: 'operation-success'
	//             })
	//         )
	//         getList({
	//             pageNum: 1,
	//             pageSize: pagination.pageSize
	//         });
	//     } else {
	//         message.error(
	//             result.message || formatMessage({
	//                 id: 'operation-error'
	//             })
	//         )
	//     }
	// };

	// const del = async (params: Array<any> = []) => {
	// 	console.log(params);
	// 	if (!params.length) {
	// 		message.warning(
	//             formatMessage({
	//                 id: 'please-select'
	//             })
	//         )
	// 		return;
	// 	} 
	// 	const result = await delProject({
	// 		ids: params
	// 	});
	//     if (result.code === 200) {
	//         message.success(
	//             formatMessage({
	//                 id: 'operation-success'
	//             })
	//         )
	// 		setSelectedRowKeys([]);
	//         getList({
	//             pageNum: 1,
	//             pageSize: pagination.pageSize
	//         });
	//     } else {
	//         message.error(
	//             result.message || formatMessage({
	//                 id: 'operation-error'
	//             })
	//         )
	//     }
	// }

	const selectedRowKeys = props.selectedRowKeys;

	return (
		<div className={styles['stockTable-container']}>
			<DataTable
				rowKey={'id'}
				columns={props.columns || columns}
				dataSource={props.dataList}
				loading={props.loading}
				// rowSelection={ {
				//     selectedRowKeys,
				//     onChange: (newSelectedRowKeys: Array<any>) => {
				//         console.log('selectedRowKeys changed: ', newSelectedRowKeys);
				//         props.onRowSelection?.(selectedRowKeys);
				//         // setSelectedRowKeys(newSelectedRowKeys);
				//     }
				// } }
				rowSelection={false}
				pagination={props.pagination ? {
					// current: pagination.start / pagination.limit + 1,
					current: props.pagination.pageNum,
					pageSize: props.pagination.pageSize,
					total: props.pagination.total,
					pageSizeOptions: props.pagination.pageSizeOptions || [5, 10, 15, 20, 50],
					onChange: (page: number, pageSize: number) => {
						// console.log('page', page, pageSize);
						props.onPagination?.({
							pageNum: page,
							pageSize
						});
						// getList({
						//     pageNum: page,
						//     pageSize
						// });
					}
				} : false}
			/>
		</div>
	);
}

export default StockTable;




// https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:1+t:2&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171517

// https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:80&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171546
// https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171562

// https://95.push2.eastmoney.com/api/qt/clist/get?cb=jQuery112408008449055297937_1723971656036&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:0+t:80&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971656041
// https://95.push2.eastmoney.com/api/qt/clist/get?cb=jQuery112408008449055297937_1723971656036&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:1+t:2,m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971656046
// https://95.push2.eastmoney.com/api/qt/clist/get?cb=jQuery112408008449055297937_1723971656036&pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:81+s:2048&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971656057