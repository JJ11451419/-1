/* =========================================================
 *  坦克大战 - 核心游戏逻辑
 *  闯关模式(12关) + 生存无尽模式
 * ========================================================= */

// ===== 常量配置 =====
const TILE = 24;
const COLS = 26;
const ROWS = 26;
const CANVAS_W = TILE * COLS;
const CANVAS_H = TILE * ROWS;

const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

// 地图元素类型
const MAP = {
    EMPTY: 0,   // 空地
    BRICK: 1,   // 砖墙（可破坏）
    STEEL: 2,   // 钢墙（不可破坏）
    WATER: 3,   // 水域（不能通过，子弹可穿）
    GRASS: 4,   // 草地（可以通过，会隐身）
    BASE: 5,    // 基地（老鹰）
    MINE: 6     // 地雷（中立，踩到爆炸）
};

// 基地区标准防护墙（rows 22-25），X 在 row24 col12
const BASE_BLOCK = [
    "EEEEEEEEEEBBBBBBEEEEEEEEEE",
    "EEEEEEEEEEBBEEBBEEEEEEEEEE",
    "EEEEEEEEEEBBEXBBEEEEEEEEEE",
    "EEEEEEEEEEBBBBBBEEEEEEEEEE"
];

// ===== 12 关卡设计 =====
// B=砖墙 S=钢墙 W=水 G=草 M=地雷 E=空地 X=基地
const LEVELS = [
    // ===== 第1关 新手入门 =====
    {
        name: '新手入门',
        desc: '简单空旷，少量砖墙。消灭4台普通坦克，保护基地。熟悉移动与开炮。',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEBBBBEEEEEBBBBEEEEEEE",
            "EEEEEEBBBBEEEEEBBBBEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEEEEEBBEE",
            "EEBBEEEEEEEEEEEEEEEEEEBBEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 4 }],
        speedMul: 0.7, fireMul: 1.5, bulletCollision: false
    },
    // ===== 第2关 砖墙破防 =====
    {
        name: '砖墙破防',
        desc: '大量砖墙把道路分割。打碎砖墙开辟进攻路线，消灭6台普通坦克。',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "BBBBBBBBBEEBBBBBBBBBBBBBBE",
            "BBBBBBBBBEEBBBBBBBBBBBBBBE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "BBBBBBBBBBBBBBBBEEBBBBBBBB",
            "BBBBBBBBBBBBBBBBEEBBBBBBBB",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEBBEEEEEEBBEEEEEEEE",
            "EEEEEEEEBBEEEEEEBBEEEEEEEE",
            "BBBBBEEBBBBBBBBBBBBBBBBBBB",
            "BBBBBEEBBBBBBBBBBBBBBBBBBB",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 6 }],
        speedMul: 0.85, fireMul: 1.2, bulletCollision: false
    },
    // ===== 第3关 钢铁壁垒 =====
    {
        name: '钢铁壁垒',
        desc: '新增钢墙（不可摧毁），分割出多条通路。钢墙只能绕，学习利用掩体躲炮弹。',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSSSSSSEESSSSSSSSSEEEEEE",
            "ESSSSSSSSEESSSSSSSSSEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSSSEEEEEEEEEEESSSSSEEEE",
            "ESSSSSEEEEEEEEEEESSSSSEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEBBEEEEBBEEEEEEEEEE",
            "EEEEEEEEBBEEEEBBEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSSSSSEEEEEEESSSSSSSEEEE",
            "ESSSSSSSEEEEEEESSSSSSSEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 6 }],
        speedMul: 0.85, fireMul: 1.1, bulletCollision: false
    },
    // ===== 第4关 草丛伏击 =====
    {
        name: '草丛伏击',
        desc: '大面积草丛，敌人可以隐身。炮弹可穿透草丛。提示：看炮口火光判断敌人位置。',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EGGGGGGGGGGGGGGGGGGGGGGGGE",
            "EGGGGGGGGGGGGGGGGGGGGGGGGE",
            "EGGEEEEEEEEEEEEEEEEEEGEGGE",
            "EGGEEBBEEEEEEEEEEBBEEGEGGE",
            "EGGEEBBEEEEEEEEEEBBEEGEGGE",
            "EGGEEEEEEEEEEEEEEEEEEGEGGE",
            "EGGGGGGGGGGGGGGGGGGGGGGGGE",
            "EGGGGGGGGGGGGGGGGGGGGGGGGE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EGGGGEEEEEEEEEEEEEEGGGGEEE",
            "EGGGGEEEEBBBBBBBBEEGGGGEEE",
            "EGGGGEEEEBBBBBBBBEEGGGGEEE",
            "EGGGGEEEEEEEEEEEEEEGGGGEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EGGGGGGGGEEEEEEEEGGGGGGGGG",
            "EGGGGGGGGEEEEEEEEGGGGGGGGG",
            "EGGGGGGGGEEEEEEEEGGGGGGGGG",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 7 }],
        speedMul: 0.9, fireMul: 1.1, bulletCollision: false
    },
    // ===== 第5关 炮弹交锋 =====
    {
        name: '炮弹交锋',
        desc: '钢墙+砖墙混合，射速提升。炮弹相撞互相抵消——可主动开炮拦截敌方子弹！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEBBEEEEEEEEBBEEBBEEEE",
            "EEBBEEBBEEEEEEEEBBEEBBEEEE",
            "EESSSSSSEEEEEEEESSSSSSEEEE",
            "EESSSSSSEEEEEEEESSSSSSEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBEEBBEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EESSSSSSEEEEEEESSSSSSEEEEE",
            "EESSSSSSEEEEEEESSSSSSEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEBBEEEEEEEEBBEEEEEEEE",
            "EEEEEEBBEEEEEEEEBBEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 8 }],
        speedMul: 0.95, fireMul: 0.75, bulletCollision: true
    },
    // ===== 第6关 工程修复兵 =====
    {
        name: '工程修复兵',
        desc: '基地前方大片砖墙阵地。工程坦克不攻击玩家，专门修复被打碎的砖墙——必须优先击杀！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEBBBBEEEEBBBBEEEEE",
            "EEBBEEEEEBBBBEEEEBBBBEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBBBBBBEEEEEBBBBBBBEEEEE",
            "EEBBBBBBBEEEEEBBBBBBBEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEBBBBEEEEBBBEEEEEE",
            "EEBBEEEEEBBBBEEEEBBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE",
            "EEEEEEEEEBBBBBBEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 7 }, { type: 'engineer', count: 2 }],
        speedMul: 0.9, fireMul: 1.0, bulletCollision: true
    },
    // ===== 第7关 地雷陷阱 =====
    {
        name: '地雷陷阱',
        desc: '路口散落中立地雷，踩上去爆炸。击杀敌人掉落地雷道具，可拾取埋雷伏击敌人。注意迂回偷袭坦克！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEMEEEEEEEEEMEEEEEEEE",
            "EEBBEEEEMEEEEEEEEMEEEBBEEE",
            "EEBBEEEEEEEEEEEEEEEEBBEEE",
            "EEEEEEEEEMEEEEEMEEEEEEEEEE",
            "EEEEEEBBEEEEEEEEEBBEEEEEEE",
            "EEEEEEBBEEEMMMMEEEBBEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EMEEEEEEEEEBBBBEEEEEEEEEME",
            "EEEEEEEEEEEBBBBEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEMMMMMMMMEEEEBBEEE",
            "EEBBEEEEEEEEEEEEEEEEBBEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEMEEEEEEEEEMEEEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEBBEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEMEEEMEEEMEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE"
        ],
        composition: [{ type: 'basic', count: 6 }, { type: 'assassin', count: 2 }],
        speedMul: 0.95, fireMul: 1.0, bulletCollision: true, mineDrops: true
    },
    // ===== 第8关 河道阻隔 =====
    {
        name: '河道阻隔',
        desc: '大片河水，坦克无法通过，子弹可以穿过。利用地形隔河对射，小心敌人绕河道缺口偷袭基地！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEWWWWEEEEEBBEEEEE",
            "EEBBEEEEEEWWWWEEEEEBBEEEEE",
            "EEEEEEEEEEWWWWEEEEEEEEEEE",
            "EEEEEEEEEEWWWWEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEWWWWWEEEEEEWWWWWEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 9 }],
        speedMul: 1.0, fireMul: 0.9, bulletCollision: true
    },
    // ===== 第9关 双线压力 =====
    {
        name: '双线压力',
        desc: '基地左右两条进攻通道，偷袭坦克变多，左右两路同时来敌。需要来回兼顾两边，不能死守一个位置。',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEEEEEEESSSSSSSSSSSEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEEEEEEESSSSSSSSSSSEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEBBEEEESSSSSSSSSSBBEEEEEE",
            "EEEEEEEESSSSSSSSSSSEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 7 }, { type: 'assassin', count: 3 }],
        speedMul: 1.05, fireMul: 0.95, bulletCollision: true, mineDrops: true
    },
    // ===== 第10关 危机地震 =====
    {
        name: '危机地震',
        desc: '复杂要塞地形，11台混合敌人。中途触发地震，部分砖墙随机变成钢墙，改变战场格局！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEESSSEEEBBBEEESSSEEEEE",
            "EEBBEESSSEEEBBBEEESSSEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEGGGEEEEBBEEEEBBEEEGGGEEE",
            "EEGGGEEEEBBEEEEBBEEEGGGEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSEEEEGGGGGGGGEEESSSEEEE",
            "ESSSEEEEGGGGGGGGEEESSSEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEBBBBBBBBEEEEBBEEE",
            "EEBBEEEEBBBBBBBBEEEEBBEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSEEEEEGGGGGGEEEEESSSEEE",
            "ESSSEEEEEGGGGGGEEEEESSSEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEBBEEEEEEBBEEBBEEEEEE",
            "EEBBEEBBEEEEEEBBEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 8 }, { type: 'engineer', count: 2 }, { type: 'assassin', count: 1 }],
        speedMul: 1.0, fireMul: 0.95, bulletCollision: true, mineDrops: true,
        earthquake: { trigger: 'spawnCount', value: 5 }
    },
    // ===== 第11关 小BOSS 重甲坦克 =====
    {
        name: '小BOSS·重甲坦克',
        desc: '开阔BOSS竞技场，8台杂兵+1台重甲小BOSS。BOSS血厚炮猛移动慢，炮弹可被抵消——打拉扯，别正面硬扛！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEBBEEEEEEEEEEEEBBEEEEEE",
            "EEEEBBEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEESSSEEEESSSEEEEEEEEE",
            "EEEEEEESSSEEEESSSEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEESSSEEEESSSEEEEEEEEE",
            "EEEEEEESSSEEEESSSEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEBBEEEEEEEEEEEEBBEEEEEE",
            "EEEEBBEEEEEEEEEEEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE"
        ],
        composition: [{ type: 'basic', count: 8 }, { type: 'boss', count: 1 }],
        speedMul: 1.0, fireMul: 0.9, bulletCollision: true
    },
    // ===== 第12关 最终决战 =====
    {
        name: '最终决战',
        desc: '基地周围混合全部地形：砖墙、钢墙、草丛、地雷。12台杂兵+多工程坦克+最终BOSS。地震触发2次，多路进攻，兼顾杀敌、处理工程车、保护基地！',
        play: [
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEESSSEEGGGEEESSSEEEEEE",
            "EEBBEESSSEEGGGEEESSSEEEEEE",
            "EEEEEEEEEMMMMMMMMEEEEEEEEE",
            "EEGGGEEEEBBEEEEBBEEEGGGEEE",
            "EEGGGEEEEBBEEEEBBEEEGGGEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSEEEEGGGGGGGGEEESSSEEEE",
            "ESSSEEEEGGGGGGGGEEESSSEEEE",
            "EEEEEEEEEMMMMMMMMEEEEEEEEE",
            "EEBBEEEEBBBBBBBBEEEEBBEEE",
            "EEBBEEEEBBBBBBBBEEEEBBEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "ESSSEEEEEGGGGGGEEEEESSSEEE",
            "ESSSEEEEEGGGGGGEEEEESSSEEE",
            "EEEEEEEEEMMMMMMMMEEEEEEEEE",
            "EEBBEEBBEEEEEEBBEEBBEEEEEE",
            "EEBBEEBBEEEEEEBBEEBBEEEEEE",
            "EEEEEEEEEEEEEEEEEEEEEEEEEE",
            "EEBBEEEESSSEEEESSSEEBBEEEE",
            "EEBBEEEESSSEEEESSSEEBBEEEE"
        ],
        composition: [{ type: 'basic', count: 8 }, { type: 'engineer', count: 3 }, { type: 'boss', count: 1 }],
        speedMul: 1.05, fireMul: 0.9, bulletCollision: true, mineDrops: true,
        earthquake: { trigger: 'spawnCount', value: 4, repeat: true }
    }
];

