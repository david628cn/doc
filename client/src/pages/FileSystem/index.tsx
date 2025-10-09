import React, { useState, useEffect } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { useIntl } from "react-intl";
import dayjs from 'dayjs';
import {
    Button,
    Row,
    Col,
    Form,
    Space,
    Input,
    DatePicker,
    message,
    Popconfirm
} from 'antd';
import DataTable from '@/components/DataTable';
import { listFiles, delFiles } from '@/api';
import { deepClone, formatBytes } from '@/utils/common';
import styles from './index.module.less';


interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [pagination, setPagination] = useState({
        total: 0,
        pageNum: 1,
        pageSize: 10
    });
    const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>([]);
    const [dataList, setDataList] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({
        name: '',
        create_date: dayjs().format('YYYY-MM-DD')
    });
    const [queryParams, setQueryParams] = useState<any>({
        filter: formData,
        orderBy: {
            desc: ['create_date'],
            asc: []
        }
    });

    const { formatMessage } = useIntl();
    const [form] = Form.useForm();

    useEffect(() => {
        getList({
            ...queryParams,
            pageNum: pagination.pageNum,
            pageSize: pagination.pageSize
        });
    }, []);

    const getList = async (params?: any) => {
        setLoading(true);
        const requestParams = deepClone(params);
        if (requestParams['filter']['create_date']) {
            requestParams['filter']['create_date'] = {
                op: '<=?<=',
                value: [`${requestParams['filter']['create_date']} 00:00:00`, `${requestParams['filter']['create_date']} 23:59:59`]
            }
        }
        const result = await listFiles(requestParams);
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

    const del = async (ids: any = []) => {
        let params = ids;
        if (!Array.isArray(params)) {
            params = [params];
        }
		if (!params.length) {
			message.warning(
                formatMessage({
                    id: 'please-select'
                })
            )
			return;
		} 
		const result = await delFiles({
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
                ...queryParams,
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
        <div>
            <div style={{
                // display: 'none',
                padding: '10px 20px'
            }}>
                {/* <Button type="primary" onClick={ handleSyncClick } loading={btnLoading}>数据同步</Button> */}
                {/* <Button type="primary" onClick={ handleClick } loading={btnLoading}>更新</Button> */}
            </div>
            <div style={{ padding: '10px 20px' }}>
                <Form
                    form={form} name="form"
                    initialValues={formData}
                    onFinish={(values: any) => {
                        const pageNum = 1;
                        const pageSize = pagination.pageSize;
                        setPagination({
                            ...pagination,
                            pageNum,
                            pageSize
                        });
                        const newQueryParams = {
                            ...queryParams,
                            filter: {
                                ...queryParams.filter,
                                ...values
                            }
                        };
                        setQueryParams(newQueryParams);
                        getList({
                            ...newQueryParams,
                            pageNum,
                            pageSize
                        });
                    }}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item
                                name="name"
                                label="名称"
                            >
                                <Input placeholder="placeholder" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="create_date"
                                label="日期"
                                getValueFromEvent={(...[, dateString]) => dateString}
                                getValueProps={(value: any) => ({
                                    value: value ? dayjs(value, 'YYYY-MM-DD') : undefined
                                })
                                }
                            >
                                <DatePicker format={'YYYY-MM-DD'} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ textAlign: 'center' }}>
                        <Space size="small">
                            <Button type="primary" htmlType="submit">
                                Search
                            </Button>
                            <Button
                                onClick={() => {
                                    form.resetFields();
                                }}
                            >
                                Clear
                            </Button>
                            {/* <a
                                style={{ fontSize: 12 }}
                                onClick={() => {
                                    setExpand(!expand);
                                }}
                            >
                                <DownOutlined rotate={expand ? 180 : 0} /> Collapse
                            </a> */}
                        </Space>
                    </div>
                </Form>
            </div>
            <div style={{ padding: '10px 20px' }}>
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
            <div style={{
                padding: "0 20px 20px 20px"
            }}>
                <DataTable
                    rowKey={'id'}
                    columns={[
                        {
                            title: '名称',
                            dataIndex: 'name',
                            key: 'name',
                            // width: 100
                        },
                        {
                            title: '类型',
                            dataIndex: 'type',
                            key: 'type',
                            // width: 100
                        },
                        {
                            title: '大小',
                            dataIndex: 'size',
                            key: 'size',
                            // width: 100
                            render: (text: any, record: any, index: number) => {
                                return formatBytes(text, 2);
                            }
                        },
                        {
                            title: 'path',
                            dataIndex: 'path',
                            key: 'path',
                            // width: 100
                        },
                        {
                            title: 'desc',
                            dataIndex: 'desc',
                            key: 'desc',
                            // width: 100
                        },
                        {
                            title: '用户',
                            dataIndex: 'userName',
                            key: 'userName',
                            // width: 100
                        },
                        {
                            title: '修改日期',
                            dataIndex: 'update_date',
                            key: 'update_date',
                            width: 100,
                            render: (text: any, record: any, index: number) => {
                                return new Date(text).toLocaleDateString();
                            }
                        },
                        {
                            title: '创建日期',
                            dataIndex: 'create_date',
                            key: 'create_date',
                            width: 100,
                            render: (text: any, record: any, index: number) => {
                                return new Date(text).toLocaleDateString();
                            }
                        },
                        {
                            title: '操作',
                            key: 'action',
                            width: 150,
                            render: (text: any, record: any, index: number) => {
                                return (
                                    <Space size="middle">
                                        <Popconfirm
                                            title="Are you sure to delete this task?"
                                            // description="Are you sure to delete this task?"
                                            onConfirm={(e: any) => {
                                                del(record.id);
                                            }}
                                            okText="Yes"
                                            cancelText="No"
                                        >
                                            <Button danger>Delete</Button>
                                        </Popconfirm>
                                    </Space>
                                );
                            }
                        }
                    ]}
                    dataSource={dataList}
                    loading={loading}
                    rowSelection={ {
                    	selectedRowKeys,
                    	onChange: (newSelectedRowKeys: Array<any>) => {
							console.log('selectedRowKeys changed: ', newSelectedRowKeys);
                    		setSelectedRowKeys(newSelectedRowKeys);
                    	}
                    } }
                    pagination={{
                        // current: pagination.start / pagination.limit + 1,
                        current: pagination.pageNum,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        pageSizeOptions: [5, 10, 15, 20, 50],
                        onChange: (pageNum: number, pageSize: number) => {
                            getList({
                                ...queryParams,
                                pageNum,
                                pageSize
                            });
                        }
                    }}
                />
            </div>
        </div>
    );
}

export default Page;