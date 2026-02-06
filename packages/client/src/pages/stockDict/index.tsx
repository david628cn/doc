import React, { useState, useEffect } from 'react';
// import { DownOutlined } from '@ant-design/icons';
import { useIntl } from "react-intl";
import {
    Button,
    Row,
    Col,
    Form,
    Space,
    Input,
    Drawer
} from 'antd';
import { listStockDict, listStock, listStockTrade, stockToJson } from '@/api';
import StockTable from '@/components/stockTable';
import Kline from '@/components/klineCanvas';
import { formatNumberWithUnit } from '@/utils/common';
// import { MAIN_STOCKS_OBJ } from '@/utils/stock_data.module';
// import { getQtClist } from '@/utils/stock.module';
// import CYQ from '@/components/CYQ';
import styles from './index.module.less';

// const reqStock = () => {
//     return fetch(`https://4.push2.eastmoney.com/api/qt/clist/get?cb=jQuery1124032840110391547706_1723971171516&pn=1&pz=5000&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&dect=1&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:1+t:2&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152&_=1723971171517`, {
//         method: 'GET',
//         mode: 'cors',
//         cache: 'no-cache',
//         credentials: 'include',
//         headers: {
//             'Content-Type': 'text/html',
//             // 'Access-Control-Allow-Origin': '*',
//             // 'Access-Control-Allow-Credentials': true
//         }
//     }).then(rs => rs.text()).then(rs => {
//         const str = rs.replace(/^.+\(/, '').replace(/\);$/, '');
//         return JSON.parse(str);
//     });
// }