// 生存模式地图（无基地，纯地形）
const SURVIVAL_MAP = [
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEBBEESSSEEEEEE ESSSEEEEEE",
    "EEBBEESSSEEEEEE ESSSEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEGGGEEEEBBEEEEBBEEEGGGEEE",
    "EEGGGEEEEBBEEEEBBEEEGGGEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "ESSSEEEEGGGGGGGGEEESSSEEEE",
    "ESSSEEEEGGGGGGGGEEESSSEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEBBEEEEBBBBBBBBEEEEBBEEE",
    "EEBBEEEEBBBBBBBBEEEEBBEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "ESSSEEEEEGGGGGGEEEEESSSEEE",
    "ESSSEEEEEGGGGGGEEEEESSSEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEBBEEBBEEEEEEBBEEBBEEEEEE",
    "EEBBEEBBEEEEEEBBEEBBEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEBBEEEEEEEEEEEEEEBBEEEEEE",
    "EEBBEEEEEEEEEEEEEEBBEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE",
    "EEEEEEEEEEEEEEEEEEEEEEEEEE"
];

// ===== 获取DOM元素 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const mainMenu = document.getElementById('mainMenu');
const levelSelect = document.getElementById('levelSelect');
const levelGrid = document.getElementById('levelGrid');
const levelIntro = document.getElementById('levelIntro');
const howToScreen = document.getElementById('howToScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const victoryScreen = document.getElementById('victoryScreen');

const campaignBtn = document.getElementById('campaignBtn');
const survivalBtn = document.getElementById('survivalBtn');
const howToBtn = document.getElementById('howToBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const introBackBtn = document.getElementById('introBackBtn');
const introStartBtn = document.getElementById('introStartBtn');
const howToBackBtn = document.getElementById('howToBackBtn');
const restartBtn = document.getElementById('restartBtn');
const overMenuBtn = document.getElementById('overMenuBtn');
const pauseMenuBtn = document.getElementById('pauseMenuBtn');
const victoryMenuBtn = document.getElementById('victoryMenuBtn');
const victorySurvivalBtn = document.getElementById('victorySurvivalBtn');
const unlockAllBtn = document.getElementById('unlockAllBtn');

const introTitle = document.getElementById('introTitle');
const introName = document.getElementById('introName');
const introDesc = document.getElementById('introDesc');

const levelEl = document.getElementById('level');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const enemiesEl = document.getElementById('enemies');
const minesEl = document.getElementById('mines');
const mineItem = document.getElementById('mineItem');
const finalScoreEl = document.getElementById('finalScore');
const victoryScoreEl = document.getElementById('victoryScore');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMsg = document.getElementById('gameOverMsg');
const survivalHighDisplay = document.getElementById('survivalHighDisplay');
const mineBtn = document.getElementById('mineBtn');

// ===== 存档 =====
const LS_UNLOCKED = 'tanke_unlocked_level';
const LS_SURVIVAL_UNLOCKED = 'tanke_survival_unlocked';
const LS_SURVIVAL_HIGH = 'tanke_survival_high';
function loadUnlockedLevel() {
    try { return parseInt(localStorage.getItem(LS_UNLOCKED)) || 1; } catch (e) { return 1; }
}
function saveUnlockedLevel(v) {
    try { localStorage.setItem(LS_UNLOCKED, v); } catch (e) {}
}
function isSurvivalUnlocked() {
    try { return localStorage.getItem(LS_SURVIVAL_UNLOCKED) === '1'; } catch (e) { return false; }
}
function setSurvivalUnlocked() {
    try { localStorage.setItem(LS_SURVIVAL_UNLOCKED, '1'); } catch (e) {}
}
function loadSurvivalHigh() {
    try { return parseInt(localStorage.getItem(LS_SURVIVAL_HIGH)) || 0; } catch (e) { return 0; }
}
function saveSurvivalHigh(v) {
    try { localStorage.setItem(LS_SURVIVAL_HIGH, v); } catch (e) {}
}
let unlockedLevel = loadUnlockedLevel();
let survivalHighScore = loadSurvivalHigh();

// ===== 游戏状态 =====
let appState = 'menu';   // menu | levelSelect | howTo | levelIntro | playing | paused | gameover | victory
let gameMode = 'campaign'; // campaign | survival
let level = 1;
let selectedLevel = 1;
let score = 0;
let lives = 3;
let mapData = [];
let originalMapData = [];   // 原始地图（工程兵修复用）
for (let i = 0; i < ROWS; i++) {
    mapData.push(new Array(COLS).fill(MAP.EMPTY));
    originalMapData.push(new Array(COLS).fill(MAP.EMPTY));
}
let player = null;
let enemies = [];
let bullets = [];
let explosions = [];
let muzzleFlashes = [];
let scorePopups = [];
let items = [];           // 地雷道具等
let shakeFrames = 0;
let shakePower = 0;
let totalEnemiesThisLevel = 0;
let spawnedEnemies = 0;
let spawnTimer = 0;
let spawnQueue = [];      // 待生成的敌人类型队列
let levelConfig = null;
let earthquakeTriggered = false;
let earthquakeCount = 0;
let alertText = '';
let alertFrames = 0;
const keys = {};

// 生存模式
let survivalWave = 0;
let survivalWaveEnemiesLeft = 0;
let survivalSpawnedThisWave = 0;
let survivalItemTimer = 0;
let survivalQuakeTimer = 0;

// ===== 背景缓存 =====
let bgCache = null;
function buildWavepeakBackground() {
    const W = CANVAS_W, H = CANVAS_H;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(30, 60, 120, 0.22)';
    c.lineWidth = 1;
    const step = TILE;
    for (let x = 0; x <= W; x += step) {
        c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke();
    }
    for (let y = 0; y <= H; y += step) {
        c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke();
    }
    c.fillStyle = 'rgba(80, 160, 255, 0.35)';
    const dots = [[step*1, step*1], [step*25, step*1], [step*1, step*25], [step*25, step*25], [step*13, step*13]];
    for (const [dx, dy] of dots) { c.beginPath(); c.arc(dx, dy, 2, 0, Math.PI*2); c.fill(); }

    const logoCx = W / 2 - 10;
    const logoCy = H * 0.26;
    const logoScale = 0.95;
    const tipX = logoCx - 180 * logoScale;
    const tipY = logoCy;
    const baseCx = logoCx - 10 * logoScale;
    const baseCy = logoCy;
    const baseR = 80 * logoScale;
    const rings = 4;
    for (let i = rings; i >= 1; i--) {
        const t = i / rings;
        const cx = tipX + (baseCx - tipX) * t;
        const cy = tipY;
        const r  = baseR * t;
        let col;
        if (t < 0.25) col = '#1464e0';
        else if (t < 0.55) col = '#25a6ff';
        else if (t < 0.8) col = '#4adbbf';
        else col = '#e8ff6a';
        const rInner = Math.max(0, r - 14 * logoScale);
        c.fillStyle = col;
        c.globalAlpha = 0.92;
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.arc(cx, cy, rInner, 0, Math.PI * 2, true);
        c.fill('evenodd');
    }
    c.globalAlpha = 1;
    const coneGrad = c.createLinearGradient(tipX, 0, baseCx + baseR, 0);
    coneGrad.addColorStop(0.0, 'rgba(20, 100, 224, 0.95)');
    coneGrad.addColorStop(0.4, 'rgba(37, 166, 255, 0.95)');
    coneGrad.addColorStop(0.75, 'rgba(74, 219, 191, 0.95)');
    coneGrad.addColorStop(1.0, 'rgba(232, 255, 106, 0.95)');
    c.save();
    c.beginPath();
    c.moveTo(tipX - 1, tipY);
    c.lineTo(baseCx, baseCy - baseR);
    c.arc(baseCx, baseCy, baseR, -Math.PI/2, Math.PI/2, false);
    c.lineTo(tipX - 1, tipY);
    c.closePath();
    c.fillStyle = coneGrad;
    c.fill();
    c.restore();
    const ringColors = ['#e8ff6a', '#4adbbf', '#25a6ff', '#1464e0'];
    for (let i = 0; i < ringColors.length; i++) {
        const rr = baseR * (1 - i * 0.26);
        const ww = baseR * 0.18;
        if (rr <= 0) continue;
        c.strokeStyle = ringColors[i];
        c.lineWidth = ww;
        c.globalAlpha = 0.85;
        c.beginPath();
        c.arc(baseCx, baseCy, rr - ww/2, 0, Math.PI * 2);
        c.stroke();
    }
    c.globalAlpha = 1;
    const halo = c.createRadialGradient(baseCx, baseCy, baseR*0.2, baseCx, baseCy, baseR*2.2);
    halo.addColorStop(0, 'rgba(160, 255, 220, 0.22)');
    halo.addColorStop(1, 'rgba(160, 255, 220, 0)');
    c.fillStyle = halo;
    c.beginPath(); c.arc(baseCx, baseCy, baseR*2.2, 0, Math.PI*2); c.fill();

    const textCx = logoCx + 110 * logoScale;
    c.save();
    c.font = 'bold ' + Math.round(78 * logoScale) + 'px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const zhBaseY = logoCy - 8 * logoScale;
    c.fillStyle = '#fff';
    c.shadowColor = 'rgba(120, 200, 255, 0.5)';
    c.shadowBlur = 12;
    c.fillText('浪尖儿', textCx, zhBaseY);
    c.shadowBlur = 0;
    c.restore();
    c.save();
    c.font = 'bold ' + Math.round(38 * logoScale) + 'px "Arial Black", "Helvetica", sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff';
    const enBaseY1 = zhBaseY + 46 * logoScale;
    const enBaseY2 = enBaseY1 + 46 * logoScale;
    c.fillText('WavePeak', textCx, enBaseY1);
    c.fillText('Elite', textCx, enBaseY2);
    c.restore();
    c.save();
    const lineY = enBaseY2 + 22 * logoScale;
    const lineGrad = c.createLinearGradient(textCx - 20, 0, textCx + 400 * logoScale, 0);
    lineGrad.addColorStop(0, 'rgba(74, 219, 191, 0.0)');
    lineGrad.addColorStop(0.5, 'rgba(74, 219, 191, 0.9)');
    lineGrad.addColorStop(1, 'rgba(232, 255, 106, 0.0)');
    c.strokeStyle = lineGrad; c.lineWidth = 2;
    c.beginPath(); c.moveTo(textCx - 20, lineY); c.lineTo(textCx + 400 * logoScale, lineY); c.stroke();
    c.restore();
    c.save();
    c.strokeStyle = 'rgba(80, 180, 255, 0.35)';
    c.lineWidth = 2;
    const cornerLen = 40, pad = 6;
    c.beginPath();
    c.moveTo(pad, pad + cornerLen); c.lineTo(pad, pad); c.lineTo(pad + cornerLen, pad);
    c.moveTo(W - pad - cornerLen, pad); c.lineTo(W - pad, pad); c.lineTo(W - pad, pad + cornerLen);
    c.moveTo(pad, H - pad - cornerLen); c.lineTo(pad, H - pad); c.lineTo(pad + cornerLen, H - pad);
    c.moveTo(W - pad - cornerLen, H - pad); c.lineTo(W - pad, H - pad); c.lineTo(W - pad, H - pad - cornerLen);
    c.stroke();
    c.restore();
    bgCache = cv;
}

// ===== 工具函数 =====
function symbolToTile(sym) {
    switch (sym) {
        case 'B': return MAP.BRICK;
        case 'S': return MAP.STEEL;
        case 'W': return MAP.WATER;
        case 'G': return MAP.GRASS;
        case 'M': return MAP.MINE;
        case 'X': return MAP.BASE;
        default:  return MAP.EMPTY;
    }
}

function loadLevelMap(template) {
    mapData = [];
    originalMapData = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        const line = template[r] || "";
        for (let c = 0; c < COLS; c++) {
            row.push(symbolToTile(line[c] || 'E'));
        }
        mapData.push(row);
        originalMapData.push(row.slice());
    }
}

function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx*dx + dy*dy);
}

