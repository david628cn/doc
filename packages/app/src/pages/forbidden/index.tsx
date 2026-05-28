import { Button, Flex, View, Text, Title, IconWrapper } from '@carvy/ui';
import history from '@/utils/history';

const Forbidden = () => {
    return (
        <View h="100%" pt={100}>
            <Flex direction="column" align="center">
                <Text fontSize={18}>403 Error</Text>
                <Title mt={0}>Page forbidden</Title>
                <Flex>
                    <Button variant="soft" onClick={() => history.goBack()}>
                        <Text fontSize={14}>Go back</Text>
                        <IconWrapper>
                            <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z"></path></svg>
                        </IconWrapper>
                    </Button>
                </Flex>
            </Flex>
        </View>
    );
}

export default Forbidden;