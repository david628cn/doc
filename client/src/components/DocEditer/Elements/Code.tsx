interface CodeProps {
    attributes?: any;
    children?: any;
}

const Code = (props: CodeProps) => {
    return (
        <pre {...props.attributes}>
            <code>{props.children}</code>
        </pre>
    )
}

export default Code;