function showAlert(text, frames) {
    alertText = text;
    alertFrames = frames || 180;
}

// ===== 坦克类 =====
class Tank {
    constructor(x, y, isPlayer, type, cfg) {
        this.x = x;
        this.y = y;
        this.isPlayer = isPlayer;
        this.type = type || 'basic';
        cfg = cfg || {};
        this.alive = true;
        this.shootCooldown = 0;
        this.treadPhase = 0;
        this.aiMoveTimer = 0;
        this.aiShootTimer = 0;
        this.repairCooldown = 0;
        this.hitFlash = 0;

        const speedMul = cfg.speedMul || 1;
        const fireMul = cfg.fireMul || 1;

        if (isPlayer) {
            this.w = TILE * 2 - 4;
            this.h = TILE * 2 - 4;
            this.speed = 1.2;
            this.dir = DIR.UP;
            this.color = '#f0d000';
            this.shootInterval = 25;
            this.hp = 1; this.maxHp = 1;
            this.bulletDamage = 1;
        } else if (this.type === 'boss') {
            this.w = TILE * 2 - 2;
            this.h = TILE * 2 - 2;
            this.speed = 0.45 * speedMul;
            this.dir = DIR.DOWN;
            this.color = '#a020c0';
            this.shootInterval = Math.round(70 * fireMul);
            this.hp = 5; this.maxHp = 5;
            this.bulletDamage = 2;
        } else if (this.type === 'engineer') {
            this.w = TILE * 2 - 4;
            this.h = TILE * 2 - 4;
            this.speed = 0.6 * speedMul;
            this.dir = DIR.DOWN;
            this.color = '#20a050';
            this.shootInterval = 99999;  // 不射击
            this.hp = 1; this.maxHp = 1;
            this.bulletDamage = 0;
        } else if (this.type === 'assassin') {
            this.w = TILE * 2 - 4;
            this.h = TILE * 2 - 4;
            this.speed = 1.25 * speedMul;
            this.dir = DIR.DOWN;
            this.color = '#ff4090';
            this.shootInterval = Math.round(70 * fireMul);
            this.hp = 1; this.maxHp = 1;
            this.bulletDamage = 1;
        } else {
            // basic
            this.w = TILE * 2 - 4;
            this.h = TILE * 2 - 4;
            this.speed = 0.8 * speedMul;
            this.dir = DIR.DOWN;
            this.color = '#c03030';
            this.shootInterval = Math.round(85 * fireMul);
            this.hp = 1; this.maxHp = 1;
            this.bulletDamage = 1;
        }
    }

    get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    tryMove(dir) {
        this.dir = dir;
        let nx = this.x, ny = this.y;
        switch (dir) {
            case DIR.UP:    ny -= this.speed; break;
            case DIR.DOWN:  ny += this.speed; break;
            case DIR.LEFT:  nx -= this.speed; break;
            case DIR.RIGHT: nx += this.speed; break;
        }
        if (nx < 0) nx = 0;
        if (nx + this.w > CANVAS_W) nx = CANVAS_W - this.w;
        if (ny < 0) ny = 0;
        if (ny + this.h > CANVAS_H) ny = CANVAS_H - this.h;
        const testRect = { x: nx, y: ny, w: this.w, h: this.h };
        if (this.collidesMap(testRect)) return false;
        if (this.collidesTanks(testRect)) return false;
        this.x = nx;
        this.y = ny;
        this.treadPhase = (this.treadPhase + 1) % 20;
        // 移动后检查地雷
        this.checkMineStepped();
        return true;
    }

