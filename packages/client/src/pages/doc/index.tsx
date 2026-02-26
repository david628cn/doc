import React, { useEffect, useState } from 'react';
import { DocEditor } from '@/components/docEditer';


interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(`<div class="dui-doc-table-view"><div class="dui-doc-table-view-inner"><table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p data-block-id="fcb96a6c-64d5-4927-afc5-d8ebbb82f836">One</p><p data-block-id="e9c08841-7cf2-4daf-9b2e-1b1afab1bcac">Four</p><p data-block-id="b8d6ad4a-51b0-4be5-a7e2-089c945d280a">a</p><p data-block-id="d782860c-c9b1-4d4f-87bd-7dd3e8e7ca9b">b</p></td><td><p data-block-id="7183b602-99a8-4227-8520-ad1b562d6b90">Two</p></td><td><p data-block-id="dbbddfb9-1c67-4e39-b53a-29ec825372cb">Three</p></td></tr><tr><td><h2 data-block-id="f10b40f4-31e0-4758-b5f3-869d34ae9ebe"><br class="ProseMirror-trailingBreak"></h2><div class="dui-doc-table-view"><div class="dui-doc-table-view-inner"><table style="--default-cell-min-width: 100px; min-width: 394px;"><colgroup><col style="width: 100px;"><col style="width: 194px;"><col></colgroup><tbody><tr><td data-colwidth="100"><p data-block-id="ae9335ec-594b-4f0b-81e2-5ab2f816c316">One</p></td><td data-colwidth="194"><p data-block-id="2a42f472-18b7-4294-a59d-20558816ee69"><br class="ProseMirror-trailingBreak"></p></td><td><p data-block-id="1c0c979d-6838-4d82-bdb9-21e726826e64">Three</p></td></tr><tr><td data-colwidth="100"><p data-block-id="31acbff1-9738-47f2-8378-84962d9340cf">Four</p></td><td data-colwidth="194"><p data-block-id="9469c735-7ace-4ccf-925f-b3e395052b58">Five</p></td><td><p data-block-id="8e0e714b-e639-4593-9548-b2e9a68cb474">Six</p></td></tr></tbody></table></div><div class="dui-doc-table-view-ctrolpanel" contenteditable="false"></div><div class="dui-doc-table-view-cell-selection" contenteditable="false"><div class="dui-doc-table-view-cell-selection-rect" style="width: 335px; height: 228.18px; left: -343px; top: -132.992px;"></div></div></div></td><td><p data-block-id="3533f121-1993-42b9-89a8-e8d5be866cbf">Six</p></td></tr><tr><td data-colwidth="100"><p data-block-id="fb9dc962-8890-48a8-9238-4e4d6384aa21">c</p></td><td><p data-block-id="ca4ced3f-20df-466f-a359-072f58569355">d</p></td><td><p data-block-id="5aec23f1-948d-4f63-b8e7-baba1d2ff9f4">e</p></td><td><p data-block-id="cbdd8029-eff0-4995-8b67-fecc9097f274">f</p></td></tr><tr><td data-colwidth="100"><p data-block-id="3e058d45-2b42-46d2-9489-b64a7ae2760b">g</p></td><td><p data-block-id="818889ac-0187-41b7-be5c-39f1f91c23a5">m</p></td><td><p data-block-id="7063be0a-76dc-4e9f-a2eb-beb96f650c2d">n</p></td><td><p data-block-id="e3a9a748-b528-41b2-a8f2-de7cf10c020a">z</p></td></tr></tbody></table></div><div class="dui-doc-table-view-ctrolpanel" contenteditable="false"></div><div class="dui-doc-table-view-cell-selection" contenteditable="false"></div></div>
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
        // setContent(`
        //     <div class="tableWrapper">
        //     <table style="--default-cell-min-width: 100px; min-width: 400px;"><colgroup><col style="width: 100px;"><col><col><col></colgroup><tbody><tr><td colspan="2" rowspan="2" data-colwidth="100,0"><p>One</p><p>Four</p><p>a</p><p>b</p></td><td><p>Two</p></td><td><p>Three</p></td></tr><tr><td><p>Five</p></td><td><p>Six</p></td></tr><tr><td data-colwidth="100"><p>c</p></td><td><p>d</p></td><td><p>e</p></td><td><p>f</p></td></tr><tr><td data-colwidth="100"><p>g</p></td><td><p>m</p></td><td><p>n</p></td><td><p>z</p></td></tr></tbody></table>
        //     </div>
        //     `);
    }, []);

    return <DocEditor content={content} />;
}

export default Page;