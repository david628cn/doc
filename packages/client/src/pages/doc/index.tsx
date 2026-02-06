import React, { useEffect, useState } from 'react';
import { DocEditor } from '@/components/docEditer';


interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(`<div class="tableWrapper">
            <table style="--default-cell-min-width: 100px; min-width: 799px;">
            <colgroup>
            <col style="width: 142px;">
            <col style="width: 225px;">
            <col style="width: 332px;">
            <col>
            </colgroup>
            <tbody>
            <tr>
            <td data-colwidth="142"></td><td data-colwidth="225"></td><td data-colwidth="332"></td><td></td></tr><tr><td data-colwidth="142"></td><td data-colwidth="225"></td><td data-colwidth="332"></td><td></td></tr></tbody></table></div>`);
    }, []);

    return <DocEditor content={content}/>;
}

export default Page;