    checkMineStepped() {
        const c1 = Math.max(0, Math.floor(this.x / TILE));
        const c2 = Math.min(COLS - 1, Math.floor((this.x + this.w - 1) / TILE));
        const r1 = Math.max(0, Math.floor(this.y / TILE));
        const r2 = Math.min(ROWS - 1, Math.floor((this.y + this.h - 1) / TILE));
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                if (mapData[r] && mapData[r][c] === MAP.MINE) {
                    triggerMine(r, c);
                    return;
                }
            }
        }
    }

    canMoveDir(dir, delta) {
        delta = delta || this.speed * 3;
        let nx = this.x, ny = this.y;
        switch (dir) {
            case DIR.UP:    ny -= delta; break;
            case DIR.DOWN:  ny += delta; break;
            case DIR.LEFT:  nx -= delta; break;
            case DIR.RIGHT: nx += delta; break;
        }
        if (nx < 0 || nx + this.w > CANVAS_W || ny < 0 || ny + this.h > CANVAS_H) return false;
        const r = { x: nx, y: ny, w: this.w, h: this.h };
        if (this.collidesMap(r)) return false;
        if (this.collidesTanks(r)) return false;
        return true;
    }

    collidesMap(rect) {
        if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > CANVAS_W || rect.y + rect.h > CANVAS_H) return true;
        const c1 = Math.max(0, Math.floor(rect.x / TILE));
        const c2 = Math.min(COLS - 1, Math.floor((rect.x + rect.w - 1) / TILE));
        const r1 = Math.max(0, Math.floor(rect.y / TILE));
        const r2 = Math.min(ROWS - 1, Math.floor((rect.y + rect.h - 1) / TILE));
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const t = mapData[r][c];
                if (t === MAP.BRICK || t === MAP.STEEL || t === MAP.WATER || t === MAP.BASE) return true;
                // 地雷不阻挡移动（踩到才触发）
            }
        }
        return false;
    }

    collidesTanks(rect) {
        const allTanks = [player, ...enemies].filter(t => t && t !== this && t.alive);
        for (const t of allTanks) {
            if (rectIntersect(rect, t.rect)) return true;
        }
        return false;
    }

    shoot() {
        if (this.shootCooldown > 0) return;
        if (this.type === 'engineer') return; // 工程兵不射击
        this.shootCooldown = this.shootInterval;
        const bw = 6, bh = 8;
        let bx = this.x + this.w / 2 - bw / 2;
        let by = this.y + this.h / 2 - bh / 2;
        switch (this.dir) {
            case DIR.UP:    bx = this.x + this.w / 2 - bw / 2; by = this.y - bh; break;
            case DIR.DOWN:  bx = this.x + this.w / 2 - bw / 2; by = this.y + this.h; break;
            case DIR.LEFT:  bx = this.x - bh; by = this.y + this.h / 2 - bw / 2; break;
            case DIR.RIGHT: bx = this.x + this.w; by = this.y + this.h / 2 - bw / 2; break;
        }
        bullets.push(new Bullet(bx, by, this.dir, this.isPlayer, this.bulletDamage, this.type));
        let fx = this.x + this.w / 2, fy = this.y + this.h / 2;
        switch (this.dir) {
            case DIR.UP:    fx = this.x + this.w / 2; fy = this.y - 2; break;
            case DIR.DOWN:  fx = this.x + this.w / 2; fy = this.y + this.h + 2; break;
            case DIR.LEFT:  fx = this.x - 2; fy = this.y + this.h / 2; break;
            case DIR.RIGHT: fx = this.x + this.w + 2; fy = this.y + this.h / 2; break;
        }
        muzzleFlashes.push({ x: fx, y: fy, dir: this.dir, isPlayer: this.isPlayer, frame: 0, maxFrame: 5 });
    }

    update() {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.repairCooldown > 0) this.repairCooldown--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (!this.isPlayer && this.alive) this.aiUpdate();
    }

    // ===== 通用基础 AI =====
    aiUpdate() {
        if (this.type === 'engineer') return this.aiUpdateEngineer();
        if (this.type === 'assassin') return this.aiUpdateAssassin();
        if (this.type === 'boss') return this.aiUpdateBoss();
        return this.aiUpdateBasic();
    }

    aiUpdateBasic() {
        this.aiMoveTimer--;
        this.aiShootTimer--;
        const forwardOk = this.canMoveDir(this.dir, this.speed * 2);
        if (this.aiMoveTimer <= 0 || !forwardOk || !this.tryMove(this.dir)) {
            const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            const openDirs = [];
            for (const d of allDirs) {
                if (this.canMoveDir(d, this.speed * 4)) openDirs.push(d);
            }
            let chosen = null;
            const rand = Math.random();
            if (openDirs.length > 0) {
                if (rand < 0.5) {
                    const attackDirs = openDirs.filter(d => d === DIR.DOWN || d === DIR.LEFT || d === DIR.RIGHT);
                    if (attackDirs.length > 0) chosen = attackDirs[Math.floor(Math.random() * attackDirs.length)];
                }
                if (!chosen) {
                    const opposite = (this.dir + 2) % 4;
                    const better = openDirs.filter(d => d !== opposite);
                    const pool = better.length > 0 ? better : openDirs;
                    chosen = pool[Math.floor(Math.random() * pool.length)];
                }
            } else {
                chosen = allDirs[Math.floor(Math.random() * 4)];
            }
            this.dir = chosen;
            this.aiMoveTimer = 40 + Math.floor(Math.random() * 90);
        } else {
            this.tryMove(this.dir);
        }
        let shouldShoot = false;
        if (this.aiShootTimer <= 0) shouldShoot = true;
        else if (this.hasTargetAhead() && this.aiShootTimer <= this.shootInterval / 2) shouldShoot = true;
        if (shouldShoot) {
            this.shoot();
            this.aiShootTimer = 40 + Math.floor(Math.random() * 90);
        }
    }

    // ===== 工程兵 AI：找最近破损砖墙去修复 =====
    aiUpdateEngineer() {
        this.aiMoveTimer--;
        // 寻找最近的破损砖墙（原是砖墙现为空地）
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        let target = null;
        let bestDist = Infinity;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (originalMapData[r][c] === MAP.BRICK && mapData[r][c] === MAP.EMPTY) {
                    const d = dist(cx, cy, c * TILE + TILE/2, r * TILE + TILE/2);
                    if (d < bestDist) { bestDist = d; target = { r, c }; }
                }
            }
        }
        // 在目标旁边就修复
        if (target && bestDist < TILE * 1.6 && this.repairCooldown <= 0) {
            mapData[target.r][target.c] = MAP.BRICK;
            spawnExplosion(target.c * TILE + TILE/2, target.r * TILE + TILE/2, 'tiny');
            addScorePopup(target.c * TILE + TILE/2, target.r * TILE, '修复', '#20a050');
            this.repairCooldown = 90;
            return;
        }
        // 朝目标移动；没目标就向基地方向游走
        let goalX, goalY;
        if (target) {
            goalX = target.c * TILE + TILE/2;
            goalY = target.r * TILE + TILE/2;
        } else {
            goalX = CANVAS_W / 2;
            goalY = CANVAS_H - TILE * 3;
        }
        const forwardOk = this.canMoveDir(this.dir, this.speed * 2);
        if (this.aiMoveTimer <= 0 || !forwardOk || !this.tryMove(this.dir)) {
            const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            const openDirs = allDirs.filter(d => this.canMoveDir(d, this.speed * 4));
            let chosen = null;
            if (openDirs.length > 0) {
                // 选最接近目标的方向
                let bestScore = -Infinity;
                for (const d of openDirs) {
                    let tx = cx, ty = cy;
                    if (d === DIR.UP) ty -= 30;
                    if (d === DIR.DOWN) ty += 30;
                    if (d === DIR.LEFT) tx -= 30;
                    if (d === DIR.RIGHT) tx += 30;
                    const score = -(dist(tx, ty, goalX, goalY));
                    if (score > bestScore) { bestScore = score; chosen = d; }
                }
            } else {
                chosen = allDirs[Math.floor(Math.random() * 4)];
            }
            this.dir = chosen;
            this.aiMoveTimer = 30 + Math.floor(Math.random() * 60);
        } else {
            this.tryMove(this.dir);
        }
    }

    // ===== 偷袭坦克 AI：高概率走侧路绕后打基地 =====
    aiUpdateAssassin() {
        this.aiMoveTimer--;
        this.aiShootTimer--;
        const forwardOk = this.canMoveDir(this.dir, this.speed * 2);
        if (this.aiMoveTimer <= 0 || !forwardOk || !this.tryMove(this.dir)) {
            const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            const openDirs = allDirs.filter(d => this.canMoveDir(d, this.speed * 4));
            let chosen = null;
            if (openDirs.length > 0) {
                // 偷袭：优先向下与侧向（绕侧路），较少向上
                const flank = openDirs.filter(d => d === DIR.DOWN || d === DIR.LEFT || d === DIR.RIGHT);
                const pool = flank.length > 0 ? flank : openDirs;
                chosen = pool[Math.floor(Math.random() * pool.length)];
            } else {
                chosen = allDirs[Math.floor(Math.random() * 4)];
            }
            this.dir = chosen;
            this.aiMoveTimer = 30 + Math.floor(Math.random() * 60);
        } else {
            this.tryMove(this.dir);
        }
        let shouldShoot = false;
        if (this.aiShootTimer <= 0) shouldShoot = true;
        else if (this.hasTargetAhead() && this.aiShootTimer <= this.shootInterval / 2) shouldShoot = true;
        if (shouldShoot) {
            this.shoot();
            this.aiShootTimer = 35 + Math.floor(Math.random() * 70);
        }
    }

    // ===== BOSS AI：慢速追击，重炮 =====
    aiUpdateBoss() {
        this.aiMoveTimer--;
        this.aiShootTimer--;
        const forwardOk = this.canMoveDir(this.dir, this.speed * 2);
        if (this.aiMoveTimer <= 0 || !forwardOk || !this.tryMove(this.dir)) {
            const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            const openDirs = allDirs.filter(d => this.canMoveDir(d, this.speed * 4));
            let chosen = null;
            if (openDirs.length > 0) {
                // BOSS 朝玩家或基地方向
                let gx = CANVAS_W / 2, gy = CANVAS_H - TILE * 3;
                if (player && player.alive && Math.random() < 0.6) {
                    gx = player.x; gy = player.y;
                }
                const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
                let bestScore = -Infinity;
                for (const d of openDirs) {
                    let tx = cx, ty = cy;
                    if (d === DIR.UP) ty -= 30;
                    if (d === DIR.DOWN) ty += 30;
                    if (d === DIR.LEFT) tx -= 30;
                    if (d === DIR.RIGHT) tx += 30;
                    const score = -(dist(tx, ty, gx, gy));
                    if (score > bestScore) { bestScore = score; chosen = d; }
                }
            } else {
                chosen = allDirs[Math.floor(Math.random() * 4)];
            }
            this.dir = chosen;
            this.aiMoveTimer = 50 + Math.floor(Math.random() * 70);
        } else {
            this.tryMove(this.dir);
        }
        // BOSS 频繁射击
        if (this.aiShootTimer <= 0 || (this.hasTargetAhead() && this.aiShootTimer <= this.shootInterval / 2)) {
            this.shoot();
            this.aiShootTimer = this.shootInterval;
        }
    }

    hasTargetAhead() {
        const bx = this.x + this.w / 2, by = this.y + this.h / 2;
        const targets = [];
        if (player && player.alive) targets.push({ x: player.x + player.w / 2, y: player.y + player.h / 2 });
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (mapData[r] && mapData[r][c] === MAP.BASE) {
                    targets.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
                }
            }
        }
        for (const tg of targets) {
            const dx = tg.x - bx, dy = tg.y - by;
            if (Math.abs(dx) > 6 * TILE || Math.abs(dy) > 6 * TILE) continue;
            if (this.dir === DIR.UP && dy < 0 && Math.abs(dx) < this.w / 2 + 4) return true;
            if (this.dir === DIR.DOWN && dy > 0 && Math.abs(dx) < this.w / 2 + 4) return true;
            if (this.dir === DIR.LEFT && dx < 0 && Math.abs(dy) < this.h / 2 + 4) return true;
            if (this.dir === DIR.RIGHT && dx > 0 && Math.abs(dy) < this.h / 2 + 4) return true;
        }
        return false;
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        this.hitFlash = 6;
        if (this.hp <= 0) { this.alive = false; return true; }
        return false;
    }

    isOnGrass() {
        const cx = Math.floor((this.x + this.w/2) / TILE);
        const cy = Math.floor((this.y + this.h/2) / TILE);
        if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) return false;
        return mapData[cy][cx] === MAP.GRASS;
    }

    draw(ctx) {
        if (!this.alive) return;
        // 草丛隐身：敌人在草里几乎不可见，玩家在草里半透明
        const onGrass = this.isOnGrass();
        let prevAlpha = 1;
        if (onGrass) {
            prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = this.isPlayer ? 0.45 : 0.12;
        }
        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        const halfW = this.w / 2, halfH = this.h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        const rotAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        ctx.rotate(rotAngles[this.dir]);

        // 受击闪白
        const bodyColor = this.hitFlash > 0 ? '#ffffff' : this.color;

        // 履带
        ctx.fillStyle = '#333';
        ctx.fillRect(-halfW, -halfH, 8, this.h);
        ctx.fillRect(halfW - 8, -halfH, 8, this.h);
        ctx.fillStyle = '#555';
        const phase = Math.floor(this.treadPhase / 5);
        for (let i = 0; i < 5; i++) {
            const y = -halfH + 2 + i * 9 + (phase % 2) * 4;
            ctx.fillRect(-halfW + 1, y, 6, 4);
            ctx.fillRect(halfW - 7, y, 6, 4);
        }
        // 车身
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-halfW + 7, -halfH + 2, this.w - 14, this.h - 4);
        ctx.fillStyle = this.isPlayer ? '#fff680' : '#ff9090';
        ctx.fillRect(-halfW + 8, -halfH + 3, 3, this.h - 6);
        // 炮塔
        ctx.fillStyle = this.isPlayer ? '#c0a000' : (this.type === 'boss' ? '#601080' : '#502020');
        const tSize = this.w * 0.42;
        ctx.beginPath(); ctx.arc(0, 0, tSize / 2, 0, Math.PI * 2); ctx.fill();
        // 炮管
        ctx.fillStyle = '#222';
        ctx.fillRect(-3, -halfH - 2, 6, halfH + 4);
        // BOSS 加炮口环
        if (this.type === 'boss') {
            ctx.fillStyle = '#e040ff';
            ctx.fillRect(-5, -halfH - 4, 10, 4);
        }
        ctx.restore();

        // 工程兵标志（扳手图标）
        if (this.type === 'engineer') {
            ctx.save();
            ctx.globalAlpha = onGrass ? 0.12 : 1;
            ctx.fillStyle = '#ffe060';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔧', cx, cy - this.h/2 - 8);
            ctx.restore();
        }
        // 偷袭坦克标志
        if (this.type === 'assassin') {
            ctx.save();
            ctx.globalAlpha = onGrass ? 0.12 : 1;
            ctx.fillStyle = '#ff80b0';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', cx, cy - this.h/2 - 8);
            ctx.restore();
        }
        // BOSS 血条
        if (this.type === 'boss' && this.hp < this.maxHp) {
            const bw = this.w + 6;
            const bx = cx - bw / 2;
            const by = this.y - 10;
            ctx.fillStyle = '#400020';
            ctx.fillRect(bx, by, bw, 5);
            ctx.fillStyle = '#ff40c0';
            ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), 5);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, 5);
        }

        if (onGrass) ctx.globalAlpha = prevAlpha;
    }
}

