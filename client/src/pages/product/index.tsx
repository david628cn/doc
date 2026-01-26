import React, { useState, useEffect } from 'react';
import {
    Form,
    Input,
    Button,
    message,
    Space,
    Progress,
    Popconfirm
} from 'antd';
import { useIntl } from "react-intl";
import DataTable from '@/components/dataTable';
import { addProject, listProject, delProject } from '@/api';
import styles from './index.module.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [dataList, setDataList] = useState<Array<any>>([]);
	const [pagination, setPagination] = useState({
		total: 0, 
		pageNum: 1, 
		pageSize: 10
	});
	const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>([]);
	// const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>([]);
	const [loading, setLoading] = useState(false);

    const { formatMessage } = useIntl();
    const [form] = Form.useForm();


    const columns: Array<any> = [
		{
			title: 'Title',
			dataIndex: 'title',
			key: 'title',
			// render: (text: any, record: any, index: number) => {
			// 	if (/\.(pdf|PDF)$/.test(text)) {
			// 		return (
			// 			<div className={ styles['docs-columns-content'] }>
			// 				<span className={ `${ styles['docs-columns-icon'] } ${ styles['pdf'] }` }><FilePdfOutlined /></span>
			// 				<span className={ styles['docs-columns-text'] }>{ text }</span>
			// 			</div>
			// 		)
			// 	} else if (/\.(doc|DOC|docx|DOCX)$/.test(text)) {
			// 		return (
			// 			<div className={ styles['docs-columns-content'] }>
			// 				<span className={ `${ styles['docs-columns-icon'] } ${ styles['doc'] }` }><FileWordOutlined /></span>
			// 				<span className={ styles['docs-columns-text'] }>{ text }</span>
			// 			</div>
			// 		)
			// 	} else if (/\.(xlsx|XLSX)$/.test(text)) {
			// 		return (
			// 			<div className={ styles['docs-columns-content'] }>
			// 				<span className={ `${ styles['docs-columns-icon'] } ${ styles['xlsx'] }` }><FileExcelOutlined /></span>
			// 				<span className={ styles['docs-columns-text'] }>{ text }</span>
			// 			</div>
			// 		)
			// 	} else if (/\.(png|PNG|JPG|jpg|jpeg|JPEG)$/.test(text)) {
			// 		return (
			// 			<div className={ styles['docs-columns-content'] }>
			// 				<span className={ `${ styles['docs-columns-icon'] } ${ styles['image'] }` }><FileImageOutlined /></span>
			// 				<span className={ styles['docs-columns-text'] }>{ text }</span>
			// 			</div>
			// 		)
			// 	}
			// 	return text;
			// 	// return <span>{ new Date(record.createTime).toLocaleString }</span>
			// }
		},
		// {
		// 	title: 'Type',
		// 	dataIndex: 'type',
		// 	key: 'type'
		// },
		{
			title: 'Status',
			dataIndex: 'status',
			width: 120,
			key: 'status',
			render: (text: any, record: any, index: number) => {
				return <Progress percent={ parseFloat(text) } size="small" />;
			}
		},
		{
			title: 'CreateTime',
			dataIndex: 'createTime',
			key: 'createTime',
			width: 200,
			render: (text: any, record: any, index: number) => {
				return new Date(text).toLocaleString();
			}
		},
		// {
		// 	title: 'ModifyTime',
		// 	dataIndex: 'modifyTime',
		// 	key: 'modifyTime',
		// 	width: 200,
		// 	render: (text: any, record: any, index: number) => {
		// 		return new Date(text).toLocaleString();
		// 	}
		// },
		{
			title: 'Action',
			dataIndex: 'action',
			width: 250,
			render: (_: any, record: any) => {
				return <Space size="middle">
					<Button onClick={(e: any) => {
                        // history.push({
                        //     pathname: '/chat',
                        //     query: {
                        //         id: record.id
                        //     }
                        // });
                    }}>Open</Button>
					<Popconfirm
						title="Are you sure to delete this task?"
						// description="Are you sure to delete this task?"
						onConfirm={(e: any) => {
							// del({
							// 	id: record.id
							// });
						}}
						okText="Yes"
						cancelText="No"
					>
						<Button danger>Delete</Button>
					</Popconfirm>
				</Space>
			}
		}
	];


    useEffect(() => {
        getList({
			pageNum: pagination.pageNum,
			pageSize: pagination.pageSize
		});
    }, []);

    const getList = async (params: any) => {
        setLoading(true);
        const result = await listProject(params);
        setLoading(false);
		if (result.code === 200) {
			const { list = [], total = 0 } = result.data || {};
			setDataList(list);
			setPagination({
                pageNum: params.pageNum,
                pageSize: params.pageSize,
				total
			});
		} else {
			setDataList([]);
			setPagination({
                pageNum: 1,
                pageSize: params.pageSize,
				total: 0
			});
		}
    }

    const handleSumbit = async (values: any) => {
        const result = await addProject(values);
        if (result.code === 200) {
            message.success(
                formatMessage({
                    id: 'operation-success'
                })
            )
            getList({
                pageNum: 1,
                pageSize: pagination.pageSize
            });
        } else {
            message.error(
                result.message || formatMessage({
                    id: 'operation-error'
                })
            )
        }
    };

	const del = async (params: Array<any> = []) => {
		console.log(params);
		if (!params.length) {
			message.warning(
                formatMessage({
                    id: 'please-select'
                })
            )
			return;
		} 
		const result = await delProject({
			ids: params
		});
        if (result.code === 200) {
            message.success(
                formatMessage({
                    id: 'operation-success'
                })
            )
			setSelectedRowKeys([]);
            getList({
                pageNum: 1,
                pageSize: pagination.pageSize
            });
        } else {
            message.error(
                result.message || formatMessage({
                    id: 'operation-error'
                })
            )
        }
	}

    return (
        <div style={{
			padding: '20px'
		}}>
            <div style={{
                width: '500px'
            }}>
                <Form
                    form={form}
                    autoComplete="off"
                    onFinish={handleSumbit}
                >
                    <Form.Item
                        label="名称"
                        name="title"
                        required
                        rules={[{ required: true, message: '请输入名称' }]}
                    >
                        <Input placeholder="请输入名称" />
                    </Form.Item>
                    <Form.Item>
                        <Button 
                            type="primary"
                            htmlType="submit"
                        >Submit</Button>
                    </Form.Item>
                </Form>
            </div>
			<div>
				<Button 
					type="primary"
					htmlType="submit"
					danger
					onClick={
						() => {
							del(selectedRowKeys);
						}
					}
				>Delete</Button>
			</div>
			{/* <div style={{
				padding: '20px 0'
			}}>
				<form action="http://127.0.0.1:8080/file/upload" method="post" encType="multipart/form-data">
					<input type="file" name="file" />
					<button type="submit">Upload</button>
				</form>
			</div> */}
            <div>
                <DataTable
                    rowKey={ 'id' }
                    columns={ columns }
                    dataSource={ dataList }
                    loading={ loading }
                    rowSelection={ {
                    	selectedRowKeys,
                    	onChange: (newSelectedRowKeys: Array<any>) => {
							console.log('selectedRowKeys changed: ', newSelectedRowKeys);
                    		setSelectedRowKeys(newSelectedRowKeys);
                    	}
                    } }
                    pagination={ {
                        // current: pagination.start / pagination.limit + 1,
                        current: pagination.pageNum,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        pageSizeOptions: [5, 10, 20, 50],
                        onChange: (page: number, pageSize: number) => {
                            console.log('page', page, pageSize);
                            getList({
                                pageNum: page,
                                pageSize
                            });
                        }
                    } }
                />
            </div>

        </div>
    );
}

export default Page;