export * from './member';
export * from './space';
export * from './workspace';
/**
 * 8. 默认配置
 */
export const MEMBER_DEFAULT_SETTINGS = {
    MAX_INVITE_COUNT: 50,      // 单次最大邀请人数
    INVITE_LINK_EXPIRE: 7 * 24, // 默认链接有效期(小时)
};