// ===== 子弹类 =====
class Bullet {
    constructor(x, y, dir, fromPlayer, damage, ownerType) {
        this.w = 6; this.h = 8;
        if (dir === DIR.LEFT || dir === DIR.RIGHT) { this.w = 8; this.h = 6; }
        // BOSS 子弹更大
        if (ownerType === 'boss') {
            this.w += 4; this.h += 4;
        }
        this.x = x; this.y = y;
        this.dir = dir;
        this.speed = ownerType === 'boss' ? 4 : 5;
        this.fromPlayer = fromPlayer;
        this.damage = damage || 1;
        this.ownerType = ownerType || (fromPlayer ? 'player' : 'basic');
        this.alive = true;
    }
    get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    update() {
        switch (this.dir) {
            case DIR.UP:    this.y -= this.speed; break;
            case DIR.DOWN:  this.y += this.speed; break;
            case DIR.LEFT:  this.x -= this.speed; break;
            case DIR.RIGHT: this.x += this.speed; break;
        }
        if (this.x < 0 || this.x > CANVAS_W || this.y < 0 || this.y > CANVAS_H) this.alive = false;
        this.checkMapCollision();
        this.checkTankCollision();
        this.checkBulletCollision();
    }
    checkMapCollision() {
        const c1 = Math.floor(this.x / TILE);
        const c2 = Math.floor((this.x + this.w - 1) / TILE);
        const r1 = Math.floor(this.y / TILE);
        const r2 = Math.floor((this.y + this.h - 1) / TILE);
        let hit = false;
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
                const t = mapData[r][c];
                if (t === MAP.BRICK) {
                    mapData[r][c] = MAP.EMPTY;
                    hit = true;
                    spawnExplosion(c * TILE + TILE / 2, r * TILE + TILE / 2, 'small');
                } else if (t === MAP.STEEL) {
                    hit = true;
                    spawnExplosion(this.x + this.w / 2, this.y + this.h / 2, 'tiny');
                } else if (t === MAP.BASE) {
                    mapData[r][c] = MAP.EMPTY;
                    hit = true;
                    spawnExplosion(c * TILE + TILE / 2, r * TILE + TILE / 2, 'big');
                    if (gameMode === 'campaign') onBaseDestroyed();
                }
                // 水域、草丛、地雷：子弹穿过（不拦截）
            }
        }
        if (hit) this.alive = false;
    }
    checkTankCollision() {
        if (!this.alive) return;
        if (this.fromPlayer) {
            for (const e of enemies) {
                if (e.alive && rectIntersect(this.rect, e.rect)) {
                    const killed = e.takeDamage(this.damage);
                    this.alive = false;
                    if (killed) {
                        const pts = e.type === 'boss' ? 1000 : (e.type === 'engineer' ? 200 : (e.type === 'assassin' ? 150 : 100));
                        score += pts;
                        spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, 'big');
                        addScorePopup(e.x + e.w / 2, e.y, '+' + pts, '#ffd700');
                        // 掉落地雷道具
                        if (levelConfig && levelConfig.mineDrops && Math.random() < 0.35) {
                            items.push(new Item(e.x + e.w / 2, e.y + e.h / 2, 'mine'));
                        }
                        if (gameMode === 'survival' && Math.random() < 0.3) {
                            items.push(new Item(e.x + e.w / 2, e.y + e.h / 2, 'mine'));
                        }
                    } else {
                        spawnExplosion(this.x, this.y, 'small');
                    }
                    updateUI();
                    return;
                }
            }
        } else {
            if (player && player.alive && rectIntersect(this.rect, player.rect)) {
                player.alive = false;
                this.alive = false;
                lives -= this.damage;
                spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, 'big');
                addScorePopup(player.x + player.w / 2, player.y, '-' + this.damage + ' ❤', '#ff5555');
                updateUI();
                if (lives > 0) {
                    setTimeout(() => { if (appState === 'playing') respawnPlayer(); }, 1000);
                } else {
                    onPlayerDead();
                }
            }
        }
    }
    checkBulletCollision() {
        if (!this.alive) return;
        // 第5关起开启炮弹抵消机制
        const enabled = gameMode === 'survival' || (levelConfig && levelConfig.bulletCollision);
        if (!enabled) return;
        for (const b of bullets) {
            if (b !== this && b.alive && b.fromPlayer !== this.fromPlayer) {
                if (rectIntersect(this.rect, b.rect)) {
                    this.alive = false;
                    b.alive = false;
                    spawnExplosion((this.x + b.x) / 2, (this.y + b.y) / 2, 'tiny');
                    return;
                }
            }
        }
    }
    draw(ctx) {
        if (!this.alive) return;
        const isBoss = this.ownerType === 'boss';
        ctx.fillStyle = this.fromPlayer ? '#ffffff' : (isBoss ? '#ff60ff' : '#ffaaaa');
        ctx.shadowColor = this.fromPlayer ? '#ffff00' : (isBoss ? '#ff00ff' : '#ff0000');
        ctx.shadowBlur = isBoss ? 10 : 6;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.shadowBlur = 0;
    }
}

// ===== 爆炸 =====
class Explosion {
    constructor(x, y, size) {
        this.x = x; this.y = y; this.size = size;
        this.frame = 0;
        this.maxFrame = size === 'big' ? 30 : (size === 'small' ? 20 : 10);
        this.alive = true;
    }
    update() { this.frame++; if (this.frame >= this.maxFrame) this.alive = false; }
    draw(ctx) {
        const t = this.frame / this.maxFrame;
        const baseR = this.size === 'big' ? 30 : (this.size === 'small' ? 16 : 8);
        const r = baseR * (0.5 + t * 0.8);
        const alpha = 1 - t;
        const colors = ['rgba(255,100,0,ALPHA)', 'rgba(255,200,0,ALPHA)', 'rgba(255,255,255,ALPHA)'];
        for (let i = 0; i < 3; i++) {
            const rr = r * (1 - i * 0.25);
            if (rr <= 0) continue;
            ctx.fillStyle = colors[i].replace('ALPHA', alpha.toFixed(2));
            ctx.beginPath(); ctx.arc(this.x, this.y, rr, 0, Math.PI * 2); ctx.fill();
        }
    }
}
function spawnExplosion(x, y, size) {
    explosions.push(new Explosion(x, y, size));
    if (size === 'big') { shakeFrames = 16; shakePower = 5; }
    else if (size === 'small') { shakeFrames = 8; shakePower = 2; }
    else { shakeFrames = 4; shakePower = 1; }
}
function addScorePopup(x, y, text, color) {
    scorePopups.push({ x: x, y: y, text: text || '+100', color: color || '#ffd700', frame: 0, maxFrame: 40 });
}

// ===== 道具类（地雷拾取） =====
class Item {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.alive = true; this.frame = 0;
        this.w = 16; this.h = 16;
    }
    get rect() { return { x: this.x - 8, y: this.y - 8, w: 16, h: 16 }; }
    update() {
        this.frame++;
        if (player && player.alive && rectIntersect(this.rect, player.rect)) {
            if (this.type === 'mine') {
                playerMines++;
                addScorePopup(this.x, this.y, '+1 地雷', '#ff4040');
            }
            this.alive = false;
            updateUI();
        }
    }
    draw(ctx) {
        const bob = Math.sin(this.frame / 8) * 2;
        ctx.save();
        ctx.translate(this.x, this.y + bob);
        // 发光底
        ctx.fillStyle = 'rgba(255,80,80,0.3)';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        // 地雷球
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff4040';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
        // 引信
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(3, -12); ctx.stroke();
        ctx.restore();
    }
}

