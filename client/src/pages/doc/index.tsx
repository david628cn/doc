import React, { useEffect, useState } from 'react';
import { DocEditor } from '@/components/docEditer';


interface IProps {
}

const Page: React.FC<IProps> = props => {
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(`prosemirror 编辑器

  MVC 模式设计，核心模块主要有: /iklo

Model层：prosemirror-model

Schema：编辑器内容数据结构，主要用来定义结构，输入或复制粘n内容（例如nmarkdown内容），会

a约束为规定格式，结合到state，最终将内容渲染为html显示

        /

node与mark区别：一个node节点，不能同时既是一个段落节点，又是一个标题节点

View层：prosemirror-view

Controller层：prosemirror-state，prosemirror-transform`);
    }, []);

    return <DocEditor content={content}/>;
}

export default Page;