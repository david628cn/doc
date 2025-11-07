interface DefaultProps {
    attributes?: any;
    children?: any;
}

const Default = (props: DefaultProps) => {
    return (
        <p {...props.attributes}>{props.children}</p>
    )
}

export default Default;