// ===== 地雷爆炸 =====
function triggerMine(r, c) {
    if (mapData[r][c] !== MAP.MINE) return;
    mapData[r][c] = MAP.EMPTY;
    const cx = c * TILE + TILE / 2;
    const cy = r * TILE + TILE / 2;
    spawnExplosion(cx, cy, 'big');
    const blastR = TILE * 1.6;
    // 伤害玩家
    if (player && player.alive) {
        if (dist(player.x + player.w/2, player.y + player.h/2, cx, cy) < blastR) {
            player.alive = false;
            lives--;
            addScorePopup(player.x + player.w/2, player.y, '-1 ❤', '#ff5555');
            updateUI();
            if (lives > 0) setTimeout(() => { if (appState === 'playing') respawnPlayer(); }, 1000);
            else onPlayerDead();
        }
    }
    // 伤害敌人
    for (const e of enemies) {
        if (e.alive && dist(e.x + e.w/2, e.y + e.h/2, cx, cy) < blastR) {
            const killed = e.takeDamage(99);
            if (killed) {
                const pts = e.type === 'boss' ? 1000 : (e.type === 'engineer' ? 200 : (e.type === 'assassin' ? 150 : 100));
                score += pts;
                spawnExplosion(e.x + e.w/2, e.y + e.h/2, 'big');
                addScorePopup(e.x + e.w/2, e.y, '+' + pts, '#ffd700');
            }
        }
    }
    updateUI();
}

// ===== 地震 =====
function triggerEarthquake() {
    shakeFrames = 60; shakePower = 8;
    showAlert('⚠ 地震！地形改变！', 180);
    let changed = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (mapData[r][c] === MAP.BRICK && Math.random() < 0.2) {
                mapData[r][c] = MAP.STEEL;
                originalMapData[r][c] = MAP.STEEL;
                changed++;
            }
        }
    }
    earthquakeTriggered = true;
    earthquakeCount++;
}

// ===== 玩家埋雷 =====
function placePlayerMine() {
    if (playerMines <= 0 || !player || !player.alive || appState !== 'playing') return;
    const cx = Math.floor((player.x + player.w/2) / TILE);
    const cy = Math.floor((player.y + player.h/2) / TILE);
    if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) return;
    if (mapData[cy][cx] === MAP.EMPTY) {
        mapData[cy][cx] = MAP.MINE;
        playerMines--;
        addScorePopup(player.x + player.w/2, player.y, '已埋雷', '#ff4040');
        updateUI();
    }
}

// ===== 游戏控制 =====
function getLevelMap(idx) {
    const lv = LEVELS[idx - 1];
    // play 区 22 行 + 基地区 4 行
    return lv.play.concat(BASE_BLOCK);
}

function initLevel() {
    const template = gameMode === 'survival' ? SURVIVAL_MAP : getLevelMap(level);
    loadLevelMap(template);
    bullets = []; explosions = []; enemies = []; items = [];
    muzzleFlashes = []; scorePopups = [];
    spawnedEnemies = 0; spawnTimer = 0;
    earthquakeTriggered = false; earthquakeCount = 0;
    playerMines = 0;
    if (gameMode === 'campaign') {
        levelConfig = LEVELS[level - 1];
        totalEnemiesThisLevel = 0;
        spawnQueue = [];
        for (const comp of levelConfig.composition) {
            for (let i = 0; i < comp.count; i++) {
                spawnQueue.push(comp.type);
                totalEnemiesThisLevel++;
            }
        }
        // 打乱顺序但保证 BOSS 在中间偏后出现
        const bossIdx = spawnQueue.indexOf('boss');
        if (bossIdx >= 0) spawnQueue.splice(bossIdx, 1);
        // 洗牌
        for (let i = spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
        }
        // BOSS 插入到 60% 位置
        if (bossIdx >= 0) {
            const insertAt = Math.floor(spawnQueue.length * 0.6);
            spawnQueue.splice(insertAt, 0, 'boss');
        }
    } else {
        levelConfig = { bulletCollision: true, mineDrops: true, speedMul: 1, fireMul: 1 };
        startSurvivalWave(1);
    }
    respawnPlayer();
    updateUI();
}

function respawnPlayer() {
    const px = TILE * 8;
    const py = TILE * (ROWS - 2) - 2;
    player = new Tank(px, py, true);
}

function spawnEnemy(type) {
    if (gameMode === 'campaign' && spawnedEnemies >= totalEnemiesThisLevel) return;
    if (enemies.filter(e => e.alive).length >= 4) return;
    const spawnPoints = [
        { x: 2, y: 0 },
        { x: (COLS / 2 - 1), y: 0 },
        { x: COLS - 4, y: 0 }
    ];
    const sp = spawnPoints[spawnedEnemies % spawnPoints.length];
    const ex = sp.x * TILE + 2;
    const ey = sp.y * TILE + 2;
    const testRect = { x: ex, y: ey, w: TILE * 2 - 4, h: TILE * 2 - 4 };
    const allTanks = [player, ...enemies].filter(t => t && t.alive);
    for (const t of allTanks) {
        if (rectIntersect(testRect, t.rect)) return false;
    }
    const cfg = { speedMul: levelConfig.speedMul, fireMul: levelConfig.fireMul };
    enemies.push(new Tank(ex, ey, false, type, cfg));
    spawnedEnemies++;
    spawnExplosion(ex + TILE, ey + TILE, 'small');
    return true;
}

// ===== 生存模式 =====
function startSurvivalWave(n) {
    survivalWave = n;
    survivalSpawnedThisWave = 0;
    // 每波敌人数量 = 3 + wave
    survivalWaveEnemiesLeft = 3 + n;
    totalEnemiesThisLevel = survivalWaveEnemiesLeft;
    spawnedEnemies = 0;
    spawnQueue = [];
    for (let i = 0; i < survivalWaveEnemiesLeft; i++) {
        let t = 'basic';
        const rnd = Math.random();
        if (n >= 3 && rnd < 0.18) t = 'assassin';
        if (n >= 5 && rnd < 0.1) t = 'engineer';
        if (n >= 6 && i === Math.floor(survivalWaveEnemiesLeft / 2) && n % 5 === 0) t = 'boss';
        spawnQueue.push(t);
    }
    // 难度随波数提升
    levelConfig = {
        bulletCollision: true,
        mineDrops: true,
        speedMul: Math.min(1.5, 0.85 + n * 0.05),
        fireMul: Math.max(0.5, 1.1 - n * 0.04)
    };
    showAlert('第 ' + n + ' 波  敌人 ' + survivalWaveEnemiesLeft + ' 台', 120);
}

function updateSurvival() {
    // 道具随机刷新
    survivalItemTimer++;
    if (survivalItemTimer >= 600) {  // 约10秒
        survivalItemTimer = 0;
        if (Math.random() < 0.6 && items.length < 3) {
            const ix = (2 + Math.floor(Math.random() * (COLS - 4))) * TILE;
            const iy = (2 + Math.floor(Math.random() * (ROWS - 8))) * TILE;
            items.push(new Item(ix, iy, 'mine'));
        }
    }
    // 随机地震
    survivalQuakeTimer++;
    if (survivalQuakeTimer >= 1800 + Math.floor(Math.random() * 1200)) {
        survivalQuakeTimer = 0;
        if (survivalWave >= 3) triggerEarthquake();
    }
    // 波次进度
    if (spawnedEnemies < survivalWaveEnemiesLeft) {
        spawnTimer++;
        if (spawnTimer >= 110) {
            const t = spawnQueue.shift() || 'basic';
            if (spawnEnemy(t)) spawnTimer = 0;
        }
    } else if (enemies.filter(e => e.alive).length === 0) {
        // 本波清空，进入下一波
        score += 500;
        addScorePopup(CANVAS_W/2, CANVAS_H/2 - 40, '波次清空 +500', '#ffd700');
        startSurvivalWave(survivalWave + 1);
    }
}

// ===== UI 更新 =====
function updateUI() {
    levelEl.textContent = gameMode === 'survival' ? ('∞') : level;
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    if (gameMode === 'survival') {
        enemiesEl.textContent = (survivalWaveEnemiesLeft - spawnedEnemies) + enemies.filter(e => e.alive).length;
    } else {
        enemiesEl.textContent = (totalEnemiesThisLevel - spawnedEnemies) + enemies.filter(e => e.alive).length;
    }
    minesEl.textContent = playerMines;
    mineItem.style.display = (levelConfig && (levelConfig.mineDrops || gameMode === 'survival')) ? 'flex' : 'none';
    // 地雷按钮显隐
    if (mineBtn) {
        if (playerMines > 0 && appState === 'playing') mineBtn.classList.add('has-mines');
        else mineBtn.classList.remove('has-mines');
    }
}

// ===== 结束/通关 =====
let winNextLevel = false;  // 通关后是否进入下一关
function onBaseDestroyed() {
    gameOver(false, '基地被毁！');
}
function onPlayerDead() {
    gameOver(false, '生命耗尽！');
}
function gameOver(win, msg) {
    appState = win ? (level >= 12 && gameMode === 'campaign' ? 'victory' : 'gameover') : 'gameover';
    finalScoreEl.textContent = score;
    winNextLevel = false;
    if (win) {
        if (gameMode === 'campaign') {
            // 解锁下一关
            if (level + 1 > unlockedLevel) { unlockedLevel = level + 1; saveUnlockedLevel(unlockedLevel); }
            if (level >= 12) {
                // 全部通关
                setSurvivalUnlocked();
                isSurvivalUnlockedCache = true;
                victoryScoreEl.textContent = score;
                victoryScreen.classList.remove('hidden');
                appState = 'victory';
                return;
            }
            gameOverTitle.textContent = '🎉 关 卡 通 过 ！';
            gameOverMsg.textContent = '第 ' + level + ' 关【' + LEVELS[level-1].name + '】通关！已解锁第 ' + (level + 1) + ' 关。';
            restartBtn.textContent = '下 一 关 →';
            winNextLevel = true;
        }
    } else {
        gameOverTitle.textContent = '💥 游戏结束';
        gameOverMsg.textContent = msg || '再接再厉！';
        restartBtn.textContent = '重 新 开 始';
    }
    if (gameMode === 'survival') {
        if (score > survivalHighScore) {
            survivalHighScore = score;
            saveSurvivalHigh(score);
            survivalHighDisplay.textContent = survivalHighScore;
            gameOverMsg.textContent = '新纪录！' + (msg || '');
        }
        restartBtn.textContent = '再 战 一 局';
    }
    gameOverScreen.classList.remove('hidden');
}
let isSurvivalUnlockedCache = isSurvivalUnlocked();

// ===== 关卡胜利判断 =====
function checkLevelClear() {
    if (gameMode !== 'campaign') return;
    const remaining = (totalEnemiesThisLevel - spawnedEnemies) + enemies.filter(e => e.alive).length;
    if (remaining === 0 && player && player.alive) {
        gameOver(true);
    }
}

