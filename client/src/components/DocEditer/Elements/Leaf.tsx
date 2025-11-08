// import {
//     RenderLeafProps
// } from 'slate-react';

const Leaf = ({ attributes, children, leaf }: any) => {
    console.log('attributes', attributes, leaf);
    // const style = {
    //     color: leaf.color, 
    //     backgroundColor: leaf.highlight
    // };
    if (leaf.bold) {
        children = <strong>{children}</strong>;
    }

    if (leaf.italic) {
        children = <em>{children}</em>;
    }

    if (leaf.strikethrough) {
        children = <s>{children}</s>;
    }

    if (leaf.code) {
        children = <code>{children}</code>;
    }

    if (leaf.underlined) {
        children = <u>{children}</u>;
    }

    if (leaf.superscript) {
        children = <sup>{children}</sup>;
    }

    if (leaf.subscript) {
        children = <sub>{children}</sub>;
    }

    // if (leaf.color) {
    //     children = <span style={{ color: leaf.color }}>{children}</span>;
    // }

    // if (leaf.highlight) {
    //     children = <span style={{ backgroundColor: leaf.backgroundColor }}>{children}</span>;
    // }

    return <span {...attributes}>{children}</span>;
}

export default Leaf;