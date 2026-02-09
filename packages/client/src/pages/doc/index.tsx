import React, { useEffect, useState } from 'react';
import { DocEditor } from '@/components/docEditer';


interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(`<div class="tableWrapper">
            <table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p>One</p><p>Four</p><p>a</p><p>b</p></td><td><p>Two</p></td><td><p>Three</p></td></tr><tr><td><p>Five</p></td><td><p>Six</p></td></tr><tr><td data-colwidth="100"><p>c</p></td><td><p>d</p></td><td><p>e</p></td><td><p>f</p></td></tr><tr><td data-colwidth="100"><p>g</p></td><td><p>m</p></td><td><p>n</p></td><td><p>z</p></td></tr></tbody></table>
            </div>
            <div class="tableWrapper">
            <table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p>One</p><p>Four</p><p>a</p><p>b</p></td><td><p>Two</p></td><td><p>Three</p></td></tr><tr><td><p>Five</p></td><td><p>Six</p></td></tr><tr><td data-colwidth="100"><p>c</p></td><td><p>d</p></td><td><p>e</p></td><td><p>f</p></td></tr><tr><td data-colwidth="100"><p>g</p></td><td><p>m</p></td><td><p>n</p></td><td><p>z</p></td></tr></tbody></table>
            </div>
            <div class="tableWrapper">
            <table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p>One</p><p>Four</p><p>a</p><p>b</p></td><td><p>Two</p></td><td><p>Three</p></td></tr><tr><td><p>Five</p></td><td><p>Six</p></td></tr><tr><td data-colwidth="100"><p>c</p></td><td><p>d</p></td><td><p>e</p></td><td><p>f</p></td></tr><tr><td data-colwidth="100"><p>g</p></td><td><p>m</p></td><td><p>n</p></td><td><p>z</p></td></tr></tbody></table>
            </div>
            <div class="tableWrapper">
            <table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p>One</p><p>Four</p><p>a</p><p>b</p></td><td><p>Two</p></td><td><p>Three</p></td></tr><tr><td><p>Five</p></td><td><p>Six</p></td></tr><tr><td data-colwidth="100"><p>c</p></td><td><p>d</p></td><td><p>e</p></td><td><p>f</p></td></tr><tr><td data-colwidth="100"><p>g</p></td><td><p>m</p></td><td><p>n</p></td><td><p>z</p></td></tr></tbody></table>
            </div>
            `);
    }, []);

    return <DocEditor content={content}/>;
}

export default Page;