// ===== 开始游戏 =====
function startCampaignLevel(n) {
    gameMode = 'campaign';
    level = n;
    score = 0;
    lives = 3;
    hideAllOverlays();
    appState = 'playing';
    initLevel();
}
function startSurvival() {
    gameMode = 'survival';
    level = 0;
    score = 0;
    lives = 3;
    survivalWave = 0;
    survivalItemTimer = 0;
    survivalQuakeTimer = 0;
    hideAllOverlays();
    appState = 'playing';
    initLevel();
}
function restartGame() {
    if (gameMode === 'survival') { startSurvival(); return; }
    if (winNextLevel) { startCampaignLevel(level + 1); winNextLevel = false; }
    else startCampaignLevel(level);
}

// ===== 界面导航 =====
function hideAllOverlays() {
    mainMenu.classList.add('hidden');
    levelSelect.classList.add('hidden');
    levelIntro.classList.add('hidden');
    howToScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
}
function showMainMenu() {
    hideAllOverlays();
    appState = 'menu';
    survivalHighDisplay.textContent = survivalHighScore;
    mainMenu.classList.remove('hidden');
    // 生存按钮锁定状态
    if (isSurvivalUnlocked()) {
        survivalBtn.textContent = '生 存 无 尽 模 式';
        survivalBtn.disabled = false;
        survivalBtn.style.opacity = '1';
    } else {
        survivalBtn.textContent = '生 存 无 尽 (通关解锁)';
        survivalBtn.style.opacity = '0.6';
    }
    // 一键解锁按钮状态
    refreshUnlockBtn();
}
function refreshUnlockBtn() {
    if (!unlockAllBtn) return;
    const allUnlocked = unlockedLevel >= 13 && isSurvivalUnlocked();
    if (allUnlocked) {
        unlockAllBtn.textContent = '✓ 已 全 部 解 锁';
        unlockAllBtn.style.opacity = '0.55';
    } else {
        unlockAllBtn.textContent = '一 键 解 锁 全 部';
        unlockAllBtn.style.opacity = '1';
    }
}
function unlockAll() {
    unlockedLevel = 13;
    saveUnlockedLevel(unlockedLevel);
    setSurvivalUnlocked();
    isSurvivalUnlockedCache = true;
    survivalBtn.textContent = '生 存 无 尽 模 式';
    survivalBtn.style.opacity = '1';
    refreshUnlockBtn();
    alert('已解锁全部 12 关 + 生存无尽模式！');
}
function showLevelSelect() {
    hideAllOverlays();
    appState = 'levelSelect';
    buildLevelGrid();
    levelSelect.classList.remove('hidden');
}
function buildLevelGrid() {
    levelGrid.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const cell = document.createElement('button');
        cell.className = 'level-cell';
        const cleared = i < unlockedLevel;
        const locked = i > unlockedLevel;
        if (locked) cell.classList.add('locked');
        else if (cleared) cell.classList.add('cleared');
        cell.innerHTML = '<span class="lvl-num">' + i + '</span><span class="lvl-name">' + LEVELS[i-1].name + '</span>';
        if (!locked) {
            cell.addEventListener('click', () => { showLevelIntro(i); });
        }
        levelGrid.appendChild(cell);
    }
}
function showLevelIntro(n) {
    hideAllOverlays();
    appState = 'levelIntro';
    selectedLevel = n;
    introTitle.textContent = '第 ' + n + ' 关';
    introName.textContent = LEVELS[n-1].name;
    introDesc.textContent = LEVELS[n-1].desc;
    levelIntro.classList.remove('hidden');
}
function showHowTo() {
    hideAllOverlays();
    appState = 'howTo';
    howToScreen.classList.remove('hidden');
}
function togglePause() {
    if (appState === 'playing') {
        appState = 'paused';
        pauseScreen.classList.remove('hidden');
    } else if (appState === 'paused') {
        appState = 'playing';
        pauseScreen.classList.add('hidden');
    }
}

// ===== 输入处理 =====
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyK') placePlayerMine();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

function handleInput() {
    if (!player || !player.alive) return;
    if (keys['ArrowUp'] || keys['KeyW']) player.tryMove(DIR.UP);
    else if (keys['ArrowDown'] || keys['KeyS']) player.tryMove(DIR.DOWN);
    else if (keys['ArrowLeft'] || keys['KeyA']) player.tryMove(DIR.LEFT);
    else if (keys['ArrowRight'] || keys['KeyD']) player.tryMove(DIR.RIGHT);
    if (keys['Space'] || keys['KeyJ']) player.shoot();
}

