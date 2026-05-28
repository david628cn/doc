import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Popuover, 
    Menu, 
    Avatar, 
    Flex, 
    View, 
    Text,
    Dialog 
} from '@carvy/ui';
import { logoutAsync } from '@/store/features/authSlice';
import { WorkspaceSettings } from '../workspace/setting';
import { type AppDispatch, type RootState } from '@/store';
import history from '@/utils/history';
import { resolveCollaborationAvatarFields } from '@/utils/resolveHeadSculpture';

type UserPopoverProps = {
    menus?: Array<any>;
    collapsed?: boolean;
    isMobile?: boolean;
    pathname?: string;
    params?: any;
    onSuccess?: () => void;
}

export const UserPopover: React.FC<UserPopoverProps> = props => {
    const { 
        onSuccess 
    } = props;
    const [data, setData] = React.useState({});
    const [modalOpen, setModalOpen] = React.useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);

    const userHeadIcon = (() => {
        const { avatarUrl, avatarIcon } = resolveCollaborationAvatarFields(user?.head_sculpture);
        if (avatarUrl) return <img src={avatarUrl} alt="" />;
        return avatarIcon ?? user?.head_sculpture;
    })();

    const handleLogout = async () => {
        // 触发异步注销
        await dispatch(logoutAsync(null));
        // 注销后跳转回登录页
       //  history.push('/login');
        window.location.reload(); // 刷新页面，确保所有状态被清除
    };
    return (
        <>
            <Popuover
                zIndex={10}
                items={
                    <Menu
                        items={[
                            {
                                key: '/user',
                                label: <Flex gap={3} py={12}>
                                            <Avatar
                                                radius="full"
                                                size={42}
                                                title={user?.username}
                                                icon={userHeadIcon}                                                               
                                            />
                                            <View px={6}>
                                                <Text as="div" fontSize={14} fontWeight="bold">{user?.username}</Text>
                                                <Text as="div" fontSize={14} color="gray" style={{
                                                    wordBreak: 'break-all'
                                                }}>{user?.email}</Text>
                                            </View>
                                        </Flex>
                            },
                            { type: 'line' },
                            {
                                key: '/profile',
                                label: '个人信息',
                                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor"><path d="M655 530q63-49 85-126t-4-152.5T645 130 500 84t-145 46-91 121.5-4 152.5 85 126q-107 43-176.5 134.5T86 870q-2 17 9 31t28 16 31-9 16-28q9-83 55.5-151t119-107T501 583t156.5 39 119 107T832 880q2 16 14 26.5t28 10.5h4q17-2 28-15.5t9-30.5q-13-115-83-206.5T655 530m-155-30q-45 0-83.5-22.5t-61-61T333 333t22.5-83.5 61-61T500 166t83.5 22.5 61 61T667 333t-22.5 83.5-61 61T500 500"/></svg>
                            },
                            {
                                key: '/workspace',
                                label: '工作区管理',
                                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M853 85.014H171q-55 0-91.5 37t-36.5 91v427q0 54 36.5 91t91.5 37h42q20 0 31.5-11.5t11.5-31.5q0-19-11.5-30.5t-31.5-11.5h-42q-20 0-31.5-12t-11.5-31v-427q0-19 11.5-30.5t31.5-11.5h682q20 0 31.5 11.5t11.5 30.5v427q0 19-11.5 31t-31.5 12h-42q-20 0-31.5 11.5t-11.5 30.5q0 20 11.5 31.5t31.5 11.5h42q55 0 91.5-37t36.5-91v-427q0-54-36.5-91t-91.5-37m-307 529q-13-16-33.5-16t-30.5 16l-213 256q-7 10-9 22.5t5 24.5q3 10 12 16t22 6h426q13 0 22.5-6.5t16.5-19.5q6-13 4-25t-9-22zm-158 239 124-145 124 145z" /></svg>
                            },
                            // {
                            //     key: '/group',
                            //     label: '成员管理',
                            //     icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M555 597.014H213q-44 0-83 17-39 16-68 45t-45 68q-17 39-17 84v85q0 19 11.5 31t31.5 12q19 0 30.5-12t11.5-31v-85q0-55 37-91.5t91-36.5h342q54 0 91 36.5t37 91.5v85q0 19 11.5 31t30.5 12q20 0 31.5-12t11.5-31v-85q0-45-17-84-16-39-45-68t-68-45q-39-17-83-17m-171-85q45 0 84-17 39-16 67.5-45t45.5-68q16-39 16-83 0-45-16-84-17-39-45.5-68t-67.5-45q-39-17-84-17t-84 17q-39 16-67.5 45t-45.5 68q-16 39-16 84 0 44 16 83 17 39 45.5 68t67.5 45q39 17 84 17m0-341q54 0 91 36.5t37 91.5q0 54-37 91t-91 37-91-37-37-91q0-55 37-91.5t91-36.5m478 435q-16-3-32 5.5t-19 24.5q-4 16 5 32t25 19q41 10 67 44.5t26 79.5v85q0 19 12 31t31 12 31-12 12-31v-85q3-74-41-131.5t-117-73.5m-171-512q-16-7-30.5 2t-20.5 28q-3 16 5.5 32t24.5 19q51 13 79 58t15 100q-10 35-34.5 59.5t-59.5 34.5q-16 3-26 19t-4 32q3 16 15 25t28 9h8q58-16 99.5-56t54.5-98q11-44 5-88-7-43-27.5-79t-54.5-62-77-35" /></svg>
                            // },
                            // {
                            //     key: '/setting',
                            //     label: '设置',
                            //     icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M512 341.014q-70 0-120.5 50.5t-50.5 120.5 50.5 120.5 120.5 50.5 120.5-50.5 50.5-120.5-50.5-120.5-120.5-50.5m0 256q-35 0-60-25t-25-60 25-60 60-25 60 25 25 60-25 60-60 25m354 60q3-6 10-11.5t20-5.5q54 0 91-37t37-91-37-91-91-37h-9q-6 0-12-3t-9-10q0-3-.5-4t-3.5-4q-3-7-2-16t10-18q39-39 39-91.5t-39-88.5q-19-19-41.5-28.5t-47.5-9.5q-26 0-50.5 9.5t-43.5 28.5q-6 7-15 7.5t-15-2.5q-6 0-11.5-8t-5.5-18q0-54-37-91t-91-37-91 37-37 91v9q0 6-3 12t-10 9q-3 0-4 .5t-4 3.5q-7 3-16 .5t-18-8.5q-39-39-91.5-39t-88.5 39q-38 38-37.5 91.5t42.5 91.5q6 6 6.5 15.5t-2.5 18.5q-3 7-11.5 12t-18.5 5q-54 0-91 37t-37 91q0 55 37 91.5t91 36.5h9q9 0 15.5 5.5t9.5 11.5q3 7 2 16t-10 18q-20 20-29.5 42t-9.5 48 9.5 48 29.5 42q38 38 91.5 37.5t91.5-42.5q6-6 15.5-6.5t18.5 2.5q10 3 13.5 10t3.5 20q0 54 37 91t91 37q55 0 91.5-37t36.5-91v-9q0-9 5.5-15.5t11.5-9.5q7-3 16-2t18 10q39 39 91.5 39t88.5-39q38-38 37.5-91.5t-42.5-91.5q-3-6-5-15t1-15m-77-34q-12 32-6 65.5t32 62.5q6 6 9.5 13t3.5 17q0 9-3.5 16t-9.5 14q-6 6-13 9t-17 3-17-3.5-17-13.5q-26-25-59-31t-65 10q-32 13-50 41.5t-18 60.5v9q0 19-12 31t-31 12-30.5-12-11.5-31v-4q0-35-20.5-62.5t-52.5-40.5q-10-6-22-7t-25-1q-22 0-43.5 9t-37.5 25q-13 13-30 13t-30-13q-6-6-9-13t-3-17 3.5-17 13.5-17q25-26 31-59t-10-65q-13-32-41.5-50t-60.5-18h-9q-19 0-31-12t-12-31 12-30.5 31-11.5h4q35 0 62.5-20.5t40.5-52.5q12-32 6-65.5t-32-62.5q-13-13-13-30t13-30q13-12 30.5-11.5t33.5 16.5q22 22 54 28.5t61-3.5q3 0 6.5-.5t6.5-3.5q32-13 50-41.5t18-60.5v-9q0-19 12-31t31-12 31 12.5 12 34.5q0 35 18 62.5t50 40.5q32 12 65.5 6t62.5-32q6-6 13-9.5t17-3.5q9 0 16 3.5t14 9.5q12 13 11.5 30.5t-16.5 33.5q-22 22-28.5 54t3.5 61q0 3 .5 6.5t3.5 6.5q13 32 41.5 50t60.5 18h9q19 0 31 12t12 31-12.5 31-34.5 12q-32 0-61 18t-42 50"/></svg>
                            // },
                            // {
                            //     key: '/theme',
                            //     label: '主题',
                            //     icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" fill="currentColor"><path d="M902 542q-9-8-21-9.5t-23 3.5q-67 30-140 30-92 0-171-46-76-44-122-121-46-78-47-170 0-43 11-84 2-11-2-22t-12.5-18-19.5-9-22 2q-89 40-151 114T96 379.5t-4.5 189 78.5 172T314.5 861t183 46 185-38.5T832 754t85-169q3-12-1-23.5T902 542M506 820q-71 0-135-28.5t-112-80T187.5 593t-18-137 38-132T295 217v12q0 115 58 213 56 96 152 151 98 58 213 58 44 0 87-9-44 83-124.5 131.5T506 822z" /></svg>
                            // },
                            { type: 'line' },
                            {
                                key: '/login',
                                label: '退出',
                                icon: <svg width="1em" height="1em" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1028.014" fill="currentColor"><path d="M384 853.014H213q-19 0-30.5-11.5t-11.5-30.5v-598q0-19 11.5-30.5t30.5-11.5h171q19 0 31-12t12-31-12-31-31-12H213q-54 0-91 37t-37 91v598q0 54 37 91t91 37h171q19 0 31-12t12-31-12-31-31-12m550-324q4-6 4-15t-4-19q-3-3-4-6.5t-4-6.5l-213-213q-13-13-30-13t-30 13-13 30 13 30l141 140H384q-19 0-31 12t-12 31 12 31 31 12h410l-141 140q-13 13-13 30t13 30q6 7 14.5 10t15.5 3q6 0 14.5-3t15.5-10l213-213q3-3 5.5-6.5t2.5-6.5" /></svg>
                            }
                        ]}
                        onSelect={(params: any) => {
                            const key = params.key;
                            if (key === '/theme') {
  
                            } else if (key === '/workspace') {
                                setModalOpen(true);
                            } else if (key === '/profile') {
                                history.push('/profile');
                                // history.push(key);
                            } else if (key === '/login') {
                                handleLogout();
                            }
                        }}
                    />
                }
                // gap={6}
                pos={'tl-bl?'}
                trigger={'click'}
                style={{
                    width: '260px'
                }}
            // dxy={[20, 0]}
            >
                <Avatar
                    size={32}
                    fontSize={16}
                    radius="full"
                    title={user?.username}
                    icon={userHeadIcon}
                >
                </Avatar>
            </Popuover>
            <Dialog
                open={modalOpen}
                // width={480}
                // transitionName="ant-fade"
                onCancel={() => setModalOpen(false)}
                onPopuoverDown={() => setModalOpen(false)}
                footer={null}
                style={{
                    width: '630px'
                }}
            >
                <WorkspaceSettings 
                    params={data}
                    onSuccess={values => {
                        setModalOpen(false);
                        onSuccess?.();
                    }}
                />
            </Dialog>
        </>
    );
}