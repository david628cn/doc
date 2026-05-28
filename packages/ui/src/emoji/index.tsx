import React, { useMemo, useState } from 'react';
import { SearchInput } from '../searchInput';
import { CategoryList } from '../categoryList';
import { Popuover, Tooltip } from '../popuover';
import { CLASSNAME } from '../config';
import './index.less';

const SKINS: Array<{ key: 'default' | 'light' | 'mediumLight' | 'medium' | 'mediumDark' | 'dark'; label: string; modifier: string; preview: string }> = [
    { key: 'default', label: '默认', modifier: '', preview: '👍' },
    { key: 'light', label: '浅色', modifier: '\u{1F3FB}', preview: '👍\u{1F3FB}' },
    { key: 'mediumLight', label: '偏浅', modifier: '\u{1F3FC}', preview: '👍\u{1F3FC}' },
    { key: 'medium', label: '中等', modifier: '\u{1F3FD}', preview: '👍\u{1F3FD}' },
    { key: 'mediumDark', label: '偏深', modifier: '\u{1F3FE}', preview: '👍\u{1F3FE}' },
    { key: 'dark', label: '深色', modifier: '\u{1F3FF}', preview: '👍\u{1F3FF}' },
];

const EMOJIS = [
    // { 
    //     key: 'recent',
    //     label: '最近', 
    //     icon: '🕘',
    //     children: [] // 初始为空，由逻辑记录后动态填充
    // },
    {
        key: 'smileys',
        label: '表情',
        icon: '😄',
        children: [
            { icon: '😀', name: 'grinning face', keywords: ['grinning', 'smile', '开心', '笑', '咧嘴'] },
            { icon: '😃', name: 'grinning face with big eyes', keywords: ['grinning', 'happy', '开心', '大眼'] },
            { icon: '😄', name: 'grinning face with smiling eyes', keywords: ['smile', 'happy', '大笑', '开心'] },
            { icon: '😁', name: 'beaming face with smiling eyes', keywords: ['grin', 'smile', '露齿笑', '开心'] },
            { icon: '😆', name: 'grinning squinting face', keywords: ['laugh', 'xd', '大笑', '眯眼笑'] },
            { icon: '😅', name: 'grinning face with sweat', keywords: ['sweat', 'smile', '尴尬', '流汗'] },
            { icon: '🤣', name: 'rolling on the floor laughing', keywords: ['rofl', 'laugh', '笑死', '打滚笑'] },
            { icon: '😂', name: 'face with tears of joy', keywords: ['lol', 'laugh', 'tears', '笑哭'] },
            { icon: '🙂', name: 'slightly smiling face', keywords: ['smile', 'ok', '微笑', '还行'] },
            { icon: '🙃', name: 'upside-down face', keywords: ['upside down', 'silly', '倒脸', '无语'] },
            { icon: '😉', name: 'winking face', keywords: ['wink', '调皮', '眨眼'] },
            { icon: '😊', name: 'smiling face with smiling eyes', keywords: ['smile', 'happy', '微笑', '满足'] },
            { icon: '😇', name: 'smiling face with halo', keywords: ['angel', 'halo', '天使', '乖'] },
            { icon: '🥰', name: 'smiling face with hearts', keywords: ['love', 'hearts', '可爱', '红心'] },
            { icon: '😍', name: 'smiling face with heart-eyes', keywords: ['love', 'heart', '喜欢', '爱'] },
            { icon: '🤩', name: 'star-struck', keywords: ['star', 'wow', '崇拜', '星星眼'] },
            { icon: '😘', name: 'face blowing a kiss', keywords: ['kiss', 'love', '飞吻', '亲'] },
            { icon: '😗', name: 'kissing face', keywords: ['kiss', '亲亲'] },
            { icon: '😚', name: 'kissing face with closed eyes', keywords: ['kiss', '亲', '闭眼'] },
            { icon: '😙', name: 'kissing face with smiling eyes', keywords: ['kiss', 'smile', '亲', '微笑'] },
            { icon: '😋', name: 'face savoring food', keywords: ['yum', 'delicious', '好吃', '馋'] },
            { icon: '😛', name: 'face with tongue', keywords: ['tongue', 'playful', '吐舌', '调皮'] },
            { icon: '😜', name: 'winking face with tongue', keywords: ['tongue', 'wink', '吐舌', '眨眼'] },
            { icon: '🤪', name: 'zany face', keywords: ['crazy', 'silly', '疯', '搞怪'] },
            { icon: '😝', name: 'squinting face with tongue', keywords: ['tongue', 'haha', '吐舌', '鬼脸'] },
            { icon: '🤑', name: 'money-mouth face', keywords: ['money', 'rich', '发财', '钱'] },
            { icon: '🤗', name: 'hugging face', keywords: ['hug', '抱抱', '拥抱'] },
            { icon: '🤭', name: 'face with hand over mouth', keywords: ['oops', 'giggle', '偷笑', '捂嘴'] },
            { icon: '🤫', name: 'shushing face', keywords: ['quiet', 'shh', '嘘', '安静'] },
            { icon: '🤔', name: 'thinking face', keywords: ['think', 'hmm', '思考', '想想'] },
            { icon: '🤨', name: 'face with raised eyebrow', keywords: ['skeptical', 'really', '怀疑', '挑眉'] },
            { icon: '😐', name: 'neutral face', keywords: ['neutral', 'meh', '无语', '面无表情'] },
            { icon: '😑', name: 'expressionless face', keywords: ['expressionless', 'blank', '冷漠', '无表情'] },
            { icon: '😶', name: 'face without mouth', keywords: ['speechless', 'silence', '无话可说', '沉默'] },
            { icon: '🫥', name: 'dotted line face', keywords: ['invisible', 'disappear', '隐身', '虚线脸'] },
            { icon: '😶‍🌫️', name: 'face in clouds', keywords: ['confused', 'fog', '迷糊', '云雾'] },
            { icon: '😏', name: 'smirking face', keywords: ['smirk', '得意', '坏笑'] },
            { icon: '😒', name: 'unamused face', keywords: ['unamused', 'annoyed', '不爽', '嫌弃'] },
            { icon: '🙄', name: 'face with rolling eyes', keywords: ['eyeroll', 'roll', '翻白眼', '无语'] },
            { icon: '😬', name: 'grimacing face', keywords: ['grimace', 'awkward', '尬', '尴尬'] },
            { icon: '😮‍💨', name: 'face exhaling', keywords: ['sigh', 'relief', '叹气', '呼气'] },
            { icon: '🤥', name: 'lying face', keywords: ['lie', 'pinocchio', '说谎', '骗子'] },
            { icon: '😌', name: 'relieved face', keywords: ['relieved', 'calm', '松口气', '安心'] },
            { icon: '😔', name: 'pensive face', keywords: ['sad', 'down', '难过', '低落'] },
            { icon: '😪', name: 'sleepy face', keywords: ['sleepy', 'tired', '困', '想睡'] },
            { icon: '🤤', name: 'drooling face', keywords: ['drool', 'hungry', '流口水', '馋'] },
            { icon: '😴', name: 'sleeping face', keywords: ['sleep', 'zzz', '困', '睡觉'] },
            { icon: '😷', name: 'face with medical mask', keywords: ['mask', 'sick', '口罩', '生病'] },
            { icon: '🤒', name: 'face with thermometer', keywords: ['fever', 'sick', '发烧', '生病'] },
            { icon: '🤕', name: 'face with head-bandage', keywords: ['hurt', 'injured', '受伤', '绷带'] },
            { icon: '🤢', name: 'nauseated face', keywords: ['nausea', 'sick', '恶心', '想吐'] },
            { icon: '🤮', name: 'face vomiting', keywords: ['vomit', 'sick', '呕吐', '吐'] },
            { icon: '🥵', name: 'hot face', keywords: ['hot', 'heat', '热', '中暑'] },
            { icon: '🥶', name: 'cold face', keywords: ['cold', 'freeze', '冷', '发抖'] },
            { icon: '🥴', name: 'woozy face', keywords: ['dizzy', 'drunk', '晕', '迷糊'] },
            { icon: '😵', name: 'face with crossed-out eyes', keywords: ['dizzy', 'dead', '晕倒', '眼冒金星'] },
            { icon: '😵‍💫', name: 'face with spiral eyes', keywords: ['spiral', 'dizzy', '眩晕', '转圈'] },
            { icon: '🤯', name: 'exploding head', keywords: ['mind blown', 'shock', '炸裂', '震惊'] },
            { icon: '😕', name: 'confused face', keywords: ['confused', 'what', '疑惑', '懵'] },
            { icon: '🫤', name: 'face with diagonal mouth', keywords: ['unsure', 'meh', '无奈', '尴尬'] },
            { icon: '😟', name: 'worried face', keywords: ['worried', 'concern', '担心', '焦虑'] },
            { icon: '🙁', name: 'slightly frowning face', keywords: ['frown', 'sad', '不开心', '皱眉'] },
            { icon: '☹️', name: 'frowning face', keywords: ['frown', 'sad', '难过', '伤心'] },
            { icon: '😮', name: 'face with open mouth', keywords: ['surprise', 'wow', '惊讶', '张嘴'] },
            { icon: '😯', name: 'hushed face', keywords: ['hushed', 'surprised', '惊呆', '哑口'] },
            { icon: '😲', name: 'astonished face', keywords: ['astonished', 'shock', '震惊', '吃惊'] },
            { icon: '😳', name: 'flushed face', keywords: ['embarrassed', 'blush', '脸红', '害羞'] },
            { icon: '🥺', name: 'pleading face', keywords: ['please', 'beg', '求求', '可怜'] },
            { icon: '🥹', name: 'face holding back tears', keywords: ['tears', 'touch', '感动', '委屈'] },
            { icon: '😦', name: 'frowning face with open mouth', keywords: ['frown', 'shock', '难过', '惊讶'] },
            { icon: '😧', name: 'anguished face', keywords: ['anguish', 'stressed', '痛苦', '难受'] },
            { icon: '😨', name: 'fearful face', keywords: ['fear', 'scared', '害怕', '恐惧'] },
            { icon: '😰', name: 'anxious face with sweat', keywords: ['anxious', 'sweat', '紧张', '流汗'] },
            { icon: '😥', name: 'sad but relieved face', keywords: ['relief', 'sad', '松口气', '难过'] },
            { icon: '😢', name: 'crying face', keywords: ['cry', 'sad', '哭', '伤心'] },
            { icon: '😭', name: 'loudly crying face', keywords: ['cry', 'sad', '大哭', '伤心'] },
            { icon: '😱', name: 'face screaming in fear', keywords: ['scared', 'shock', '惊吓', '天呐'] },
            { icon: '😖', name: 'confounded face', keywords: ['confounded', 'upset', '崩溃', '难受'] },
            { icon: '😣', name: 'persevering face', keywords: ['persevere', 'tough', '坚持', '难'] },
            { icon: '😞', name: 'disappointed face', keywords: ['disappointed', 'sad', '失望', '沮丧'] },
            { icon: '😓', name: 'downcast face with sweat', keywords: ['sweat', 'tired', '累', '流汗'] },
            { icon: '😩', name: 'weary face', keywords: ['weary', 'tired', '累死', '疲惫'] },
            { icon: '😫', name: 'tired face', keywords: ['tired', 'exhausted', '好累', '疲惫'] },
            { icon: '🥱', name: 'yawning face', keywords: ['yawn', 'sleepy', '打哈欠', '困'] },
            { icon: '😤', name: 'face with steam from nose', keywords: ['huff', 'proud', '哼', '生气'] },
            { icon: '😡', name: 'pouting face', keywords: ['angry', 'mad', '生气', '愤怒'] },
            { icon: '😠', name: 'angry face', keywords: ['angry', 'mad', '生气', '气'] },
            { icon: '🤬', name: 'face with symbols on mouth', keywords: ['swear', 'curse', '骂人', '脏话'] },
            { icon: '😈', name: 'smiling face with horns', keywords: ['devil', 'evil', '坏', '恶魔'] },
            { icon: '👿', name: 'angry face with horns', keywords: ['devil', 'angry', '恶魔', '生气'] },
            { icon: '💀', name: 'skull', keywords: ['skull', 'dead', '骷髅', '死了'] },
            { icon: '☠️', name: 'skull and crossbones', keywords: ['poison', 'danger', '危险', '骷髅'] },
            { icon: '🤡', name: 'clown face', keywords: ['clown', 'funny', '小丑', '滑稽'] },
            { icon: '👻', name: 'ghost', keywords: ['ghost', 'boo', '鬼', '幽灵'] },
            { icon: '👽', name: 'alien', keywords: ['alien', 'ufo', '外星人'] },
            { icon: '🤖', name: 'robot', keywords: ['robot', 'bot', '机器人'] },
            { icon: '💩', name: 'pile of poo', keywords: ['poop', 'shit', '便便', '屎'] }
        ]
    },
    {
        key: 'people',
        label: '人物',
        icon: '🧑',
        children: [
            { icon: '👋', name: 'waving hand', keywords: ['wave', 'hello', 'hi', '挥手', '你好'] },
            { icon: '🤚', name: 'raised back of hand', keywords: ['hand', 'stop', '手', '停'] },
            { icon: '🖐️', name: 'hand with fingers splayed', keywords: ['hand', 'five', '五', '手掌'] },
            { icon: '✋', name: 'raised hand', keywords: ['hand', 'high five', '击掌', '举手'] },
            { icon: '🖖', name: 'vulcan salute', keywords: ['vulcan', 'spock', '瓦肯', '星际'] },
            { icon: '👌', name: 'ok hand', keywords: ['ok', 'good', '可以', '好的'] },
            { icon: '🤌', name: 'pinched fingers', keywords: ['pinched', 'italian', '捏手指', '啥'] },
            { icon: '🤏', name: 'pinching hand', keywords: ['small', 'tiny', '一点点', '捏'] },
            { icon: '✌️', name: 'victory hand', keywords: ['peace', 'victory', '耶', '胜利'] },
            { icon: '🤞', name: 'crossed fingers', keywords: ['luck', 'hope', '保佑', '好运'] },
            { icon: '🤟', name: 'love-you gesture', keywords: ['love', 'ily', '爱你', '手势'] },
            { icon: '🤘', name: 'sign of the horns', keywords: ['rock', 'metal', '摇滚', '牛'] },
            { icon: '👍', name: 'thumbs up', keywords: ['thumb', 'like', '赞', '好'] },
            { icon: '👎', name: 'thumbs down', keywords: ['thumb', 'dislike', '踩', '不好'] },
            { icon: '👊', name: 'oncoming fist', keywords: ['fist', 'punch', '拳头', '加油'] },
            { icon: '✊', name: 'raised fist', keywords: ['fist', 'power', '拳', '力量'] },
            { icon: '🤛', name: 'left-facing fist', keywords: ['fist bump', '碰拳', '拳'] },
            { icon: '🤜', name: 'right-facing fist', keywords: ['fist bump', '碰拳', '拳'] },
            { icon: '👏', name: 'clapping hands', keywords: ['clap', 'bravo', '鼓掌'] },
            { icon: '🙌', name: 'raising hands', keywords: ['celebrate', 'hooray', '欢呼', '举手'] },
            { icon: '🫶', name: 'heart hands', keywords: ['heart', 'love', '爱心', '比心'] },
            { icon: '🤝', name: 'handshake', keywords: ['shake', 'deal', '握手', '合作'] },
            { icon: '🙏', name: 'folded hands', keywords: ['pray', 'thanks', '谢谢', '拜托', '祈祷'] },
            { icon: '💪', name: 'flexed biceps', keywords: ['strong', 'power', '加油', '力量'] },
            { icon: '🧠', name: 'brain', keywords: ['brain', 'think', '大脑', '脑子'] },
            { icon: '🫀', name: 'anatomical heart', keywords: ['heart', 'organ', '心脏'] },
            { icon: '🫁', name: 'lungs', keywords: ['lungs', 'breath', '肺', '呼吸'] },
            { icon: '👀', name: 'eyes', keywords: ['eyes', 'look', '看', '盯'] },
            { icon: '👁️', name: 'eye', keywords: ['eye', 'see', '眼睛'] },
            { icon: '🫦', name: 'biting lip', keywords: ['lip', 'nervous', '咬唇', '紧张'] },
            { icon: '👅', name: 'tongue', keywords: ['tongue', 'taste', '舌头'] },
            { icon: '💋', name: 'kiss mark', keywords: ['kiss', 'lipstick', '吻', '唇印'] },
            { icon: '👶', name: 'baby', keywords: ['baby', 'kid', '宝宝', '婴儿'] },
            { icon: '🧒', name: 'child', keywords: ['child', 'kid', '小孩'] },
            { icon: '👦', name: 'boy', keywords: ['boy', '男孩', '小男孩'] },
            { icon: '👧', name: 'girl', keywords: ['girl', '女孩', '小女孩'] },
            { icon: '🧑', name: 'person', keywords: ['person', 'adult', '人', '成年人'] },
            { icon: '👨', name: 'man', keywords: ['man', '男', '男人'] },
            { icon: '👩', name: 'woman', keywords: ['woman', '女', '女人'] },
            { icon: '🧓', name: 'older person', keywords: ['old', 'elder', '老人'] },
            { icon: '👴', name: 'old man', keywords: ['old man', 'grandpa', '爷爷', '老爷爷'] },
            { icon: '👵', name: 'old woman', keywords: ['old woman', 'grandma', '奶奶', '老奶奶'] },
            { icon: '🧑‍🎓', name: 'student', keywords: ['student', 'graduate', '学生', '毕业'] },
            { icon: '🧑‍💻', name: 'technologist', keywords: ['code', 'developer', '程序员', '开发'] },
            { icon: '🧑‍🏫', name: 'teacher', keywords: ['teacher', '学校', '老师'] },
            { icon: '🧑‍⚕️', name: 'health worker', keywords: ['doctor', 'nurse', '医生', '护士'] },
            { icon: '🧑‍🚀', name: 'astronaut', keywords: ['astronaut', 'space', '宇航员', '太空'] },
            { icon: '🧑‍🍳', name: 'cook', keywords: ['cook', 'chef', '厨师', '做饭'] },
            { icon: '👮‍♀️', name: 'police officer', keywords: ['police', 'cop', '警察'] },
            { icon: '🕵️‍♂️', name: 'detective', keywords: ['detective', 'spy', '侦探', '特工'] },
            { icon: '💃', name: 'woman dancing', keywords: ['dance', 'party', '跳舞', '舞蹈'] },
            { icon: '🕺', name: 'man dancing', keywords: ['dance', 'disco', '跳舞', '舞王'] },
            { icon: '🏃‍♀️', name: 'woman running', keywords: ['run', 'exercise', '跑步', '运动'] },
            { icon: '🏃‍♂️', name: 'man running', keywords: ['run', 'exercise', '跑步', '运动'] },
            { icon: '🧘', name: 'person in lotus position', keywords: ['yoga', 'meditate', '瑜伽', '冥想'] },
            { icon: '👨‍👩‍👧‍👦', name: 'family', keywords: ['family', 'home', '家庭', '一家人'] },
            { icon: '❤️', name: 'red heart', keywords: ['love', 'heart', '爱', '红心'] },
            { icon: '🧡', name: 'orange heart', keywords: ['heart', 'love', '橙心'] },
            { icon: '💛', name: 'yellow heart', keywords: ['heart', 'love', '黄心'] },
            { icon: '💚', name: 'green heart', keywords: ['heart', 'love', '绿心'] },
            { icon: '💙', name: 'blue heart', keywords: ['heart', 'love', '蓝心'] },
            { icon: '💜', name: 'purple heart', keywords: ['heart', 'love', '紫心'] },
            { icon: '🖤', name: 'black heart', keywords: ['heart', 'black', '黑心'] },
            { icon: '🤍', name: 'white heart', keywords: ['heart', 'white', '白心'] },
            { icon: '💔', name: 'broken heart', keywords: ['heartbreak', 'sad', '心碎', '失恋'] },
            { icon: '💖', name: 'sparkling heart', keywords: ['heart', 'sparkle', '闪心', '爱'] },
            { icon: '💫', name: 'dizzy', keywords: ['dizzy', 'sparkle', '眩晕', '星光'] },
            { icon: '✨', name: 'sparkles', keywords: ['sparkle', 'shiny', '闪烁', '星星'] },
            { icon: '🔥', name: 'fire', keywords: ['hot', 'fire', '火', '热门'] }
        ]
    },
    {
        key: 'nature',
        label: '自然',
        icon: '🐶',
        children: [
            { icon: '🐶', name: 'dog face', keywords: ['dog', 'pet', '狗'] },
            { icon: '🐱', name: 'cat face', keywords: ['cat', 'pet', '猫'] },
            { icon: '🐭', name: 'mouse face', keywords: ['mouse', 'pet', '老鼠'] },
            { icon: '🐹', name: 'hamster face', keywords: ['hamster', 'pet', '仓鼠'] },
            { icon: '🐰', name: 'rabbit face', keywords: ['rabbit', 'pet', '兔子'] },
            { icon: '🦊', name: 'fox face', keywords: ['fox', 'animal', '狐狸'] },
            { icon: '🐻', name: 'bear', keywords: ['bear', 'animal', '熊'] },
            { icon: '🐼', name: 'panda', keywords: ['panda', '熊猫'] },
            { icon: '🐨', name: 'koala', keywords: ['koala', '考拉', '树袋熊'] },
            { icon: '🐯', name: 'tiger face', keywords: ['tiger', '老虎'] },
            { icon: '🦁', name: 'lion', keywords: ['lion', '狮子'] },
            { icon: '🐮', name: 'cow face', keywords: ['cow', '牛'] },
            { icon: '🐷', name: 'pig face', keywords: ['pig', '猪'] },
            { icon: '🐸', name: 'frog', keywords: ['frog', '青蛙'] },
            { icon: '🐵', name: 'monkey face', keywords: ['monkey', '猴子'] },
            { icon: '🙈', name: 'see-no-evil monkey', keywords: ['monkey', 'hide', '不看', '捂眼'] },
            { icon: '🙉', name: 'hear-no-evil monkey', keywords: ['monkey', 'no hear', '不听', '捂耳'] },
            { icon: '🙊', name: 'speak-no-evil monkey', keywords: ['monkey', 'no speak', '不说', '捂嘴'] },
            { icon: '🐔', name: 'chicken', keywords: ['chicken', '鸡'] },
            { icon: '🐧', name: 'penguin', keywords: ['penguin', '企鹅'] },
            { icon: '🐦', name: 'bird', keywords: ['bird', '鸟'] },
            { icon: '🐤', name: 'baby chick', keywords: ['chick', '小鸡'] },
            { icon: '🦆', name: 'duck', keywords: ['duck', '鸭子'] },
            { icon: '🦅', name: 'eagle', keywords: ['eagle', '鹰'] },
            { icon: '🦉', name: 'owl', keywords: ['owl', '猫头鹰'] },
            { icon: '🦇', name: 'bat', keywords: ['bat', '蝙蝠'] },
            { icon: '🐺', name: 'wolf', keywords: ['wolf', '狼'] },
            { icon: '🐗', name: 'boar', keywords: ['boar', 'wild', '野猪'] },
            { icon: '🐴', name: 'horse face', keywords: ['horse', '马'] },
            { icon: '🦄', name: 'unicorn', keywords: ['unicorn', '独角兽'] },
            { icon: '🐝', name: 'honeybee', keywords: ['bee', '蜜蜂'] },
            { icon: '🦋', name: 'butterfly', keywords: ['butterfly', '蝴蝶'] },
            { icon: '🐛', name: 'bug', keywords: ['bug', '虫子'] },
            { icon: '🪲', name: 'beetle', keywords: ['beetle', '甲虫'] },
            { icon: '🪳', name: 'cockroach', keywords: ['cockroach', '蟑螂'] },
            { icon: '🕷️', name: 'spider', keywords: ['spider', '蜘蛛'] },
            { icon: '🦂', name: 'scorpion', keywords: ['scorpion', '蝎子'] },
            { icon: '🐢', name: 'turtle', keywords: ['turtle', '乌龟'] },
            { icon: '🐍', name: 'snake', keywords: ['snake', '蛇'] },
            { icon: '🦎', name: 'lizard', keywords: ['lizard', '蜥蜴'] },
            { icon: '🐙', name: 'octopus', keywords: ['octopus', '章鱼'] },
            { icon: '🦑', name: 'squid', keywords: ['squid', '鱿鱼'] },
            { icon: '🦀', name: 'crab', keywords: ['crab', '螃蟹'] },
            { icon: '🐠', name: 'tropical fish', keywords: ['fish', '热带鱼'] },
            { icon: '🐟', name: 'fish', keywords: ['fish', '鱼'] },
            { icon: '🐬', name: 'dolphin', keywords: ['dolphin', '海豚'] },
            { icon: '🐳', name: 'spouting whale', keywords: ['whale', '鲸鱼'] },
            { icon: '🦈', name: 'shark', keywords: ['shark', '鲨鱼'] },
            { icon: '🌸', name: 'cherry blossom', keywords: ['flower', 'spring', '樱花', '花'] },
            { icon: '🌹', name: 'rose', keywords: ['flower', 'rose', '玫瑰'] },
            { icon: '🌷', name: 'tulip', keywords: ['tulip', 'flower', '郁金香'] },
            { icon: '🌻', name: 'sunflower', keywords: ['sunflower', '向日葵'] },
            { icon: '🌼', name: 'blossom', keywords: ['flower', '花', '花朵'] },
            { icon: '🥀', name: 'wilted flower', keywords: ['wilt', 'sad', '枯萎', '花'] },
            { icon: '🌱', name: 'seedling', keywords: ['seed', 'plant', '幼苗', '发芽'] },
            { icon: '🌿', name: 'herb', keywords: ['herb', 'plant', '草', '植物'] },
            { icon: '🍀', name: 'four leaf clover', keywords: ['luck', 'clover', '好运', '草'] },
            { icon: '🍁', name: 'maple leaf', keywords: ['leaf', 'autumn', '枫叶', '秋天'] },
            { icon: '🍂', name: 'fallen leaf', keywords: ['leaf', 'fall', '落叶', '秋'] },
            { icon: '🌵', name: 'cactus', keywords: ['cactus', '仙人掌'] },
            { icon: '🌴', name: 'palm tree', keywords: ['palm', 'beach', '棕榈', '海边'] },
            { icon: '🌳', name: 'deciduous tree', keywords: ['tree', '树', '大树'] },
            { icon: '🌲', name: 'evergreen tree', keywords: ['tree', 'pine', '松树'] },
            { icon: '🪵', name: 'wood', keywords: ['wood', 'log', '木头', '原木'] },
            { icon: '🌍', name: 'globe showing Europe-Africa', keywords: ['earth', 'world', '地球', '世界'] },
            { icon: '🌙', name: 'crescent moon', keywords: ['moon', 'night', '月亮'] },
            { icon: '⭐️', name: 'star', keywords: ['star', '星星'] },
            { icon: '🌟', name: 'glowing star', keywords: ['star', 'shine', '闪亮', '星'] },
            { icon: '☀️', name: 'sun', keywords: ['sun', 'weather', '太阳', '晴天'] },
            { icon: '⛅️', name: 'sun behind cloud', keywords: ['cloud', 'sun', '多云', '天气'] },
            { icon: '☁️', name: 'cloud', keywords: ['cloud', '天气', '云'] },
            { icon: '🌧️', name: 'cloud with rain', keywords: ['rain', 'weather', '下雨', '雨'] },
            { icon: '⛈️', name: 'cloud with lightning and rain', keywords: ['storm', 'thunder', '雷雨', '暴雨'] },
            { icon: '🌩️', name: 'cloud with lightning', keywords: ['lightning', '雷', '闪电'] },
            { icon: '🌨️', name: 'cloud with snow', keywords: ['snow', '下雪', '雪'] },
            { icon: '❄️', name: 'snowflake', keywords: ['snow', 'flake', '雪花'] },
            { icon: '🌪️', name: 'tornado', keywords: ['tornado', '龙卷风'] },
            { icon: '🌈', name: 'rainbow', keywords: ['rainbow', 'weather', '彩虹'] },
            { icon: '🔥', name: 'fire', keywords: ['fire', 'hot', '火'] },
            { icon: '💧', name: 'droplet', keywords: ['water', 'drop', '水滴'] },
            { icon: '🌊', name: 'water wave', keywords: ['wave', 'sea', '海浪', '浪'] }
        ]
    },
    {
        key: 'food',
        label: '食物',
        icon: '🍔',
        children: [
            { icon: '🍏', name: 'green apple', keywords: ['apple', 'fruit', '青苹果'] },
            { icon: '🍎', name: 'red apple', keywords: ['apple', 'fruit', '苹果'] },
            { icon: '🍐', name: 'pear', keywords: ['pear', 'fruit', '梨'] },
            { icon: '🍊', name: 'tangerine', keywords: ['orange', 'fruit', '橘子', '橙'] },
            { icon: '🍋', name: 'lemon', keywords: ['lemon', 'fruit', '柠檬'] },
            { icon: '🍌', name: 'banana', keywords: ['banana', 'fruit', '香蕉'] },
            { icon: '🍉', name: 'watermelon', keywords: ['watermelon', 'fruit', '西瓜'] },
            { icon: '🍇', name: 'grapes', keywords: ['grapes', 'fruit', '葡萄'] },
            { icon: '🍓', name: 'strawberry', keywords: ['strawberry', 'fruit', '草莓'] },
            { icon: '🫐', name: 'blueberries', keywords: ['blueberry', 'fruit', '蓝莓'] },
            { icon: '🍒', name: 'cherries', keywords: ['cherry', 'fruit', '樱桃'] },
            { icon: '🍑', name: 'peach', keywords: ['peach', 'fruit', '桃子'] },
            { icon: '🥭', name: 'mango', keywords: ['mango', 'fruit', '芒果'] },
            { icon: '🍍', name: 'pineapple', keywords: ['pineapple', 'fruit', '菠萝'] },
            { icon: '🥥', name: 'coconut', keywords: ['coconut', 'fruit', '椰子'] },
            { icon: '🥝', name: 'kiwi fruit', keywords: ['kiwi', 'fruit', '猕猴桃'] },
            { icon: '🍅', name: 'tomato', keywords: ['tomato', 'vegetable', '西红柿', '番茄'] },
            { icon: '🥑', name: 'avocado', keywords: ['avocado', 'fruit', '牛油果'] },
            { icon: '🍆', name: 'eggplant', keywords: ['eggplant', 'vegetable', '茄子'] },
            { icon: '🥔', name: 'potato', keywords: ['potato', 'vegetable', '土豆'] },
            { icon: '🥕', name: 'carrot', keywords: ['carrot', 'vegetable', '胡萝卜'] },
            { icon: '🌽', name: 'ear of corn', keywords: ['corn', 'vegetable', '玉米'] },
            { icon: '🌶️', name: 'hot pepper', keywords: ['pepper', 'spicy', '辣椒', '辣'] },
            { icon: '🥒', name: 'cucumber', keywords: ['cucumber', 'vegetable', '黄瓜'] },
            { icon: '🥬', name: 'leafy green', keywords: ['vegetable', 'greens', '青菜', '生菜'] },
            { icon: '🥦', name: 'broccoli', keywords: ['broccoli', 'vegetable', '西兰花'] },
            { icon: '🧄', name: 'garlic', keywords: ['garlic', '蒜', '大蒜'] },
            { icon: '🧅', name: 'onion', keywords: ['onion', '洋葱'] },
            { icon: '🍞', name: 'bread', keywords: ['bread', 'food', '面包'] },
            { icon: '🥐', name: 'croissant', keywords: ['croissant', 'bread', '可颂'] },
            { icon: '🥖', name: 'baguette bread', keywords: ['baguette', 'bread', '法棍'] },
            { icon: '🥨', name: 'pretzel', keywords: ['pretzel', 'snack', '椒盐卷饼'] },
            { icon: '🧀', name: 'cheese wedge', keywords: ['cheese', '奶酪', '芝士'] },
            { icon: '🥚', name: 'egg', keywords: ['egg', 'food', '鸡蛋'] },
            { icon: '🍳', name: 'cooking', keywords: ['egg', 'pan', '煎蛋', '做饭'] },
            { icon: '🥞', name: 'pancakes', keywords: ['pancake', 'breakfast', '煎饼'] },
            { icon: '🥓', name: 'bacon', keywords: ['bacon', 'meat', '培根'] },
            { icon: '🥩', name: 'cut of meat', keywords: ['meat', 'steak', '牛排', '肉'] },
            { icon: '🍗', name: 'poultry leg', keywords: ['chicken', 'meat', '鸡腿'] },
            { icon: '🍖', name: 'meat on bone', keywords: ['meat', 'rib', '排骨'] },
            { icon: '🌭', name: 'hot dog', keywords: ['hotdog', 'food', '热狗'] },
            { icon: '🍔', name: 'hamburger', keywords: ['burger', 'food', '汉堡'] },
            { icon: '🍟', name: 'fries', keywords: ['fries', 'chips', '薯条'] },
            { icon: '🍕', name: 'pizza', keywords: ['pizza', 'food', '披萨'] },
            { icon: '🥪', name: 'sandwich', keywords: ['sandwich', 'food', '三明治'] },
            { icon: '🌮', name: 'taco', keywords: ['taco', 'food', '塔可'] },
            { icon: '🌯', name: 'burrito', keywords: ['burrito', 'food', '墨西哥卷'] },
            { icon: '🥙', name: 'stuffed flatbread', keywords: ['kebab', 'wrap', '夹饼', '卷饼'] },
            { icon: '🍝', name: 'spaghetti', keywords: ['pasta', 'spaghetti', '意面'] },
            { icon: '🍜', name: 'steaming bowl', keywords: ['noodle', 'ramen', '面', '拉面'] },
            { icon: '🍲', name: 'pot of food', keywords: ['pot', 'food', '火锅', '锅'] },
            { icon: '🍛', name: 'curry rice', keywords: ['curry', 'rice', '咖喱', '咖喱饭'] },
            { icon: '🍣', name: 'sushi', keywords: ['sushi', 'food', '寿司'] },
            { icon: '🍱', name: 'bento box', keywords: ['bento', 'lunch', '便当'] },
            { icon: '🥟', name: 'dumpling', keywords: ['dumpling', 'jiaozi', '饺子'] },
            { icon: '🍤', name: 'fried shrimp', keywords: ['shrimp', 'tempura', '虾', '炸虾'] },
            { icon: '🦪', name: 'oyster', keywords: ['oyster', 'seafood', '生蚝'] },
            { icon: '🍙', name: 'rice ball', keywords: ['rice', 'onigiri', '饭团'] },
            { icon: '🍚', name: 'cooked rice', keywords: ['rice', 'food', '米饭'] },
            { icon: '🍘', name: 'rice cracker', keywords: ['snack', 'cracker', '米饼'] },
            { icon: '🍢', name: 'oden', keywords: ['oden', 'skewer', '关东煮'] },
            { icon: '🍡', name: 'dango', keywords: ['dango', 'dessert', '团子'] },
            { icon: '🍧', name: 'shaved ice', keywords: ['ice', 'dessert', '刨冰'] },
            { icon: '🍦', name: 'soft ice cream', keywords: ['icecream', 'cold', '冰淇淋'] },
            { icon: '🍨', name: 'ice cream', keywords: ['icecream', 'dessert', '冰激凌'] },
            { icon: '🍩', name: 'doughnut', keywords: ['donut', 'dessert', '甜甜圈'] },
            { icon: '🍪', name: 'cookie', keywords: ['cookie', 'dessert', '饼干'] },
            { icon: '🎂', name: 'birthday cake', keywords: ['cake', 'birthday', '生日', '蛋糕'] },
            { icon: '🍰', name: 'shortcake', keywords: ['cake', 'dessert', '蛋糕'] },
            { icon: '🧁', name: 'cupcake', keywords: ['cupcake', 'dessert', '纸杯蛋糕'] },
            { icon: '🍫', name: 'chocolate bar', keywords: ['chocolate', 'dessert', '巧克力'] },
            { icon: '🍬', name: 'candy', keywords: ['candy', 'sweet', '糖果'] },
            { icon: '🍭', name: 'lollipop', keywords: ['lollipop', 'candy', '棒棒糖'] },
            { icon: '🍮', name: 'custard', keywords: ['pudding', 'dessert', '布丁'] },
            { icon: '☕️', name: 'hot beverage', keywords: ['coffee', 'tea', '咖啡', '茶'] },
            { icon: '🫖', name: 'teapot', keywords: ['tea', 'teapot', '茶壶'] },
            { icon: '🍵', name: 'teacup without handle', keywords: ['tea', 'matcha', '绿茶'] },
            { icon: '🥛', name: 'glass of milk', keywords: ['milk', 'drink', '牛奶'] },
            { icon: '🧋', name: 'bubble tea', keywords: ['boba', 'milk tea', '奶茶', '珍珠'] },
            { icon: '🧃', name: 'beverage box', keywords: ['juice', 'drink', '果汁'] },
            { icon: '🧉', name: 'mate', keywords: ['mate', 'tea', '马黛茶'] },
            { icon: '🍺', name: 'beer mug', keywords: ['beer', 'drink', '啤酒'] },
            { icon: '🍻', name: 'clinking beer mugs', keywords: ['cheers', 'beer', '干杯', '碰杯'] },
            { icon: '🥂', name: 'clinking glasses', keywords: ['cheers', 'wine', '香槟', '干杯'] },
            { icon: '🍷', name: 'wine glass', keywords: ['wine', 'drink', '红酒'] },
            { icon: '🥤', name: 'cup with straw', keywords: ['soda', 'drink', '饮料'] },
            { icon: '🧊', name: 'ice', keywords: ['ice', 'cold', '冰块'] }
        ]
    },
    {
        key: 'activities',
        label: '活动',
        icon: '⚽️',
        children: [
            { icon: '⚽️', name: 'soccer ball', keywords: ['soccer', 'football', '足球'] },
            { icon: '🏀', name: 'basketball', keywords: ['basketball', '篮球'] },
            { icon: '🏈', name: 'american football', keywords: ['football', 'sport', '橄榄球'] },
            { icon: '⚾️', name: 'baseball', keywords: ['baseball', 'sport', '棒球'] },
            { icon: '🥎', name: 'softball', keywords: ['softball', 'sport', '垒球'] },
            { icon: '🎾', name: 'tennis', keywords: ['tennis', 'sport', '网球'] },
            { icon: '🏐', name: 'volleyball', keywords: ['volleyball', 'sport', '排球'] },
            { icon: '🏉', name: 'rugby football', keywords: ['rugby', 'sport', '英式橄榄球'] },
            { icon: '🎱', name: 'pool 8 ball', keywords: ['billiards', 'pool', '台球'] },
            { icon: '🏓', name: 'ping pong', keywords: ['ping pong', 'table tennis', '乒乓球'] },
            { icon: '🏸', name: 'badminton', keywords: ['badminton', '羽毛球'] },
            { icon: '🥅', name: 'goal net', keywords: ['goal', 'sport', '球门'] },
            { icon: '🏒', name: 'ice hockey', keywords: ['hockey', 'sport', '冰球'] },
            { icon: '🏑', name: 'field hockey', keywords: ['hockey', 'sport', '曲棍球'] },
            { icon: '🏏', name: 'cricket game', keywords: ['cricket', 'sport', '板球'] },
            { icon: '⛳️', name: 'flag in hole', keywords: ['golf', 'sport', '高尔夫'] },
            { icon: '🏹', name: 'bow and arrow', keywords: ['archery', 'sport', '射箭'] },
            { icon: '🎣', name: 'fishing pole', keywords: ['fishing', 'sport', '钓鱼'] },
            { icon: '🥊', name: 'boxing glove', keywords: ['box', 'fight', '拳击'] },
            { icon: '🥋', name: 'martial arts uniform', keywords: ['karate', 'martial', '武术', '空手道'] },
            { icon: '🛹', name: 'skateboard', keywords: ['skateboard', 'sport', '滑板'] },
            { icon: '🚴‍♀️', name: 'woman biking', keywords: ['bike', 'cycling', '骑行', '自行车'] },
            { icon: '🚴‍♂️', name: 'man biking', keywords: ['bike', 'cycling', '骑行', '自行车'] },
            { icon: '🏋️', name: 'person lifting weights', keywords: ['gym', 'workout', '健身', '举铁'] },
            { icon: '🤸', name: 'person cartwheeling', keywords: ['gymnastics', 'cartwheel', '体操'] },
            { icon: '⛷️', name: 'skier', keywords: ['ski', 'winter', '滑雪'] },
            { icon: '🏂', name: 'snowboarder', keywords: ['snowboard', 'winter', '单板滑雪'] },
            { icon: '🏆', name: 'trophy', keywords: ['trophy', 'award', '冠军', '奖杯'] },
            { icon: '🥇', name: '1st place medal', keywords: ['gold', 'medal', '金牌'] },
            { icon: '🥈', name: '2nd place medal', keywords: ['silver', 'medal', '银牌'] },
            { icon: '🥉', name: '3rd place medal', keywords: ['bronze', 'medal', '铜牌'] },
            { icon: '🎖️', name: 'military medal', keywords: ['medal', 'award', '勋章'] },
            { icon: '🎯', name: 'direct hit', keywords: ['target', 'dart', '命中', '靶心'] },
            { icon: '🎮', name: 'video game', keywords: ['game', 'gaming', '游戏'] },
            { icon: '🕹️', name: 'joystick', keywords: ['game', 'arcade', '摇杆'] },
            { icon: '🎲', name: 'game die', keywords: ['dice', 'board game', '骰子'] },
            { icon: '🧩', name: 'puzzle piece', keywords: ['puzzle', 'game', '拼图'] },
            { icon: '♟️', name: 'chess pawn', keywords: ['chess', 'game', '象棋', '国际象棋'] },
            { icon: '🎭', name: 'performing arts', keywords: ['theater', 'drama', '戏剧', '表演'] },
            { icon: '🎬', name: 'clapper board', keywords: ['movie', 'film', '电影'] },
            { icon: '🎤', name: 'microphone', keywords: ['sing', 'karaoke', '唱歌', '麦克风'] },
            { icon: '🎧', name: 'headphone', keywords: ['music', 'listen', '耳机', '音乐'] },
            { icon: '🎼', name: 'musical score', keywords: ['music', 'score', '乐谱'] },
            { icon: '🎵', name: 'musical note', keywords: ['music', 'song', '音乐'] },
            { icon: '🎸', name: 'guitar', keywords: ['guitar', 'music', '吉他'] },
            { icon: '🎹', name: 'musical keyboard', keywords: ['piano', 'music', '钢琴'] },
            { icon: '🥁', name: 'drum', keywords: ['drum', 'music', '鼓'] },
            { icon: '🎺', name: 'trumpet', keywords: ['trumpet', 'music', '小号'] },
            { icon: '🎻', name: 'violin', keywords: ['violin', 'music', '小提琴'] },
            { icon: '🎨', name: 'artist palette', keywords: ['art', 'paint', '艺术', '画画'] },
            { icon: '🧵', name: 'thread', keywords: ['thread', 'sew', '线'] },
            { icon: '🪡', name: 'sewing needle', keywords: ['sew', 'needle', '缝纫', '针'] },
            { icon: '🎉', name: 'party popper', keywords: ['party', 'celebrate', '庆祝', '派对'] },
            { icon: '🎊', name: 'confetti ball', keywords: ['confetti', 'celebrate', '撒花', '庆祝'] },
            { icon: '🎁', name: 'wrapped gift', keywords: ['gift', 'present', '礼物'] }
        ]
    },
    {
        key: 'travel',
        label: '出行',
        icon: '✈️',
        children: [
            { icon: '🧳', name: 'luggage', keywords: ['luggage', 'travel', '行李', '旅行箱'] },
            { icon: '🌍', name: 'globe', keywords: ['world', 'earth', '地球', '世界'] },
            { icon: '🗺️', name: 'world map', keywords: ['map', 'travel', '地图'] },
            { icon: '🧭', name: 'compass', keywords: ['compass', 'direction', '指南针'] },
            { icon: '🏕️', name: 'camping', keywords: ['camp', 'outdoor', '露营'] },
            { icon: '⛺️', name: 'tent', keywords: ['camp', 'tent', '帐篷', '露营'] },
            { icon: '🏠', name: 'house', keywords: ['home', 'house', '家', '房子'] },
            { icon: '🏨', name: 'hotel', keywords: ['hotel', 'travel', '酒店'] },
            { icon: '🏞️', name: 'national park', keywords: ['park', 'nature', '公园', '风景'] },
            { icon: '🏖️', name: 'beach with umbrella', keywords: ['beach', 'vacation', '海滩', '度假'] },
            { icon: '🏜️', name: 'desert', keywords: ['desert', '沙漠'] },
            { icon: '🏝️', name: 'desert island', keywords: ['island', 'beach', '岛', '海岛'] },
            { icon: '🏔️', name: 'snow-capped mountain', keywords: ['mountain', 'snow', '雪山'] },
            { icon: '⛰️', name: 'mountain', keywords: ['mountain', '山'] },
            { icon: '🌋', name: 'volcano', keywords: ['volcano', '火山'] },
            { icon: '🗽', name: 'statue of liberty', keywords: ['new york', 'usa', '自由女神'] },
            { icon: '🗼', name: 'tokyo tower', keywords: ['tower', 'travel', '铁塔'] },
            { icon: '🗿', name: 'moai', keywords: ['moai', 'stone', '石像'] },
            { icon: '🕌', name: 'mosque', keywords: ['mosque', 'building', '清真寺'] },
            { icon: '🕍', name: 'synagogue', keywords: ['synagogue', 'building', '犹太教堂'] },
            { icon: '⛩️', name: 'shinto shrine', keywords: ['shrine', 'japan', '神社'] },
            { icon: '🛕', name: 'hindu temple', keywords: ['temple', 'india', '寺庙'] },
            { icon: '🕋', name: 'kaaba', keywords: ['kaaba', 'mecca', '克尔白'] },
            { icon: '🛤️', name: 'railway track', keywords: ['railway', 'train', '铁轨'] },
            { icon: '🛣️', name: 'motorway', keywords: ['road', 'highway', '公路'] },
            { icon: '🚦', name: 'traffic light', keywords: ['traffic', 'light', '红绿灯'] },
            { icon: '🚧', name: 'construction', keywords: ['construction', 'road', '施工'] },
            { icon: '✈️', name: 'airplane', keywords: ['plane', 'travel', '飞机'] },
            { icon: '🛫', name: 'airplane departure', keywords: ['plane', 'takeoff', '起飞'] },
            { icon: '🛬', name: 'airplane arrival', keywords: ['plane', 'landing', '降落'] },
            { icon: '🛩️', name: 'small airplane', keywords: ['plane', 'aircraft', '小飞机'] },
            { icon: '🚀', name: 'rocket', keywords: ['rocket', 'space', '火箭'] },
            { icon: '🛰️', name: 'satellite', keywords: ['satellite', 'space', '卫星'] },
            { icon: '🚁', name: 'helicopter', keywords: ['helicopter', '直升机'] },
            { icon: '🚂', name: 'locomotive', keywords: ['train', '火车'] },
            { icon: '🚆', name: 'train', keywords: ['train', 'rail', '火车'] },
            { icon: '🚄', name: 'high-speed train', keywords: ['bullet train', '高铁'] },
            { icon: '🚇', name: 'metro', keywords: ['metro', 'subway', '地铁'] },
            { icon: '🚌', name: 'bus', keywords: ['bus', '公交', '巴士'] },
            { icon: '🚎', name: 'trolleybus', keywords: ['bus', 'trolley', '无轨电车'] },
            { icon: '🚗', name: 'car', keywords: ['car', 'drive', '汽车'] },
            { icon: '🚕', name: 'taxi', keywords: ['taxi', 'cab', '出租车'] },
            { icon: '🚙', name: 'sport utility vehicle', keywords: ['suv', 'car', '越野车'] },
            { icon: '🛻', name: 'pickup truck', keywords: ['truck', 'pickup', '皮卡'] },
            { icon: '🚚', name: 'delivery truck', keywords: ['truck', 'delivery', '货车'] },
            { icon: '🚛', name: 'articulated lorry', keywords: ['truck', 'lorry', '卡车'] },
            { icon: '🏍️', name: 'motorcycle', keywords: ['motorcycle', 'bike', '摩托'] },
            { icon: '🛵', name: 'motor scooter', keywords: ['scooter', '电动车', '小摩托'] },
            { icon: '🚲', name: 'bicycle', keywords: ['bicycle', 'bike', '自行车'] },
            { icon: '🛴', name: 'kick scooter', keywords: ['scooter', '滑板车'] },
            { icon: '🚢', name: 'ship', keywords: ['ship', 'boat', '船'] },
            { icon: '⛴️', name: 'ferry', keywords: ['ferry', 'boat', '轮渡'] },
            { icon: '🛥️', name: 'motor boat', keywords: ['boat', 'speedboat', '快艇'] },
            { icon: '🚤', name: 'speedboat', keywords: ['boat', 'speedboat', '快艇'] },
            { icon: '⚓️', name: 'anchor', keywords: ['anchor', 'ship', '锚'] },
            { icon: '⛽️', name: 'fuel pump', keywords: ['fuel', 'gas', '加油站'] },
            { icon: '🚏', name: 'bus stop', keywords: ['bus stop', 'station', '公交站'] },
            { icon: '🛑', name: 'stop sign', keywords: ['stop', 'sign', '停止'] }
        ]
    },
    {
        key: 'objects',
        label: '物品',
        icon: '💡',
        children: [
            { icon: '💡', name: 'light bulb', keywords: ['idea', 'light', '灵感', '想法'] },
            { icon: '🔦', name: 'flashlight', keywords: ['flashlight', 'light', '手电筒'] },
            { icon: '🕯️', name: 'candle', keywords: ['candle', 'light', '蜡烛'] },
            { icon: '🧯', name: 'fire extinguisher', keywords: ['fire', 'safety', '灭火器'] },
            { icon: '🧰', name: 'toolbox', keywords: ['tools', 'work', '工具箱'] },
            { icon: '🪛', name: 'screwdriver', keywords: ['tool', 'screw', '螺丝刀'] },
            { icon: '🔧', name: 'wrench', keywords: ['tool', 'fix', '扳手', '修理'] },
            { icon: '🔨', name: 'hammer', keywords: ['hammer', 'tool', '锤子'] },
            { icon: '🪚', name: 'carpentry saw', keywords: ['saw', 'tool', '锯子'] },
            { icon: '🧲', name: 'magnet', keywords: ['magnet', '吸铁石'] },
            { icon: '🧱', name: 'brick', keywords: ['brick', 'build', '砖头'] },
            { icon: '🪜', name: 'ladder', keywords: ['ladder', 'tool', '梯子'] },
            { icon: '📌', name: 'pushpin', keywords: ['pin', 'mark', '图钉'] },
            { icon: '📍', name: 'round pushpin', keywords: ['pin', 'location', '图钉', '位置'] },
            { icon: '📎', name: 'paperclip', keywords: ['clip', 'attach', '回形针'] },
            { icon: '🖇️', name: 'linked paperclips', keywords: ['clip', 'attach', '回形针'] },
            { icon: '📏', name: 'straight ruler', keywords: ['ruler', 'measure', '尺子'] },
            { icon: '📐', name: 'triangular ruler', keywords: ['ruler', 'triangle', '三角尺'] },
            { icon: '✂️', name: 'scissors', keywords: ['scissors', 'cut', '剪刀'] },
            { icon: '🗑️', name: 'wastebasket', keywords: ['trash', 'delete', '垃圾桶'] },
            { icon: '🧺', name: 'basket', keywords: ['basket', 'laundry', '篮子'] },
            { icon: '🧻', name: 'roll of paper', keywords: ['paper', 'toilet', '纸'] },
            { icon: '🪣', name: 'bucket', keywords: ['bucket', 'pail', '桶'] },
            { icon: '🧼', name: 'soap', keywords: ['soap', 'clean', '肥皂'] },
            { icon: '🪥', name: 'toothbrush', keywords: ['toothbrush', 'clean', '牙刷'] },
            { icon: '🪒', name: 'razor', keywords: ['razor', 'shave', '剃刀'] },
            { icon: '🧽', name: 'sponge', keywords: ['sponge', 'clean', '海绵'] },
            { icon: '🧴', name: 'lotion bottle', keywords: ['lotion', 'bottle', '乳液'] },
            { icon: '🔑', name: 'key', keywords: ['key', 'lock', '钥匙'] },
            { icon: '🗝️', name: 'old key', keywords: ['key', 'old', '钥匙'] },
            { icon: '🔒', name: 'locked', keywords: ['lock', 'secure', '锁'] },
            { icon: '🔓', name: 'unlocked', keywords: ['unlock', 'open', '解锁'] },
            { icon: '🔏', name: 'locked with pen', keywords: ['lock', 'privacy', '加密'] },
            { icon: '🔐', name: 'locked with key', keywords: ['lock', 'secure', '安全'] },
            { icon: '💰', name: 'money bag', keywords: ['money', 'cash', '钱', '金钱'] },
            { icon: '💸', name: 'money with wings', keywords: ['money', 'spend', '花钱', '飞走'] },
            { icon: '💳', name: 'credit card', keywords: ['card', 'pay', '信用卡', '付款'] },
            { icon: '🧾', name: 'receipt', keywords: ['receipt', 'bill', '小票', '发票'] },
            { icon: '📦', name: 'package', keywords: ['box', 'package', '快递', '包裹'] },
            { icon: '📫', name: 'closed mailbox with raised flag', keywords: ['mail', 'post', '邮箱'] },
            { icon: '📬', name: 'open mailbox with raised flag', keywords: ['mail', 'post', '邮箱'] },
            { icon: '✉️', name: 'envelope', keywords: ['mail', 'letter', '信', '邮件'] },
            { icon: '📧', name: 'e-mail', keywords: ['email', 'mail', '邮件'] },
            { icon: '📝', name: 'memo', keywords: ['note', 'write', '笔记', '记录'] },
            { icon: '📄', name: 'page facing up', keywords: ['document', 'file', '文档'] },
            { icon: '📃', name: 'page with curl', keywords: ['document', 'paper', '纸'] },
            { icon: '📑', name: 'bookmark tabs', keywords: ['tabs', 'bookmark', '标签页'] },
            { icon: '📚', name: 'books', keywords: ['books', 'read', '书', '学习'] },
            { icon: '📖', name: 'open book', keywords: ['book', 'read', '书', '阅读'] },
            { icon: '🔖', name: 'bookmark', keywords: ['bookmark', 'tag', '书签'] },
            { icon: '🗞️', name: 'rolled-up newspaper', keywords: ['news', 'paper', '报纸'] },
            { icon: '📷', name: 'camera', keywords: ['camera', 'photo', '相机'] },
            { icon: '📸', name: 'camera with flash', keywords: ['camera', 'photo', '相机', '闪光'] },
            { icon: '📹', name: 'video camera', keywords: ['video', 'camera', '摄像机'] },
            { icon: '🎥', name: 'movie camera', keywords: ['movie', 'film', '电影', '胶片'] },
            { icon: '📼', name: 'videocassette', keywords: ['vhs', 'tape', '录像带'] },
            { icon: '📱', name: 'mobile phone', keywords: ['phone', 'mobile', '手机'] },
            { icon: '📲', name: 'mobile phone with arrow', keywords: ['phone', 'call', '来电'] },
            { icon: '☎️', name: 'telephone', keywords: ['phone', 'call', '电话'] },
            { icon: '📞', name: 'telephone receiver', keywords: ['phone', 'call', '话筒'] },
            { icon: '💻', name: 'laptop', keywords: ['computer', 'laptop', '电脑'] },
            { icon: '🖥️', name: 'desktop computer', keywords: ['computer', 'desktop', '台式机'] },
            { icon: '⌨️', name: 'keyboard', keywords: ['keyboard', 'type', '键盘'] },
            { icon: '🖱️', name: 'computer mouse', keywords: ['mouse', 'computer', '鼠标'] },
            { icon: '🖨️', name: 'printer', keywords: ['printer', 'print', '打印机'] },
            { icon: '🧮', name: 'abacus', keywords: ['abacus', 'math', '算盘'] },
            { icon: '📺', name: 'television', keywords: ['tv', 'television', '电视'] },
            { icon: '📻', name: 'radio', keywords: ['radio', 'music', '收音机'] },
            { icon: '🎙️', name: 'studio microphone', keywords: ['mic', 'record', '录音'] },
            { icon: '🧭', name: 'compass', keywords: ['compass', 'navigate', '指南针'] },
            { icon: '⏰', name: 'alarm clock', keywords: ['clock', 'alarm', '闹钟'] },
            { icon: '⌚️', name: 'watch', keywords: ['watch', 'time', '手表'] },
            { icon: '📅', name: 'calendar', keywords: ['calendar', 'date', '日历'] },
            { icon: '📌', name: 'pushpin', keywords: ['pin', 'mark', '图钉'] },
            { icon: '🎁', name: 'wrapped gift', keywords: ['gift', 'present', '礼物'] },
            { icon: '🎈', name: 'balloon', keywords: ['balloon', 'party', '气球'] }
        ]
    },
    {
        key: 'symbols',
        label: '符号',
        icon: '❤️',
        children: [
            { icon: '💯', name: 'hundred points', keywords: ['100', 'perfect', '满分'] },
            { icon: '✅', name: 'check mark button', keywords: ['check', 'ok', '确认', '对'] },
            { icon: '☑️', name: 'check box with check', keywords: ['check', 'checkbox', '勾选'] },
            { icon: '✔️', name: 'check mark', keywords: ['check', 'yes', '勾', '通过'] },
            { icon: '❌', name: 'cross mark', keywords: ['x', 'no', '取消', '错'] },
            { icon: '❎', name: 'cross mark button', keywords: ['x', 'no', '取消'] },
            { icon: '➕', name: 'plus', keywords: ['plus', 'add', '加'] },
            { icon: '➖', name: 'minus', keywords: ['minus', 'subtract', '减'] },
            { icon: '➗', name: 'divide', keywords: ['divide', 'math', '除'] },
            { icon: '✖️', name: 'multiply', keywords: ['multiply', 'math', '乘'] },
            { icon: '♾️', name: 'infinity', keywords: ['infinity', 'forever', '无限'] },
            { icon: '⚠️', name: 'warning', keywords: ['warning', 'alert', '警告'] },
            { icon: '🚫', name: 'prohibited', keywords: ['no', 'ban', '禁止'] },
            { icon: '⛔️', name: 'no entry', keywords: ['stop', 'forbidden', '禁止进入'] },
            { icon: '🛑', name: 'stop sign', keywords: ['stop', 'sign', '停止'] },
            { icon: '🔞', name: 'no one under eighteen', keywords: ['18+', 'adult', '未成年'] },
            { icon: '📛', name: 'name badge', keywords: ['name', 'badge', '名牌'] },
            { icon: '🔔', name: 'bell', keywords: ['bell', 'notify', '铃铛', '提醒'] },
            { icon: '🔕', name: 'bell with slash', keywords: ['mute', 'silent', '静音'] },
            { icon: '❤️', name: 'red heart', keywords: ['heart', 'love', '爱', '红心'] },
            { icon: '💔', name: 'broken heart', keywords: ['heartbreak', 'sad', '心碎'] },
            { icon: '❣️', name: 'heart exclamation', keywords: ['heart', 'love', '爱'] },
            { icon: '💕', name: 'two hearts', keywords: ['love', 'hearts', '两颗心'] },
            { icon: '💞', name: 'revolving hearts', keywords: ['love', 'hearts', '旋转心'] },
            { icon: '💘', name: 'heart with arrow', keywords: ['love', 'cupid', '丘比特'] },
            { icon: '💝', name: 'heart with ribbon', keywords: ['gift', 'heart', '爱心礼物'] },
            { icon: '☮️', name: 'peace symbol', keywords: ['peace', 'symbol', '和平'] },
            { icon: '✝️', name: 'latin cross', keywords: ['cross', 'religion', '十字架'] },
            { icon: '☪️', name: 'star and crescent', keywords: ['islam', 'religion', '伊斯兰'] },
            { icon: '☯️', name: 'yin yang', keywords: ['yinyang', 'tao', '阴阳'] },
            { icon: '🕉️', name: 'om', keywords: ['om', 'religion', '唵'] },
            { icon: '☸️', name: 'wheel of dharma', keywords: ['dharma', 'buddhism', '法轮'] },
            { icon: '⭐️', name: 'star', keywords: ['star', '星星'] },
            { icon: '🌟', name: 'glowing star', keywords: ['star', 'shine', '闪亮'] },
            { icon: '💫', name: 'dizzy', keywords: ['dizzy', 'sparkle', '眩晕'] },
            { icon: '✨', name: 'sparkles', keywords: ['sparkles', 'shine', '闪'] },
            { icon: '🔥', name: 'fire', keywords: ['fire', 'hot', '火'] },
            { icon: '💥', name: 'collision', keywords: ['boom', 'explode', '爆炸', '砰'] },
            { icon: '💤', name: 'zzz', keywords: ['sleep', 'zzz', '睡', '困'] },
            { icon: '💢', name: 'anger symbol', keywords: ['angry', 'mad', '生气', '怒'] },
            { icon: '💦', name: 'sweat droplets', keywords: ['sweat', 'water', '流汗'] },
            { icon: '💧', name: 'droplet', keywords: ['water', 'drop', '水滴'] },
            { icon: '🉐', name: 'japanese ideograph advantage', keywords: ['get', 'advantage', '得'] },
            { icon: '㊙️', name: 'japanese ideograph secret', keywords: ['secret', 'private', '秘'] },
            { icon: '🈲', name: 'japanese “prohibited”', keywords: ['prohibited', '禁止', '禁'] },
            { icon: '🈶', name: 'japanese “not free of charge”', keywords: ['paid', '有料', '有'] },
            { icon: '🈚️', name: 'japanese “free of charge”', keywords: ['free', '无料', '无'] },
            { icon: '🈸', name: 'japanese “application”', keywords: ['apply', '申请', '申'] },
            { icon: '🈺', name: 'japanese “open for business”', keywords: ['open', '营业', '营'] },
            { icon: '🈵', name: 'japanese “no vacancy”', keywords: ['full', '满', '满员'] },
            { icon: '🔺', name: 'red triangle pointed up', keywords: ['triangle', 'up', '上'] },
            { icon: '🔻', name: 'red triangle pointed down', keywords: ['triangle', 'down', '下'] },
            { icon: '🔸', name: 'small orange diamond', keywords: ['diamond', '点'] },
            { icon: '🔹', name: 'small blue diamond', keywords: ['diamond', '点'] },
            { icon: '⚪️', name: 'white circle', keywords: ['circle', 'white', '白圆'] },
            { icon: '⚫️', name: 'black circle', keywords: ['circle', 'black', '黑圆'] },
            { icon: '🔴', name: 'red circle', keywords: ['circle', 'red', '红点'] },
            { icon: '🔵', name: 'blue circle', keywords: ['circle', 'blue', '蓝点'] }
        ]
    },
    {
        key: 'flags',
        label: '旗帜',
        icon: '🏳️',
        children: [
            { icon: '🏁', name: 'chequered flag', keywords: ['flag', 'finish', '终点', '方格旗'] },
            { icon: '🚩', name: 'triangular flag', keywords: ['flag', 'mark', '旗', '标记'] },
            { icon: '🏳️', name: 'white flag', keywords: ['flag', 'surrender', '白旗', '投降'] },
            { icon: '🏴', name: 'black flag', keywords: ['flag', 'pirate', '黑旗'] },
            { icon: '🏴‍☠️', name: 'pirate flag', keywords: ['pirate', 'flag', '海盗旗'] },
            { icon: '🏳️‍🌈', name: 'rainbow flag', keywords: ['rainbow', 'flag', '彩虹旗'] },
            { icon: '🏳️‍⚧️', name: 'transgender flag', keywords: ['transgender', 'flag', '跨性别旗'] },
            { icon: '🇨🇳', name: 'flag: China', keywords: ['china', 'cn', '中国', '国旗'] },
            { icon: '🇭🇰', name: 'flag: Hong Kong', keywords: ['hong kong', 'hk', '香港'] },
            { icon: '🇹🇼', name: 'flag: Taiwan', keywords: ['taiwan', 'tw', '台湾'] },
            { icon: '🇯🇵', name: 'flag: Japan', keywords: ['japan', 'jp', '日本'] },
            { icon: '🇰🇷', name: 'flag: South Korea', keywords: ['korea', 'kr', '韩国'] },
            { icon: '🇺🇸', name: 'flag: United States', keywords: ['usa', 'us', '美国'] },
            { icon: '🇬🇧', name: 'flag: United Kingdom', keywords: ['uk', 'gb', '英国'] },
            { icon: '🇫🇷', name: 'flag: France', keywords: ['france', 'fr', '法国'] },
            { icon: '🇩🇪', name: 'flag: Germany', keywords: ['germany', 'de', '德国'] },
            { icon: '🇨🇦', name: 'flag: Canada', keywords: ['canada', 'ca', '加拿大'] },
            { icon: '🇦🇺', name: 'flag: Australia', keywords: ['australia', 'au', '澳大利亚'] },
            { icon: '🇮🇳', name: 'flag: India', keywords: ['india', 'in', '印度'] },
            { icon: '🇧🇷', name: 'flag: Brazil', keywords: ['brazil', 'br', '巴西'] },
            { icon: '🇷🇺', name: 'flag: Russia', keywords: ['russia', 'ru', '俄罗斯'] },
            { icon: '🇮🇹', name: 'flag: Italy', keywords: ['italy', 'it', '意大利'] },
            { icon: '🇪🇸', name: 'flag: Spain', keywords: ['spain', 'es', '西班牙'] }
        ]
    }
];