// ===== 绘制地图 =====
function drawMap() {
    for (let r = 0; r < ROWS; r++) {
        if (!mapData[r]) continue;
        for (let c = 0; c < COLS; c++) {
            const t = mapData[r][c];
            if (t === undefined) continue;
            const x = c * TILE, y = r * TILE;
            switch (t) {
                case MAP.BRICK: drawBrick(x, y); break;
                case MAP.STEEL: drawSteel(x, y); break;
                case MAP.WATER: drawWater(x, y); break;
                case MAP.MINE:  drawMine(x, y); break;
                case MAP.BASE:  drawBase(x, y); break;
                // 草最后绘制
            }
        }
    }
}
function drawBrick(x, y) {
    ctx.fillStyle = '#8b4513'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#a0522d';
    const bw = TILE / 2, bh = TILE / 4;
    for (let i = 0; i < 4; i++) {
        const offset = (i % 2) * (bw / 2);
        ctx.fillRect(x + offset, y + i * bh, bw - 1, bh - 1);
        ctx.fillRect(x + offset + bw, y + i * bh, bw - 1, bh - 1);
    }
}
function drawSteel(x, y) {
    const grd = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    grd.addColorStop(0, '#b0b0b0'); grd.addColorStop(0.5, '#e8e8e8'); grd.addColorStop(1, '#808080');
    ctx.fillStyle = grd; ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = '#606060'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
}
function drawWater(x, y) {
    ctx.fillStyle = '#2050a0'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#4080d0';
    const t = Date.now() / 400;
    for (let i = 0; i < 3; i++) {
        const yy = y + 4 + i * 8 + Math.sin(t + i) * 2;
        ctx.fillRect(x + 2, yy, TILE - 4, 2);
    }
}
function drawMine(x, y) {
    const cx = x + TILE/2, cy = y + TILE/2;
    const pulse = 0.5 + Math.sin(Date.now()/200) * 0.3;
    ctx.fillStyle = 'rgba(255,60,60,' + (0.2 + pulse*0.2) + ')';
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,80,80,' + (0.6 + pulse*0.4) + ')';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
    // 引信
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy-7); ctx.lineTo(cx+3, cy-10); ctx.stroke();
}
function drawBase(x, y) {
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#ffd700';
    const cx = x + TILE / 2, cy = y + TILE / 2;
    ctx.fillRect(x + 4, y + TILE - 6, TILE - 8, 5);
    ctx.beginPath();
    ctx.moveTo(cx, y + 3); ctx.lineTo(x + TILE - 4, cy);
    ctx.lineTo(cx + 3, y + TILE - 7); ctx.lineTo(cx - 3, y + TILE - 7);
    ctx.lineTo(x + 4, cy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a07000'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2); ctx.lineTo(cx + 4, cy - 2);
    ctx.moveTo(cx - 5, cy + 2); ctx.lineTo(cx + 5, cy + 2); ctx.stroke();
}
function drawGrass() {
    for (let r = 0; r < ROWS; r++) {
        if (!mapData[r]) continue;
        for (let c = 0; c < COLS; c++) {
            if (mapData[r][c] === MAP.GRASS) {
                const x = c * TILE, y = r * TILE;
                ctx.fillStyle = 'rgba(20,140,40,0.85)';
                ctx.fillRect(x, y, TILE, TILE);
                ctx.fillStyle = 'rgba(80,220,80,0.7)';
                for (let i = 0; i < 6; i++) {
                    const gx = x + Math.random() * TILE;
                    const gy = y + Math.random() * TILE;
                    ctx.fillRect(gx, gy, 2, 4);
                }
            }
        }
    }
}

// ===== 主循环 =====
function update() {
    if (appState !== 'playing') return;
    handleInput();
    if (player) player.update();
    for (const e of enemies) e.update();
    for (const b of bullets) b.update();
    bullets = bullets.filter(b => b.alive);
    for (const ex of explosions) ex.update();
    explosions = explosions.filter(e => e.alive);
    for (const mf of muzzleFlashes) mf.frame++;
    muzzleFlashes = muzzleFlashes.filter(m => m.frame < m.maxFrame);
    for (const sp of scorePopups) { sp.frame++; sp.y -= 0.8; }
    scorePopups = scorePopups.filter(s => s.frame < s.maxFrame);
    for (const it of items) it.update();
    items = items.filter(i => i.alive);
    if (shakeFrames > 0) shakeFrames--;
    if (alertFrames > 0) alertFrames--;
    enemies = enemies.filter(e => e.alive);

    // 生成敌人
    if (gameMode === 'survival') {
        updateSurvival();
    } else {
        // 闯关：按队列生成
        if (spawnedEnemies < totalEnemiesThisLevel) {
            spawnTimer++;
            if (spawnTimer >= 130) {
                const t = spawnQueue.shift() || 'basic';
                if (spawnEnemy(t)) spawnTimer = 0;
            }
        }
        // 地震触发
        if (levelConfig && levelConfig.earthquake && !earthquakeTriggered) {
            const trig = levelConfig.earthquake;
            if (trig.trigger === 'spawnCount' && spawnedEnemies >= trig.value) {
                triggerEarthquake();
            }
        }
        // 可重复地震（第12关）
        if (levelConfig && levelConfig.earthquake && levelConfig.earthquake.repeat && earthquakeCount < 2) {
            const trig = levelConfig.earthquake;
            if (earthquakeCount === 1 && spawnedEnemies >= trig.value * 2) {
                earthquakeTriggered = false;  // 允许再次触发
            }
        }
        checkLevelClear();
    }
    updateUI();
}

function render() {
    ctx.save();
    if (shakeFrames > 0) {
        const p = shakePower * (shakeFrames / 16);
        ctx.translate((Math.random() - 0.5) * p * 2, (Math.random() - 0.5) * p * 2);
    }
    if (!bgCache) { try { buildWavepeakBackground(); } catch (e) { bgCache = null; } }
    if (bgCache) {
        ctx.drawImage(bgCache, 0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    drawMap();
    if (player) player.draw(ctx);
    for (const e of enemies) e.draw(ctx);
    for (const b of bullets) b.draw(ctx);
    for (const it of items) it.draw(ctx);
    for (const mf of muzzleFlashes) {
        const t = mf.frame / mf.maxFrame;
        const r = 10 * (1 - t) + 4;
        ctx.save(); ctx.translate(mf.x, mf.y);
        const colorCore = mf.isPlayer ? 'rgba(255,255,180,' : 'rgba(255,200,180,';
        const colorMid  = mf.isPlayer ? 'rgba(255,220,80,'  : 'rgba(255,120,60,';
        const colorOut  = mf.isPlayer ? 'rgba(255,150,0,'    : 'rgba(200,40,0,';
        const a = 1 - t;
        ctx.fillStyle = colorOut + (a*0.5).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r*1.6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = colorMid + (a*0.8).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = colorCore + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
    drawGrass();
    for (const ex of explosions) ex.draw(ctx);
    for (const sp of scorePopups) {
        const t = sp.frame / sp.maxFrame;
        const alpha = Math.min(1, (1 - t) * 1.5);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#000';
        ctx.strokeText(sp.text, sp.x, sp.y);
        ctx.fillStyle = sp.color; ctx.fillText(sp.text, sp.x, sp.y);
        ctx.restore();
    }
    // 中央提示
    if (alertFrames > 0) {
        const t = 1 - alertFrames / 180;
        const alpha = alertFrames > 30 ? 1 : (alertFrames / 30);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = '#000';
        ctx.strokeText(alertText, CANVAS_W/2, 70);
        ctx.fillStyle = '#ffe060'; ctx.fillText(alertText, CANVAS_W/2, 70);
        ctx.restore();
    }
    ctx.restore();
}

function loop() {
    update();
    render();
    requestAnimationFrame(loop);
}

// ===== 按钮事件 =====
campaignBtn.addEventListener('click', showLevelSelect);
howToBtn.addEventListener('click', showHowTo);
backToMenuBtn.addEventListener('click', showMainMenu);
howToBackBtn.addEventListener('click', showMainMenu);
introBackBtn.addEventListener('click', showLevelSelect);
introStartBtn.addEventListener('click', () => startCampaignLevel(selectedLevel));
restartBtn.addEventListener('click', restartGame);
overMenuBtn.addEventListener('click', showMainMenu);
pauseMenuBtn.addEventListener('click', showMainMenu);
victoryMenuBtn.addEventListener('click', showMainMenu);
victorySurvivalBtn.addEventListener('click', startSurvival);
survivalBtn.addEventListener('click', () => { if (isSurvivalUnlocked()) startSurvival(); });
unlockAllBtn.addEventListener('click', unlockAll);

/* ============================================================
 *  移动端触屏控制 & 响应式适配
 * ============================================================ */
(function () {
    'use strict';
    const isTouchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches;

    const btnKeyMap = {
        'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight', 'Space': 'Space'
    };
    const touchBtnState = new Map();
    function pressKey(kc) { if (kc) keys[kc] = true; }
    function releaseKey(kc) { if (kc) keys[kc] = false; }
    function getBtnKeyCode(el) {
        if (!el || !el.dataset) return null;
        return btnKeyMap[el.dataset.key] || null;
    }
    function setBtnActive(el, active) {
        if (!el) return;
        if (active) el.classList.add('active'); else el.classList.remove('active');
    }
    function findBtnFromTarget(target) {
        if (!target) return null;
        let el = target;
        for (let i = 0; i < 3; i++) {
            if (!el) return null;
            if (el.classList && (el.classList.contains('dpad-btn') || el.classList.contains('action-btn'))) return el;
            el = el.parentElement;
        }
        return null;
    }
    function handleTouchStart(e) {
        if (!isTouchDevice) return;
        const touches = e.changedTouches;
        let touchedGameBtn = false;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const target = document.elementFromPoint(t.clientX, t.clientY);
            const btn = findBtnFromTarget(target);
            if (!btn) continue;
            touchedGameBtn = true;
            if (btn.id === 'pauseBtn') {
                togglePause();
                setBtnActive(btn, true);
                setTimeout(() => setBtnActive(btn, false), 150);
                continue;
            }
            if (btn.id === 'mineBtn') {
                placePlayerMine();
                setBtnActive(btn, true);
                setTimeout(() => setBtnActive(btn, false), 150);
                continue;
            }
            const kc = getBtnKeyCode(btn);
            if (!kc) continue;
            touchBtnState.set(t.identifier, { el: btn, keyCode: kc });
            setBtnActive(btn, true);
            pressKey(kc);
        }
        if (touchedGameBtn && e.cancelable) e.preventDefault();
    }
    function handleTouchMove(e) {
        if (!isTouchDevice) return;
        const touches = e.changedTouches;
        let needPreventDefault = false;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const state = touchBtnState.get(t.identifier);
            if (!state) continue;
            needPreventDefault = true;
            const target = document.elementFromPoint(t.clientX, t.clientY);
            const currentBtn = findBtnFromTarget(target);
            if (currentBtn !== state.el) {
                releaseKey(state.keyCode);
                setBtnActive(state.el, false);
                touchBtnState.delete(t.identifier);
                if (currentBtn && currentBtn.id !== 'pauseBtn' && currentBtn.id !== 'mineBtn') {
                    const kc = getBtnKeyCode(currentBtn);
                    if (kc) {
                        touchBtnState.set(t.identifier, { el: currentBtn, keyCode: kc });
                        setBtnActive(currentBtn, true);
                        pressKey(kc);
                    }
                }
            }
        }
        if (needPreventDefault && e.cancelable) e.preventDefault();
    }
    function handleTouchEnd(e) {
        if (!isTouchDevice) return;
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const state = touchBtnState.get(t.identifier);
            if (!state) continue;
            releaseKey(state.keyCode);
            setBtnActive(state.el, false);
            touchBtnState.delete(t.identifier);
        }
    }
    function handleTouchCancel(e) { handleTouchEnd(e); }
    function bindTouchEvents() {
        const dpad = document.getElementById('touchDpad');
        const actions = document.getElementById('touchActions');
        const opts = { passive: false, capture: false };
        if (dpad) dpad.addEventListener('touchstart', handleTouchStart, opts);
        if (actions) actions.addEventListener('touchstart', handleTouchStart, opts);
        document.addEventListener('touchmove', handleTouchMove, opts);
        document.addEventListener('touchend', handleTouchEnd, opts);
        document.addEventListener('touchcancel', handleTouchCancel, opts);
        const fireBtn = document.getElementById('fireBtn');
        if (fireBtn) {
            fireBtn.addEventListener('click', () => {
                if (!window.matchMedia('(pointer: coarse)').matches) {
                    pressKey('Space'); setTimeout(() => releaseKey('Space'), 60);
                }
            });
        }
        const pauseBtnEl = document.getElementById('pauseBtn');
        if (pauseBtnEl) {
            pauseBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.matchMedia('(pointer: coarse)').matches) togglePause();
            });
        }
        const mineBtnEl = document.getElementById('mineBtn');
        if (mineBtnEl) {
            mineBtnEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.matchMedia('(pointer: coarse)').matches) placePlayerMine();
            });
        }
    }
    function resizeCanvas() {
        const cv = document.getElementById('gameCanvas');
        if (!cv) return;
        const isMobile = window.innerWidth <= 980 || window.matchMedia('(pointer: coarse)').matches;
        if (!isMobile) { cv.style.width = '624px'; cv.style.height = '624px'; return; }
        const infoHeight = 58;
        const isLandscape = window.innerWidth > window.innerHeight;
        let maxW, maxH;
        if (isLandscape) {
            maxW = Math.min(window.innerWidth - 280, CANVAS_W);
            maxH = Math.min(window.innerHeight - infoHeight - 20, CANVAS_H);
        } else {
            maxW = Math.min(window.innerWidth - 12, CANVAS_W);
            maxH = Math.min(window.innerHeight - infoHeight - 30, CANVAS_H);
        }
        const size = Math.max(180, Math.min(maxW, maxH));
        cv.style.width = size + 'px';
        cv.style.height = size + 'px';
    }
    function checkOrientation() {
        const mask = document.getElementById('portraitMask');
        if (!mask) return;
        if (!isTouchDevice && window.innerWidth > 980) { mask.classList.remove('visible'); return; }
        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait && window.innerWidth <= 980) mask.style.display = 'flex';
        else mask.style.display = 'none';
    }
    function initMobile() {
        bindTouchEvents();
        resizeCanvas();
        checkOrientation();
        if (!isTouchDevice && window.innerWidth > 980) {
            const d = document.getElementById('touchDpad');
            const a = document.getElementById('touchActions');
            if (d) d.style.display = 'none';
            if (a) a.style.display = 'none';
        }
        window.addEventListener('resize', () => { resizeCanvas(); checkOrientation(); });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => { resizeCanvas(); checkOrientation(); }, 250);
        });
        window.addEventListener('load', () => {
            setTimeout(() => { resizeCanvas(); checkOrientation(); }, 100);
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobile);
    } else {
        initMobile();
    }
})();

/* ===== 线上兼容性加固 ===== */
(function () {
    const portraitMask = document.getElementById('portraitMask');
    const portraitCloseBtn = document.getElementById('portraitCloseBtn');
    if (portraitCloseBtn && portraitMask) {
        const closeMask = (e) => {
            portraitMask.style.display = 'none';
            try { sessionStorage.setItem('portraitMaskDismissed', '1'); } catch (e) {}
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.preventDefault) e.preventDefault();
        };
        portraitCloseBtn.addEventListener('touchstart', closeMask, { passive: false, capture: true });
        portraitCloseBtn.addEventListener('click', closeMask);
    }
    try {
        if (sessionStorage.getItem('portraitMaskDismissed') === '1' && portraitMask) {
            portraitMask.style.display = 'none';
        }
    } catch (e) {}
    // overlay 内所有按钮 touchend 兜底
    function addTouchendFallback(btn) {
        if (!btn) return;
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.click();
        }, { passive: false, capture: true });
    }
    const btnIds = ['campaignBtn','survivalBtn','howToBtn','backToMenuBtn','introBackBtn',
        'introStartBtn','howToBackBtn','restartBtn','overMenuBtn','pauseMenuBtn',
        'victoryMenuBtn','victorySurvivalBtn','unlockAllBtn'];
    for (const id of btnIds) addTouchendFallback(document.getElementById(id));
})();

// ===== 启动 =====
showMainMenu();
loop();
