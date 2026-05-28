import React from 'react';
import { View, Title, Text } from '@carvy/ui';
import { SpaceList } from '@/components/space/list';
import { CLASSNAME } from '@/config';
import './index.less';

const S = `${CLASSNAME}-space-library`;

const Space: React.FC = () => (
	<View className={S} px={20}>
		<Title level={2} m={0} mb={8}>
			库
		</Title>
		<Text fontSize={14} color="rgba(0,0,0,0.45)" mb={16} style={{ display: 'block' }}>
			当前工作区下的全部知识库（空间）。
		</Text>
		<SpaceList />
	</View>
);

export default Space;
