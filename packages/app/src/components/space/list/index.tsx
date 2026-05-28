import { 
    View,
    Flex,
    Text,
    Divider,
    Button,
    Dialog,
    Input,
} from '@carvy/ui';
import { SpaceCards } from "@/components/space/cards";
import { CreateSpaceForm, type CreateSpaceFormValues } from '../create';
import { listSpace } from '@/api';
import { useEffect, useState, useMemo } from "react";
import { matchesTextSearch } from '@/utils/textSearch';

export type SpaceListProps = {
    onSpaceCreated?: (newSpace: any) => void;
    onSpaceUpdated?: () => void
}; 

export const SpaceList: React.FC<SpaceListProps> = (props) => {
    const { onSpaceCreated, onSpaceUpdated } = props;
    const [data, setData] = useState([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [searchQ, setSearchQ] = useState('');

    useEffect(() => {
        getListSpace();
    }, []);
    
    const getListSpace = async () => {
        const rs = await listSpace();
        if (rs.code === 200) {
            setData(rs.data.list || []);
        } else {
            setData([]);
        }
    }

    const handleCreateSpace = async (values: CreateSpaceFormValues) => {
        setCreateModalOpen(false);
        getListSpace();
        onSpaceCreated?.(values);
    };

    const handleUpdateSpace = async () => {
        setCreateModalOpen(false);
        getListSpace();
        onSpaceUpdated?.();
    };

    const filteredData = useMemo(
        () =>
            (data as any[]).filter((item: any) =>
                matchesTextSearch(searchQ, item?.name, item?.slug, item?.description),
            ),
        [data, searchQ],
    );

    return (
        <View px={10} py={20}>
            <Flex mt={10} mb={16} align="center" gap={12} style={{ flexWrap: 'wrap' }}>
                <Button color="black" onClick={() => setCreateModalOpen(true)}>创建库</Button>
                <Input
                    value={searchQ}
                    onChange={(v: string) => setSearchQ(v)}
                    placeholder="搜索库名称…"
                    style={{ flex: '1 1 220px', maxWidth: `400px`, minWidth: `160px` }}
                />
            </Flex>
            <Divider my={20}/>
            <View>
                <SpaceCards data={filteredData} onSuccess={handleUpdateSpace}/>
            </View>
            <Dialog
                open={createModalOpen}
                // width={480}
                // transitionName="ant-fade"
                onCancel={() => setCreateModalOpen(false)}
                onPopuoverDown={() => setCreateModalOpen(false)}
                footer={null}
            >
                <CreateSpaceForm onSuccess={handleCreateSpace} />
            </Dialog>
        </View>
    );
}