const SKIN_MODIFIERS = new Set(['\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}']);
const VS16 = '\uFE0F';
const stripSkinTone = (s: string) =>
    Array.from(s).filter(ch => !SKIN_MODIFIERS.has(ch)).join('');
// 关键：用 Unicode 属性判断是否支持换肤
const supportsSkinTone = (emojiChar: string) =>
    /\p{Emoji_Modifier_Base}/u.test(stripSkinTone(emojiChar));

// 个别 ZWJ 序列保持原图标（不应用肤色）
const SKIN_TONE_EXCEPTIONS = new Set([
    '🕵️‍♂️',
    '👨‍👩‍👧‍👦',
]);

export type EmojiProps = {
    className?: string;
    // defaultValue?: string;
    // value?: any;
    searchPlaceholder?: string,
    children?: React.ReactNode;
    timeout?: number;
    emojs?: any[];
    onChange?: (p: any) => void;
    // [key: string]: unknown
}

export const Emoji: React.FC<EmojiProps> = props => {
    const {
        className,
        emojs = EMOJIS,
        // timeout = 200,
        onChange
    } = props;
    const [open, setOpen] = useState(false);
    const [skin, setSkin] = useState('default');
    const [searchValue, setSearchValue] = useState('');


    const applySkinTone = (emojiChar: string, toneKey: string | null | undefined, skins: { key: string; modifier: string }[]) => {
        if (SKIN_TONE_EXCEPTIONS.has(stripSkinTone(emojiChar))) return emojiChar;
        const base = stripSkinTone(emojiChar);
        if (!toneKey) return base;
        if (!supportsSkinTone(base)) return base;
        const mod = skins.find(x => x.key === toneKey)?.modifier;
        if (!mod) return base;
        const chars = Array.from(base);
        const isBase = (ch: string) => /\p{Emoji_Modifier_Base}/u.test(ch);
        const baseCount = chars.reduce((n, ch) => (isBase(ch) ? n + 1 : n), 0);

        if (baseCount > 1) {
            const out: string[] = [];
            for (let i = 0; i < chars.length; i++) {
                const ch = chars[i]!;
                if (!isBase(ch)) {
                    out.push(ch);
                    continue;
                }
                out.push(ch);
                const next = chars[i + 1];
                if (next === VS16) {
                    out.push(mod, VS16);
                    i += 1;
                } else {
                    out.push(mod);
                }
            }
            return out.join('');
        }

        for (let i = 0; i < chars.length; i++) {
            const ch = chars[i]!;
            if (!isBase(ch)) continue;
            const next = chars[i + 1];
            if (next === VS16) {
                return `${chars.slice(0, i + 1).join('')}${mod}${chars.slice(i + 1).join('')}`;
            }
            return `${chars.slice(0, i + 1).join('')}${mod}${chars.slice(i + 1).join('')}`;
        }
        return base;
    };

    const renderData = useMemo(() => {
        // 1. 深度遍历数据，生成带换肤后的新对象
        return emojs.map(cat => {
            // 如果不是人物或最近，或者是旗帜（旗帜通常不支持肤色换肤），直接返回原样
            // 注意：你提供的旗帜数据 key 是 'flags'，建议在这里排除
            // if (cat.key === 'flags' || !cat.children) {
            //     return cat;
            // }

            return {
                ...cat,
                children: cat.children.map((item: any) => {
                    const v = applySkinTone(item.icon, skin, SKINS);
                    return {
                        ...item,
                        key: item.name,
                        title: item.keywords[item.keywords.length - 1],
                        // 调用你之前写的 applySkinTone，并更新 icon 字段
                        label: v,
                        value: v
                    }
                })
            };
        });
    }, [emojs, skin]); // 当数据或肤色变化时重新计算

    const handleSkinChange = (v: any) => {
        return (e: any) => {
            e.preventDefault();
            setSkin(v.key);
        }
    }

    const cls = [`${CLASSNAME}-emoji`];
    if (className) {
        cls.push(className);
    }
    return (
        <div className={cls.join(' ')}>
            <div className={`${CLASSNAME}-emoji-header`}>
                <div className={`${CLASSNAME}-emoji-search`}>
                    <SearchInput 
                        placeholder={'搜索...'}
                        onSearch={v => setSearchValue(v)}
                    />
                </div>
                <Popuover
                    open={open}
                    onChange={(p) => setOpen(p.open)}
                    pos='tr-br?'
                    items={
                        <div className={`${CLASSNAME}-emoji-skin-items`} onPointerDown={e => e.preventDefault()}>
                            {
                                SKINS.map(item => {
                                    const c = [`${CLASSNAME}-emoji-skin-item`];
                                    if (item.key === skin) {
                                        c.push(`${CLASSNAME}-emoji-skin-item-active`)
                                    }
                                    return <div 
                                        key={item.key} 
                                        className={c.join(' ')} 
                                        onClick={handleSkinChange(item)}
                                    >{item.preview}</div>
                                })
                            }
                        </div>
                    }
                >
                    <div className={`${CLASSNAME}-emoji-skin`}>
                        <Tooltip title="选择皮肤">
                            <div className={`${CLASSNAME}-emoji-skin-btn`}>{SKINS.find(item => item.key === skin)?.preview}</div>
                        </Tooltip>
                    </div>
                </Popuover>
            </div>
            <div className={`${CLASSNAME}-emoji-center`}>
                <CategoryList
                    searchValue={searchValue}
                    data={renderData}
                    showSearch={false}
                    onChange={onChange}
                    onSearch={v => setSearchValue(v) }
                    style={{ height: '300px' }}
                />
            </div>
        </div>
    )
}