// const getKLines = async ({
//     secid
// }: any) => {
//     const date = new Date();
//     const end_yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
//     return fetch(`https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${ secid }&ut=fa5fd1943c7b386f172d6893dbfba10b&fields1=f1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6&fields2=f51%2Cf52%2Cf53%2Cf54%2Cf55%2Cf56%2Cf57%2Cf58%2Cf59%2Cf60%2Cf61&klt=101&fqt=1&end=${ end_yyyymmdd }&lmt=210&cb=quote_jp1`, {
//         method: 'GET',
//         mode: 'cors',
//         cache: 'no-cache',
//         credentials: 'include',
//         headers: {
//             'Content-Type': 'text/html',
//             // 'Access-Control-Allow-Origin': '*',
//             // 'Access-Control-Allow-Credentials': true
//         }
//     }).then(rs => rs.text()).then(rs => {
//         const str = rs.replace(/^quote_jp1\(/, '').replace(/\);$/, '');
//         return JSON.parse(str);
//     });
// }

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [pagination, setPagination] = useState({
        total: 0,
        pageNum: 1,
        pageSize: 10
    });

    const [dataList, setDataList] = useState<Array<any>>([]);
    const [loading, setLoading] = useState(false);
    const [btnLoading, setBtnLoading] = useState(false);
    // const [selectedRowKeys, setSelectedRowKeys] = useState<Array<any>>([]);
    // const [cyqData, setCyqData] = useState<Array<any>>([]);
    // const [expand, setExpand] = useState(false);
    const [open, setOpen] = useState(false);
    const [klines, setKlines] = useState<Array<any>>([]);
    const [tradeData, setTradeData] = useState<Array<any>>([]);
    const [queryParams, setQueryParams] = useState<any>({
        filter: {
            code: '',
            name: '',
            price: ''
        },
        orderBy: {
            desc: ['date', 'price'],
            asc: []
        }
    });

    const [title, setTitle] = useState('');

    const [form] = Form.useForm();

    useEffect(() => {
        getListStock({
            ...queryParams,
            pageNum: pagination.pageNum,
            pageSize: pagination.pageSize
        });
    }, []);

    const handleShowDrawer = (record: any) => {
        return (e: any) => {
            e.preventDefault();
            setOpen(true);
            setTitle(`${record.name} [${record.code}]`);
            drawKline(record);
            drawTrade(record);
        }
    }

    const drawKline = async (record: any) => {
        const result = await listStock({
            filter: {
                code: record.code
            },
            orderBy: {
                desc: ['date'],
                // asc: ['date']
            },
            pageNum: 1,
            pageSize: 2000
        });
        if (result.code === 200) {
            const { list = [], total = 0 } = result.data || {};
            let klinesData = list.reverse();
            // klinesData = klinesData.map((item: any, index: number) => {
            //     return `${ item.date },${ item.open },${ item.current },${ item.low },${ item.high }`;
            // });
            setKlines(klinesData);
        } else {
            setKlines([]);
        }
    }

    const drawTrade = async (record: any) => {
        const result = await listStockTrade({
            code: record.code,
            date: record.date
        });
        if (result.code === 200) {
            const list = result.data || [];
            console.log('list', list);
            setTradeData(list);
        } else {
            setTradeData([]);
        }
    }

    const wait = (delay: number) => {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    const getListStock = async (params?: any) => {
        setLoading(true);
        const result = await listStockDict(params);
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

    const handlePagination = ({
        pageNum,
        pageSize
    }: any) => {
        setPagination({
            ...pagination,
            pageNum,
            pageSize
        });
        getListStock({
            ...queryParams,
            pageNum,
            pageSize
        });
    }

    const handleClick = async (e: any) => {
        setBtnLoading(true);
        const result = await stockToJson();
        setBtnLoading(false);
    }

    return (
        <div>
            <div style={{
                // display: 'none',
                padding: '10px 20px'
            }}>
                {/* <Button type="primary" onClick={ handleSyncClick } loading={btnLoading}>数据同步</Button> */}
                <Button type="primary" onClick={handleClick} loading={btnLoading}>数据生成</Button>
            </div>
            <div style={{ padding: '20px' }}>
                <Form form={form} name="form" onFinish={(values: any) => {
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
                    getListStock({
                        ...newQueryParams,
                        pageNum,
                        pageSize
                    });
                }}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item
                                name="code"
                                label="代码"
                            // rules={[
                            //     {
                            //       required: true,
                            //       message: 'Select something!'
                            //     }
                            // ]}
                            >
                                <Input placeholder="placeholder" />
                            </Form.Item>
                        </Col>
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
                                name="price"
                                label="涨跌"
                            >
                                <Input placeholder="placeholder" />
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
            <div>
                <StockTable
                    columns={[
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
                            width: 100,
                            render: (text: any, record: any, index: number) => {
                                return new Date(text).toLocaleDateString();
                            }
                        },
                        {
                            title: '最低价',
                            dataIndex: 'min',
                            key: 'min',
                            align: 'right',
                            width: 100,
                            render: (text: any, record: any, index: number) => {
                                if (text === undefined || text === null) {
                                    return '---';
                                }
                                return <span>{text.toFixed(2)}</span>;
                            }
                        },
                        {
                            title: '低价日期',
                            dataIndex: 'min_date',
                            key: 'min_date',
                            width: 100,
                            render: (text: any, record: any, index: number) => {
                                if (text === undefined || text === null) {
                                    return '---';
                                }
                                return new Date(text).toLocaleDateString();
                            }
                        },
                        {
                            title: '截至',
                            dataIndex: 'delta_days',
                            key: 'delta_days',
                            width: 60,
                            render: (text: any, record: any, index: number) => {
                                if (text === undefined || text === null) {
                                    return '---';
                                }
                                return text;
                            }
                        },
                        {
                            title: '资金流入',
                            dataIndex: 'main_delta',
                            key: 'main_delta',
                            align: 'right',
                            width: 120,
                            render: (text: any, record: any, index: number) => {
                                return formatNumberWithUnit(text);
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
                        // {
                        //     title: '涨跌额',
                        //     dataIndex: 'amount',
                        //     key: 'amount',
                        //     align: 'right',
                        //     width: 120,
                        //     render: (text: any, record: any, index: number) => {
                        //         let color = '#333';
                        //         let v = parseFloat(text || 0);
                        //         if (v < 0) {
                        //             color = '#4caf50';
                        //         } else if (v > 0) {
                        //             color = '#ff0000';
                        //         }
                        //         return <span style={{ color }}>{v.toFixed(2)}</span>;
                        //     }
                        // },
                        // {
                        //     title: '成交量（手）',
                        //     dataIndex: 'quantity',
                        //     key: 'quantity',
                        //     align: 'right',
                        //     width: 120,
                        //     render: (text: any, record: any, index: number) => {
                        //         return formatNumberWithUnit(text);
                        //     }
                        // },
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
                        {
                            title: '',
                            key: 'action',
                            width: 150,
                            render: (text: any, record: any, index: number) => {
                                return (
                                    <Space size="middle" onClick={handleShowDrawer(record)}>
                                        <a>详情</a>
                                    </Space>
                                );
                            }
                        }
                    ]}
                    // selectedRowKeys={selectedRowKeys}
                    loading={loading}
                    dataList={dataList}
                    pagination={pagination}
                    onPagination={handlePagination}
                // onRowSelection={handleRowSelection}
                />
            </div>
            <div style={{ padding: '10px 20px' }}>
                {/* <CYQ 
                    data={ cyqData }
                /> */}
            </div>
            <Drawer width={1500} placement="left" closable={false} onClose={(e: any) => {
                setOpen(false);
            }} open={open}>
                <div style={{
                    width: '100%',
                    height: '100%'
                }}>
                    <div style={{
                        width: '100%',
                        height: '450px'
                    }}>
                        {/* <div style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #f0f0f0',
                            paddingBottom: '20px'
                        }}>
                            {title}
                        </div> */}
                        <div style={{
                            width: '100%',
                            height: '100%'
                        }}>
                            <Kline
                                title={title}
                                type={'hour'}
                                // count={4812}
                                data={tradeData}
                            />
                            <Kline
                                // title={title}
                                count={90}
                                type={'day'}
                                data={klines}
                            />
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
    );
}

export default Page;