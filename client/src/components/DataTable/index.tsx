import React from 'react';
// import zh_CN from 'antd/es/locale/zh_CN';
import { Table, Pagination } from 'antd';
import { formatCurrency } from '@/utils/common';
import styles from './index.module.less';

interface DataTableProps {
    // columns?: Array<any>;
    // data?: Array<any>;
    header?: any;
    pagination?: any;
    className?: string;
    rowKey?: string;
    columns?: any;
    dataSource?: any;
    loading?: boolean;
    rowSelection?: any;
    showQuickJumper?: boolean;
    showSizeChanger?: boolean;
    showTotalPanel?: boolean;
}

const DataTable: React.FC<DataTableProps> = props => {
    const { header, pagination, className, showTotalPanel, ...table } = props;

    return (
        <div className={ styles['dataTable-container'] }>
            {
                header ? (
                    <div className={ styles['dataTable-header'] }>{header}</div>
                ) : (
                    <div className={ styles['dataTable-padding'] } />
                )
            }
            <div className={ styles['dataTable-conent'] }>
                <Table
                    rowSelection={{
                        type: 'checkbox'
                    }}
                    {...table}
                    pagination={false}
                />
            </div>
            {
                pagination ? (
                    <div className={`${styles['dataTable-footer']}`}>
                        { showTotalPanel !== false ? <div className={`${styles['dataTable-pagination']}`}>{ `${ pagination.current } / ${ formatCurrency(pagination.total) }` }</div> : null }
                        {/* <ConfigProvider locale={zh_CN}> */}
                            <Pagination 
                                total={0} 
                                current={1}
                                pageSize={10} 
                                showSizeChanger={true} 
                                showQuickJumper={true}
                                //showTotal={(total: number) => `${ pagination.current } / ${total}`}
                                // itemRender={ () => {
                                //     return null;
                                // } }
                                { ...pagination } 
                            />
                        {/* </ConfigProvider> */}
                    </div>
                ) : (
                    <div className={styles['dataTable-padding']} />
                )
            }
        </div>
    );
};

export default DataTable;
