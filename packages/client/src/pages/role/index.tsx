import React, { useEffect, useRef, useState } from 'react';
import { TableControl } from './tableControl';
import './index.less';

interface IProps {
}

const Page: React.FC<IProps> = props => {
    const containerRef = useRef(null);
    const tableRef = useRef(null);

    useEffect(() => {
        const tableControl = new TableControl();
        tableControl.load(tableRef.current, containerRef.current);
    }, []);

    return (
        <div style={{
            margin: '200px',
            // padding: '100px',
            left: '30px',
            top: '20px',
            width: '1000px',
            height: '600px',
            position: 'absolute'
        }}>
            <div className="dui-doc-table-view">
                <div className="dui-doc-table-view-inner">
                    <table style={{ minWidth: '400px' }} ref={tableRef}>
                        <colgroup>
                            <col style={{ width: '100px' }} />
                            <col />
                            <col />
                            <col />
                        </colgroup>
                        {/* <thead>
                            <tr>
                                    <th colSpan={2} rowSpan={2} data-colwidth="100,0">
                                        <p data-block-id="7bdd1d1b-8a05-419d-847c-7ed672130647">One</p>
                                        <p data-block-id="720051ce-41c8-405e-a26a-34a4d5b2e12a">Four</p>
                                        <p data-block-id="a4fb278d-d95b-4838-a066-225eab07b4f4">a</p>
                                        <p data-block-id="49dd0542-799b-4b7e-bbd7-f98c70fd2751">b</p>
                                    </th>
                                    <th>
                                        <p data-block-id="8a7156cc-2bd3-4502-abe9-7fbf956aa744">Two</p>
                                    </th>
                                    <th>
                                        <p data-block-id="f3653c9c-ae74-4a74-916b-d70a2ab411ab">Three</p>
                                    </th>
                                </tr>
                        </thead> */}
                        <tbody>
                            <tr>
                                <td colSpan={2} rowSpan={2} data-colwidth="100,0">
                                    <p data-block-id="7bdd1d1b-8a05-419d-847c-7ed672130647">One</p>
                                    <p data-block-id="720051ce-41c8-405e-a26a-34a4d5b2e12a">Four</p>
                                    <p data-block-id="a4fb278d-d95b-4838-a066-225eab07b4f4">a</p>
                                    <p data-block-id="49dd0542-799b-4b7e-bbd7-f98c70fd2751">b</p>
                                </td>
                                <td>
                                    <p data-block-id="8a7156cc-2bd3-4502-abe9-7fbf956aa744">Two</p>
                                </td>
                                <td>
                                    <p data-block-id="f3653c9c-ae74-4a74-916b-d70a2ab411ab">Three</p>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <p data-block-id="7f707185-9a4f-4c53-8751-dfe1bbff2234">Five</p>
                                </td>
                                <td>
                                    <p data-block-id="0ff45166-2a12-4b34-85e0-7f5e5d057e19">Six</p>
                                </td>
                            </tr>
                            <tr>
                                <td data-colwidth="100">
                                    <p data-block-id="30cd269d-845c-4235-aab9-d06eeb1dd59d">c</p>
                                </td>
                                <td>
                                    <p data-block-id="ef71ec0c-9175-4d94-9498-cab3b2507995">d</p>
                                </td>
                                <td>
                                    <p data-block-id="01b1c33a-b3e5-4dd9-b426-8bbeaa678fa8">e</p>
                                </td>
                                <td>
                                    <p data-block-id="7cfafff4-ed5c-432c-b286-30ffd986c215">f</p>
                                </td>
                            </tr>
                            <tr>
                                <td data-colwidth="100">
                                    <p data-block-id="f18907ef-c57b-444a-b05d-e9d8b07171d6">g</p>
                                </td>
                                <td>
                                    <p data-block-id="4b58b6c2-d98a-44e3-afdf-3106af858144">m</p>
                                </td>
                                <td>
                                    <p data-block-id="175c37ed-8f43-4dab-b780-6d59d594e059">n</p>
                                </td>
                                <td>
                                    <p data-block-id="d93e9990-da02-4b09-a34c-abe26683d24e">z</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="dui-doc-table-view-ctrolpanel" ref={containerRef}></div>
            </div>

        </div>
    );
}

export default Page;