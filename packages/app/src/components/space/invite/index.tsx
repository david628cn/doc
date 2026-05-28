import React, { useState } from 'react';
import {
	message,
	View,
	Button,
} from '@carvy/ui';
import {
	searchForSpaceInvite,
	inviteSpaceMember,
} from '@/api';
import { UserSearchSelect } from '@/components/userSearchSelect';

export type SpaceInviteProps = {
	params?: any;
	style?: React.CSSProperties;
	autoFocus?: boolean;
	onCancel?: () => void | null;
	onChange?: (key: string, item: any) => void;
}

export const SpaceInvite: React.FC<SpaceInviteProps> = props => {
	const {
		params,
		style,
		autoFocus,
		onCancel
	} = props;

	const [loading, setLoading] = useState(false);
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

	const fetchSpaceInviteCandidates = async (kw: string) => {
		if (!params?.id) return [];
		const result = await searchForSpaceInvite(kw, params.id);
		if (result.code === 200) {
			return result.data || [];
		}
		return [];
	};

	const handleSubmit = async () => {
		if (selectedKeys.length === 0 || !params?.id) {
			return;
		}
		setLoading(true);
		const rs = await inviteSpaceMember({
			invitee_id: selectedKeys[0],
			space_id: params.id,
			role: 'viewer'
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
				fetchUsers={fetchSpaceInviteCandidates}
				selectedKeys={selectedKeys}
				onChange={(keys) => setSelectedKeys(keys)}
				searchPlaceholder={'用户名 / 姓名 / 邮箱 / 手机 / 工号'}
				autoFocus={autoFocus}
				toolbarRight={
					<>
						{onCancel && (
							<Button onClick={onCancel}>取消</Button>
						)}
						<Button
							color="black"
							onClick={handleSubmit}
							disabled={selectedKeys.length === 0 || !params?.id}
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
