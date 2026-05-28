import React, { useState } from 'react';
import {
	Flex,
	View,
	Button,
	message,
} from '@carvy/ui';
import {
	searchForWorkspaceInvite,
	inviteWorkspaceMember,
} from '@/api';
import { UserSearchSelect } from '@/components/userSearchSelect';

export type WorkspaceInviteProps = {
	style?: React.CSSProperties;
	onCancel?: () => void | null;
	onChange?: (key: string, item: any) => void;
}

export const WorkspaceInvite: React.FC<WorkspaceInviteProps> = props => {
	const {
		onCancel,
		style
	} = props;
	const [loading, setLoading] = useState(false);
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

	const fetchInviteCandidates = async (kw: string) => {
		const result = await searchForWorkspaceInvite(kw);
		if (result.code === 200) {
			return result.data || [];
		}
		return [];
	};

	const handleSubmit = async () => {
		if (selectedKeys.length === 0) {
			return;
		}
		setLoading(true);
		const rs = await inviteWorkspaceMember({
			invitee_id: selectedKeys[0]
		});
		if (rs.code === 200) {
			message.success('邀请成功');
		} else {
			message.error(rs.message || '邀请失败');
		}
		setLoading(false);
	};

	return (
		<View w="100%" h="100%" style={style}>
			<UserSearchSelect
				fetchUsers={fetchInviteCandidates}
				selectedKeys={selectedKeys}
				onChange={(keys) => {
					setSelectedKeys(keys);
				}}
				searchPlaceholder={'用户名 / 姓名 / 邮箱 / 手机 / 工号'}
				toolbarRight={
					<>
						{onCancel && (
							<Button onClick={onCancel}>取消</Button>
						)}
						<Button
							color="black"
							onClick={handleSubmit}
							disabled={selectedKeys.length === 0}
							loading={loading}
						>
							邀请
						</Button>
					</>
				}
			/>
		</View>
	);
};
