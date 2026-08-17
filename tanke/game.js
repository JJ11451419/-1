/* =========================================================
 *  坦克大战 - 核心游戏逻辑
 * ========================================================= */

// ===== 常量配置 =====
const TILE = 24;                       // 单格像素大小
const COLS = 26;                       // 地图列数
const ROWS = 26;                       // 地图行数
const CANVAS_W = TILE * COLS;          // 624
const CANVAS_H = TILE * ROWS;          // 624

const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

// 地图元素类型
const MAP = {
    EMPTY: 0,   // 空地
    BRICK: 1,   // 砖墙（可破坏）
    STEEL: 2,   // 钢墙（不可破坏）
    WATER: 3,   // 水域（不能通过）
    GRASS: 4,   // 草地（可以通过，会挡住视野）
    BASE: 5     // 基地（老鹰）
};

// ===== 获取DOM元素 =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const levelEl = document.getElementById('level');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const enemiesEl = document.getElementById('enemies');
const finalScoreEl = document.getElementById('finalScore');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMsg = document.getElementById('gameOverMsg');

// ===== 游戏状态 =====
let gameState = 'start';   // start | playing | paused | gameover | victory
let level = 1;
let score = 0;
let lives = 3;
let mapData = [];          // 26x26 的地图数据
// 初始化空地图防止启动报错
for (let i = 0; i < ROWS; i++) {
    mapData.push(new Array(COLS).fill(MAP.EMPTY));
}
let player = null;
let enemies = [];
let bullets = [];
let explosions = [];
let muzzleFlashes = [];   // 炮口焰 [{x,y,dir,isPlayer,frame}]
let scorePopups = [];     // 得分飘字 [{x,y,text,color,frame,maxFrame}]
let shakeFrames = 0;      // 屏幕震屏剩余帧
let shakePower = 0;       // 震屏强度
let totalEnemiesThisLevel = 0;
let spawnedEnemies = 0;
let spawnTimer = 0;
const keys = {};

// ===== 浪尖儿 WavePeak Elite 背景图（离线Canvas绘制）=====
// 直接用 Canvas 2D 1:1 复刻用户提供的素材，完全不依赖外部网络资源：
//   - 纯黑底 + 细暗蓝科技网格地
//   - 左侧 漏斗/喇叭形 蓝→青→黄 渐变波浪（3层同心圆环 波峰）
//   - 右侧 白色粗体大字「浪尖儿」+ 英文「WavePeak Elite」
// 使用离屏 canvas 缓存一次（bgCache），render 里直接 drawImage 拷出（性能好）。
let bgCache = null;
function buildWavepeakBackground() {
    const W = CANVAS_W, H = CANVAS_H;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');

    // 1) 纯黑底
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);

    // 2) 暗科技网格（细深蓝线）
    c.strokeStyle = 'rgba(30, 60, 120, 0.22)';
    c.lineWidth = 1;
    const step = TILE;  // 跟地图tile同大：24
    for (let x = 0; x <= W; x += step) {
        c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); c.stroke();
    }
    for (let y = 0; y <= H; y += step) {
        c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); c.stroke();
    }

    // 3) 角点装饰：4个角落 + 屏幕中心 绘小圆点（像雷达/战情室）
    c.fillStyle = 'rgba(80, 160, 255, 0.35)';
    const dots = [
        [step*1, step*1], [step*25, step*1],
        [step*1, step*25], [step*25, step*25],
        [step*13, step*13]
    ];
    for (const [dx, dy] of dots) {
        c.beginPath(); c.arc(dx, dy, 2, 0, Math.PI*2); c.fill();
    }

    // ===== 4) 中央 Logo 区（和用户原图一样：左边漏斗波浪 + 右边中文英文） =====
    //  Logo 放在画布上方居中偏左（高度约 1/3 canvas）
    const logoCx = W / 2 - 10;     // logo 整体中心（整体左移一点给中文留白）
    const logoCy = H * 0.26;
    const logoScale = 0.95;

    // ----- 4.1 漏斗/喇叭形波浪（左边锥尖朝左，开口朝右，蓝→青→黄 渐变同心环） -----
    // 锥尖
    const tipX = logoCx - 180 * logoScale;
    const tipY = logoCy;
    // 开口（右端面）圆心
    const baseCx = logoCx - 10 * logoScale;
    const baseCy = logoCy;
    const baseR = 80 * logoScale;        // 最外层开口半径
    const coneLen = 170 * logoScale;     // 锥体长度

    // 4.1.1 绘制锥体（从尖端到开口的扇形喇叭形状）
    // 沿锥体长度方向取 4 段圆环，填充为 蓝->青->绿->黄 渐变
    const rings = 4;
    for (let i = rings; i >= 1; i--) {
        const t = i / rings;  // 0..1 从尖端到开口
        // 当前位置的圆心 & 半径（线性放大）
        const cx = tipX + (baseCx - tipX) * t;
        const cy = tipY;
        const r  = baseR * t;

        // 颜色：尖端(深蓝) -> 开口(黄)
        let col;
        if (t < 0.25)      col = '#1464e0';   // 深蓝
        else if (t < 0.55) col = '#25a6ff';   // 亮蓝
        else if (t < 0.8)  col = '#4adbbf';   // 青绿
        else               col = '#e8ff6a';   // 柠黄

        // 绘制圆环（环带而不是实心，模拟用户原图的同心波峰层）
        const rInner = Math.max(0, r - 14 * logoScale);
        c.fillStyle = col;
        c.globalAlpha = 0.92;
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.arc(cx, cy, rInner, 0, Math.PI * 2, true);
        c.fill('evenodd');
    }
    c.globalAlpha = 1;

    // 4.1.2 锥形的侧边连接：用两条四边形从 tip -> baseR 上下两端闭合漏斗主体
    // 绘制实心渐变锥体：使用线性渐变（横向：tip→base）
    const coneGrad = c.createLinearGradient(tipX, 0, baseCx + baseR, 0);
    coneGrad.addColorStop(0.0, 'rgba(20, 100, 224, 0.95)');
    coneGrad.addColorStop(0.4, 'rgba(37, 166, 255, 0.95)');
    coneGrad.addColorStop(0.75, 'rgba(74, 219, 191, 0.95)');
    coneGrad.addColorStop(1.0, 'rgba(232, 255, 106, 0.95)');

    c.save();
    c.beginPath();
    // tip -> 上端开口 -> 下端开口
    c.moveTo(tipX - 1, tipY);
    c.lineTo(baseCx, baseCy - baseR);
    // 沿右开口画一个半圆（上到下）
    c.arc(baseCx, baseCy, baseR, -Math.PI/2, Math.PI/2, false);
    c.lineTo(tipX - 1, tipY);     // 回到 tip
    c.closePath();
    c.fillStyle = coneGrad;
    c.fill();
    c.restore();

    // 4.1.3 右端面同心圆环（用户原图能清晰看到开口端面有3圈彩色环）
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

    // 4.1.4 波峰整体外发光（柔和光晕）
    const halo = c.createRadialGradient(baseCx, baseCy, baseR*0.2, baseCx, baseCy, baseR*2.2);
    halo.addColorStop(0, 'rgba(160, 255, 220, 0.22)');
    halo.addColorStop(1, 'rgba(160, 255, 220, 0)');
    c.fillStyle = halo;
    c.beginPath(); c.arc(baseCx, baseCy, baseR*2.2, 0, Math.PI*2); c.fill();

    // ----- 4.2 右侧 中文「浪尖儿」+ 英文 WavePeak Elite -----
    const textCx = logoCx + 110 * logoScale;

    // 中文
    c.save();
    c.font = 'bold ' + Math.round(78 * logoScale) + 'px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    const zhText = '浪尖儿';
    const zhBaseY = logoCy - 8 * logoScale;
    // 文字阴影（仿原图的厚重白字）
    c.fillStyle = '#fff';
    c.shadowColor = 'rgba(120, 200, 255, 0.5)';
    c.shadowBlur = 12;
    c.fillText(zhText, textCx, zhBaseY);
    c.shadowBlur = 0;
    c.restore();

    // 英文
    c.save();
    c.font = 'bold ' + Math.round(38 * logoScale) + 'px "Arial Black", "Helvetica", sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#ffffff';
    const en1 = 'WavePeak';
    const en2 = 'Elite';
    const enBaseY1 = zhBaseY + 46 * logoScale;
    const enBaseY2 = enBaseY1 + 46 * logoScale;
    c.fillText(en1, textCx, enBaseY1);
    c.fillText(en2, textCx, enBaseY2);
    c.restore();

    // ----- 4.3 logo 底部加一条发光分隔线（装饰） -----
    c.save();
    const lineY = enBaseY2 + 22 * logoScale;
    const lineGrad = c.createLinearGradient(textCx - 20, 0, textCx + 400 * logoScale, 0);
    lineGrad.addColorStop(0, 'rgba(74, 219, 191, 0.0)');
    lineGrad.addColorStop(0.5, 'rgba(74, 219, 191, 0.9)');
    lineGrad.addColorStop(1, 'rgba(232, 255, 106, 0.0)');
    c.strokeStyle = lineGrad;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(textCx - 20, lineY);
    c.lineTo(textCx + 400 * logoScale, lineY);
    c.stroke();
    c.restore();

    // ===== 5) 四角的装饰 UI（模拟战情室 HUD 边框） =====
    c.save();
    c.strokeStyle = 'rgba(80, 180, 255, 0.35)';
    c.lineWidth = 2;
    const cornerLen = 40;
    const pad = 6;
    // 左上
    c.beginPath();
    c.moveTo(pad, pad + cornerLen); c.lineTo(pad, pad); c.lineTo(pad + cornerLen, pad);
    // 右上
    c.moveTo(W - pad - cornerLen, pad); c.lineTo(W - pad, pad); c.lineTo(W - pad, pad + cornerLen);
    // 左下
    c.moveTo(pad, H - pad - cornerLen); c.lineTo(pad, H - pad); c.lineTo(pad + cornerLen, H - pad);
    // 右下
    c.moveTo(W - pad - cornerLen, H - pad); c.lineTo(W - pad, H - pad); c.lineTo(W - pad, H - pad - cornerLen);
    c.stroke();
    c.restore();

    bgCache = cv;
}

// ===== 关卡地图设计 =====
// B=砖墙 S=钢墙 W=水 G=草 E=空地 X=基地
// 26x26 网格 - 每行必须正好26个字符
// 墙壁拼成大写 L J J 三个字母形状
const LEVEL_MAPS = [
    // 第一关
    [
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EBBEEEEEEBBBBBBEEBBBBBBEEE",
        "EBBEEEEEEBBBBBBEEBBBBBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEEEEEBBEEEEEEBBEEE",
        "EBBEEEEEEBEEEBBEEBEEEBBEEE",
        "EBBEEEEEEBEEEBBEEBEEEBBEEE",
        "EBBBBBBEEBBBBBBEEBBBBBBEEE",
        "EBBBBBBEEBBBBBBEEBBBBBBEEE",
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EESSEEEEEEESSEEEEEEESSEEEE",
        "EESSEEEEEEESSEEEEEEESSEEEE",
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EEBBEEBBBBEEBBBBEEBBBBEEEE",
        "EEBBEEBBBBEEBBBBEEBBBBEEEE",
        "EEEEEEEEEEEEEEEEEEEEEEEEEE",
        "EEEEEEEEEEBBBBBBEEEEEEEEEE",
        "EEEEEEEEEEBBEEBBEEEEEEEEEE",
        "EEEEEEEEEEBBEXBBEEEEEEEEEE",
        "EEEEEEEEEEBBBBBBEEEEEEEEEE",
    ]
];

// ===== 工具函数 =====
function symbolToTile(sym) {
    switch (sym) {
        case 'B': return MAP.BRICK;
        case 'S': return MAP.STEEL;
        case 'W': return MAP.WATER;
        case 'G': return MAP.GRASS;
        case 'X': return MAP.BASE;
        default:  return MAP.EMPTY;
    }
}

function loadLevel(levelIdx) {
    const template = LEVEL_MAPS[(levelIdx - 1) % LEVEL_MAPS.length];
    mapData = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        const line = template[r] || "";
        for (let c = 0; c < COLS; c++) {
            row.push(symbolToTile(line[c] || 'E'));
        }
        mapData.push(row);
    }
}

function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== 坦克类 =====
class Tank {
    constructor(x, y, isPlayer = false, type = 'basic') {
        this.x = x;
        this.y = y;
        this.w = TILE * 2 - 4;  // 坦克大小占2格（留2像素边）
        this.h = TILE * 2 - 4;
        this.speed = isPlayer ? 1.2 : 0.8;
        this.dir = isPlayer ? DIR.UP : DIR.DOWN;
        this.isPlayer = isPlayer;
        this.type = type;
        this.alive = true;
        this.shootCooldown = 0;
        this.shootInterval = isPlayer ? 25 : 80;
        this.color = isPlayer ? '#f0d000' : '#c03030';
        this.treadPhase = 0;
        // AI
        this.aiMoveTimer = 0;
        this.aiShootTimer = 0;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    tryMove(dir) {
        this.dir = dir;
        let nx = this.x;
        let ny = this.y;
        switch (dir) {
            case DIR.UP:    ny -= this.speed; break;
            case DIR.DOWN:  ny += this.speed; break;
            case DIR.LEFT:  nx -= this.speed; break;
            case DIR.RIGHT: nx += this.speed; break;
        }

        // ===== 边界硬阻挡 + 贴边修正（避免嵌墙或抖动） =====
        let snappedX = false;
        let snappedY = false;
        if (nx < 0) { nx = 0; snappedX = true; }
        if (nx + this.w > CANVAS_W) { nx = CANVAS_W - this.w; snappedX = true; }
        if (ny < 0) { ny = 0; snappedY = true; }
        if (ny + this.h > CANVAS_H) { ny = CANVAS_H - this.h; snappedY = true; }

        const testRect = { x: nx, y: ny, w: this.w, h: this.h };

        // 地图碰撞（AABB严格判定）
        if (this.collidesMap(testRect)) return false;

        // 其他坦克碰撞
        if (this.collidesTanks(testRect)) return false;

        this.x = nx;
        this.y = ny;
        this.treadPhase = (this.treadPhase + (snappedX || snappedY ? 0 : 1)) % 20;
        return true;
    }

    // 前向探测：给定方向，看移动 delta 像素是否会碰撞（用于 AI 决策）
    canMoveDir(dir, delta) {
        delta = delta || this.speed * 3;
        let nx = this.x;
        let ny = this.y;
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
        const c1 = Math.max(0, Math.floor(rect.x / TILE));
        const c2 = Math.min(COLS - 1, Math.floor((rect.x + rect.w - 1) / TILE));
        const r1 = Math.max(0, Math.floor(rect.y / TILE));
        const r2 = Math.min(ROWS - 1, Math.floor((rect.y + rect.h - 1) / TILE));
        // 若rect超出地图边界，视为碰撞
        if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > CANVAS_W || rect.y + rect.h > CANVAS_H) return true;
        for (let r = r1; r <= r2; r++) {
            for (let c = c1; c <= c2; c++) {
                const t = mapData[r][c];
                if (t === MAP.BRICK || t === MAP.STEEL || t === MAP.WATER || t === MAP.BASE) {
                    return true;
                }
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

        bullets.push(new Bullet(bx, by, this.dir, this.isPlayer));

        // ===== 炮口焰 =====
        let fx = this.x + this.w / 2;
        let fy = this.y + this.h / 2;
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

        if (!this.isPlayer && this.alive) {
            this.aiUpdate();
        }
    }

    aiUpdate() {
        this.aiMoveTimer--;
        this.aiShootTimer--;

        // ===== 前向预测碰撞：当前方向不可行则立即换向 =====
        const forwardOk = this.canMoveDir(this.dir, this.speed * 2);

        if (this.aiMoveTimer <= 0 || !forwardOk || !this.tryMove(this.dir)) {
            // 收集所有候选可行方向（canMoveDir 探测3步距离）
            const allDirs = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
            const openDirs = [];
            for (const d of allDirs) {
                if (this.canMoveDir(d, this.speed * 4)) openDirs.push(d);
            }
            // 策略：优先朝下方（基地），其次选 openDirs 里的任意方向，最后回退到全随机
            let chosen = null;
            const rand = Math.random();
            if (openDirs.length > 0) {
                // 55% 概率：选朝向玩家/基地的"进攻性"方向
                if (rand < 0.55) {
                    const attackDirs = openDirs.filter(d => d === DIR.DOWN || d === DIR.LEFT || d === DIR.RIGHT);
                    if (attackDirs.length > 0) {
                        chosen = attackDirs[Math.floor(Math.random() * attackDirs.length)];
                    }
                }
                // 否则在可行方向中随机（避免撞墙后还选相同方向卡死）
                if (!chosen) {
                    // 尽量不选与当前相反的方向（减少来回抖动）
                    const opposite = (this.dir + 2) % 4;
                    const better = openDirs.filter(d => d !== opposite);
                    const pool = better.length > 0 ? better : openDirs;
                    chosen = pool[Math.floor(Math.random() * pool.length)];
                }
            } else {
                // 完全被围：随机试一个
                chosen = allDirs[Math.floor(Math.random() * 4)];
            }
            this.dir = chosen;
            this.aiMoveTimer = 40 + Math.floor(Math.random() * 90);
        } else {
            this.tryMove(this.dir);
        }

        // ===== 射击：如果玩家或基地在正前方直线上，提高开火概率 =====
        let shouldShoot = false;
        if (this.aiShootTimer <= 0) {
            shouldShoot = true;
        } else if (this.hasTargetAhead()) {
            // 前方有目标：冷却减半就开火
            if (this.aiShootTimer <= this.shootInterval / 2) shouldShoot = true;
        }
        if (shouldShoot) {
            this.shoot();
            this.aiShootTimer = 40 + Math.floor(Math.random() * 90);
        }
    }

    // 检测炮口正前方是否有玩家坦克或基地
    hasTargetAhead() {
        const bx = this.x + this.w / 2;
        const by = this.y + this.h / 2;
        // 目标候选：玩家坦克、基地
        const targets = [];
        if (player && player.alive) {
            targets.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, isBase: false });
        }
        // 基地位置（扫描地图找BASE格子的中心点）
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (mapData[r] && mapData[r][c] === MAP.BASE) {
                    targets.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, isBase: true });
                }
            }
        }
        for (const tg of targets) {
            const dx = tg.x - bx;
            const dy = tg.y - by;
            const withinRange = Math.abs(dx) < 6 * TILE && Math.abs(dy) < 6 * TILE;
            if (!withinRange) continue;
            if (this.dir === DIR.UP && dy < 0 && Math.abs(dx) < this.w / 2 + 4) return true;
            if (this.dir === DIR.DOWN && dy > 0 && Math.abs(dx) < this.w / 2 + 4) return true;
            if (this.dir === DIR.LEFT && dx < 0 && Math.abs(dy) < this.h / 2 + 4) return true;
            if (this.dir === DIR.RIGHT && dx > 0 && Math.abs(dy) < this.h / 2 + 4) return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.alive) return;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        const halfW = this.w / 2;
        const halfH = this.h / 2;

        ctx.save();
        ctx.translate(cx, cy);
        const rotAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        ctx.rotate(rotAngles[this.dir]);

        // 履带
        const treadColor = '#333';
        ctx.fillStyle = treadColor;
        ctx.fillRect(-halfW, -halfH, 8, this.h);
        ctx.fillRect(halfW - 8, -halfH, 8, this.h);
        // 履带花纹
        ctx.fillStyle = '#555';
        const phase = Math.floor(this.treadPhase / 5);
        for (let i = 0; i < 5; i++) {
            const y = -halfH + 2 + i * 9 + (phase % 2) * 4;
            ctx.fillRect(-halfW + 1, y, 6, 4);
            ctx.fillRect(halfW - 7, y, 6, 4);
        }

        // 车身
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfW + 7, -halfH + 2, this.w - 14, this.h - 4);

        // 车身高光
        ctx.fillStyle = this.isPlayer ? '#fff680' : '#ff8080';
        ctx.fillRect(-halfW + 8, -halfH + 3, 3, this.h - 6);

        // 炮塔（圆形）
        ctx.fillStyle = this.isPlayer ? '#c0a000' : '#902020';
        const tSize = this.w * 0.42;
        ctx.beginPath();
        ctx.arc(0, 0, tSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // 炮管
        ctx.fillStyle = '#222';
        ctx.fillRect(-3, -halfH - 2, 6, halfH + 4);

        ctx.restore();
    }
}

// ===== 子弹类 =====
class Bullet {
    constructor(x, y, dir, fromPlayer) {
        this.w = 6;
        this.h = 8;
        if (dir === DIR.LEFT || dir === DIR.RIGHT) {
            this.w = 8; this.h = 6;
        }
        this.x = x;
        this.y = y;
        this.dir = dir;
        this.speed = 5;
        this.fromPlayer = fromPlayer;
        this.alive = true;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    update() {
        switch (this.dir) {
            case DIR.UP:    this.y -= this.speed; break;
            case DIR.DOWN:  this.y += this.speed; break;
            case DIR.LEFT:  this.x -= this.speed; break;
            case DIR.RIGHT: this.x += this.speed; break;
        }
        // 出界
        if (this.x < 0 || this.x > CANVAS_W || this.y < 0 || this.y > CANVAS_H) {
            this.alive = false;
        }
        // 地图碰撞
        this.checkMapCollision();
        // 坦克碰撞
        this.checkTankCollision();
        // 子弹对撞
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
                    gameOver(false);
                }
            }
        }
        if (hit) this.alive = false;
    }

    checkTankCollision() {
        if (!this.alive) return;
        if (this.fromPlayer) {
            for (const e of enemies) {
                if (e.alive && rectIntersect(this.rect, e.rect)) {
                    e.alive = false;
                    this.alive = false;
                    score += 100;
                    spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, 'big');
                    addScorePopup(e.x + e.w / 2, e.y, '+100', '#ffd700');
                    updateUI();
                    return;
                }
            }
        } else {
            if (player && player.alive && rectIntersect(this.rect, player.rect)) {
                player.alive = false;
                this.alive = false;
                lives--;
                spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, 'big');
                addScorePopup(player.x + player.w / 2, player.y, '-1 ❤', '#ff5555');
                updateUI();
                if (lives > 0) {
                    setTimeout(() => respawnPlayer(), 1000);
                } else {
                    gameOver(false);
                }
            }
        }
    }

    checkBulletCollision() {
        if (!this.alive) return;
        for (const b of bullets) {
            if (b !== this && b.alive && b.fromPlayer !== this.fromPlayer) {
                if (rectIntersect(this.rect, b.rect)) {
                    this.alive = false;
                    b.alive = false;
                    return;
                }
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = this.fromPlayer ? '#ffffff' : '#ffaaaa';
        ctx.shadowColor = this.fromPlayer ? '#ffff00' : '#ff0000';
        ctx.shadowBlur = 6;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.shadowBlur = 0;
    }
}

// ===== 爆炸效果 =====
class Explosion {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;      // tiny | small | big
        this.frame = 0;
        this.maxFrame = size === 'big' ? 30 : (size === 'small' ? 20 : 10);
        this.alive = true;
    }
    update() {
        this.frame++;
        if (this.frame >= this.maxFrame) this.alive = false;
    }
    draw(ctx) {
        const t = this.frame / this.maxFrame;
        const baseR = this.size === 'big' ? 30 : (this.size === 'small' ? 16 : 8);
        const r = baseR * (0.5 + t * 0.8);
        const alpha = 1 - t;

        // 多层爆炸环
        const colors = ['rgba(255,100,0,ALPHA)', 'rgba(255,200,0,ALPHA)', 'rgba(255,255,255,ALPHA)'];
        for (let i = 0; i < 3; i++) {
            const rr = r * (1 - i * 0.25);
            if (rr <= 0) continue;
            ctx.fillStyle = colors[i].replace('ALPHA', alpha.toFixed(2));
            ctx.beginPath();
            ctx.arc(this.x, this.y, rr, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function spawnExplosion(x, y, size) {
    explosions.push(new Explosion(x, y, size));
    // ===== 屏幕震动 =====
    if (size === 'big') {
        shakeFrames = 16;
        shakePower = 5;
    } else if (size === 'small') {
        shakeFrames = 8;
        shakePower = 2;
    } else {
        shakeFrames = 4;
        shakePower = 1;
    }
}

// 得分飘字
function addScorePopup(x, y, text, color) {
    scorePopups.push({
        x: x, y: y,
        text: text || '+100',
        color: color || '#ffd700',
        frame: 0, maxFrame: 40
    });
}

// ===== 游戏控制 =====
function initLevel() {
    loadLevel(level);
    bullets = [];
    explosions = [];
    enemies = [];
    spawnedEnemies = 0;
    totalEnemiesThisLevel = 8;
    spawnTimer = 0;
    respawnPlayer();
    updateUI();
}

function respawnPlayer() {
    const px = TILE * 8;
    const py = TILE * (ROWS - 2) - 2;
    player = new Tank(px, py, true);
}

function spawnEnemy() {
    if (spawnedEnemies >= totalEnemiesThisLevel) return;
    if (enemies.filter(e => e.alive).length >= 4) return;

    const spawnPoints = [
        { x: 2, y: 0 },
        { x: (COLS / 2 - 1), y: 0 },
        { x: COLS - 4, y: 0 }
    ];
    const sp = spawnPoints[spawnedEnemies % spawnPoints.length];
    const ex = sp.x * TILE + 2;
    const ey = sp.y * TILE + 2;

    // 检查生成点是否被占用
    const testRect = { x: ex, y: ey, w: TILE * 2 - 4, h: TILE * 2 - 4 };
    const allTanks = [player, ...enemies].filter(t => t && t.alive);
    for (const t of allTanks) {
        if (rectIntersect(testRect, t.rect)) return;
    }

    enemies.push(new Tank(ex, ey, false, 'basic'));
    spawnedEnemies++;
    spawnExplosion(ex + TILE, ey + TILE, 'small');
}

function updateUI() {
    levelEl.textContent = level;
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    enemiesEl.textContent = totalEnemiesThisLevel - spawnedEnemies + enemies.filter(e => e.alive).length;
}

function gameOver(win) {
    gameState = 'gameover';
    finalScoreEl.textContent = score;
    if (win) {
        gameOverTitle.textContent = '🎉 胜 利 ！';
        gameOverMsg.textContent = '恭喜通关！还想再来一局吗？';
    } else {
        gameOverTitle.textContent = '💥 游戏结束';
        gameOverMsg.textContent = '再接再厉！';
    }
    gameOverScreen.classList.remove('hidden');
}

function startGame() {
    level = 1;
    score = 0;
    lives = 3;
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    initLevel();
}

function restartGame() {
    startGame();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        pauseScreen.classList.remove('hidden');
    } else if (gameState === 'paused') {
        gameState = 'playing';
        pauseScreen.classList.add('hidden');
    }
}

// ===== 输入处理 =====
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP') togglePause();
    // 防止方向键滚动页面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
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
    if (mapData.length === 0) return;
    for (let r = 0; r < ROWS; r++) {
        if (!mapData[r]) continue;
        for (let c = 0; c < COLS; c++) {
            const t = mapData[r][c];
            if (t === undefined) continue;
            const x = c * TILE;
            const y = r * TILE;
            switch (t) {
                case MAP.BRICK: drawBrick(x, y); break;
                case MAP.STEEL: drawSteel(x, y); break;
                case MAP.WATER: drawWater(x, y); break;
                case MAP.GRASS: break; // 最后绘制草
                case MAP.BASE:  drawBase(x, y); break;
            }
        }
    }
}

function drawBrick(x, y) {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x, y, TILE, TILE);
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
    grd.addColorStop(0, '#b0b0b0');
    grd.addColorStop(0.5, '#e8e8e8');
    grd.addColorStop(1, '#808080');
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
}

function drawWater(x, y) {
    ctx.fillStyle = '#2050a0';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#4080d0';
    const t = Date.now() / 400;
    for (let i = 0; i < 3; i++) {
        const yy = y + 4 + i * 8 + Math.sin(t + i) * 2;
        ctx.fillRect(x + 2, yy, TILE - 4, 2);
    }
}

function drawBase(x, y) {
    // 老鹰基地
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, TILE, TILE);
    // 鹰身（金色）
    ctx.fillStyle = '#ffd700';
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    // 底座
    ctx.fillRect(x + 4, y + TILE - 6, TILE - 8, 5);
    // 身体
    ctx.beginPath();
    ctx.moveTo(cx, y + 3);
    ctx.lineTo(x + TILE - 4, cy);
    ctx.lineTo(cx + 3, y + TILE - 7);
    ctx.lineTo(cx - 3, y + TILE - 7);
    ctx.lineTo(x + 4, cy);
    ctx.closePath();
    ctx.fill();
    // 翅膀纹
    ctx.strokeStyle = '#a07000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2);
    ctx.lineTo(cx + 4, cy - 2);
    ctx.moveTo(cx - 5, cy + 2);
    ctx.lineTo(cx + 5, cy + 2);
    ctx.stroke();
}

function drawGrass() {
    if (mapData.length === 0) return;
    for (let r = 0; r < ROWS; r++) {
        if (!mapData[r]) continue;
        for (let c = 0; c < COLS; c++) {
            if (mapData[r][c] === MAP.GRASS) {
                const x = c * TILE;
                const y = r * TILE;
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

// ===== 主游戏循环 =====
function update() {
    if (gameState !== 'playing') return;

    handleInput();

    // 玩家
    if (player) player.update();

    // 敌人
    for (const e of enemies) e.update();

    // 子弹
    for (const b of bullets) b.update();
    bullets = bullets.filter(b => b.alive);

    // 爆炸
    for (const ex of explosions) ex.update();
    explosions = explosions.filter(e => e.alive);

    // 炮口焰帧推进
    for (const mf of muzzleFlashes) mf.frame++;
    muzzleFlashes = muzzleFlashes.filter(m => m.frame < m.maxFrame);

    // 得分飘字帧推进
    for (const sp of scorePopups) { sp.frame++; sp.y -= 0.8; }
    scorePopups = scorePopups.filter(s => s.frame < s.maxFrame);

    // 震屏帧推进
    if (shakeFrames > 0) shakeFrames--;

    // 清理死亡敌人
    enemies = enemies.filter(e => e.alive);

    // 生成敌人
    spawnTimer++;
    if (spawnTimer >= 150) {
        spawnEnemy();
        spawnTimer = 0;
    }

    // 胜利判断
    const remaining = (totalEnemiesThisLevel - spawnedEnemies) + enemies.length;
    if (remaining === 0 && player && player.alive) {
        // 过关（这里简化为胜利）
        gameOver(true);
    }

    updateUI();
}

function render() {
    // ===== 屏幕震动：对 canvas 整体坐标做随机偏移 =====
    ctx.save();
    if (shakeFrames > 0) {
        const p = shakePower * (shakeFrames / 16);
        const sx = (Math.random() - 0.5) * p * 2;
        const sy = (Math.random() - 0.5) * p * 2;
        ctx.translate(sx, sy);
    }

    // ===== 背景：离线绘制的浪尖儿 WavePeak 风格底图 + 55% 半透明黑遮罩 =====
    if (!bgCache) {
        // 首次 render 时构建缓存（只构建 1 次）
        try {
            buildWavepeakBackground();
        } catch (e) {
            // 构建失败 → 兜底纯黑
            bgCache = null;
        }
    }
    if (bgCache) {
        ctx.drawImage(bgCache, 0, 0, CANVAS_W, CANVAS_H);
        // 暗色遮罩：logo 可见但不抢戏，保证砖墙/坦克/子弹的对比
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    // 地图（草除外）
    drawMap();

    // 坦克
    if (player) player.draw(ctx);
    for (const e of enemies) e.draw(ctx);

    // 子弹
    for (const b of bullets) b.draw(ctx);

    // 炮口焰（放在草地前，避免被挡）
    for (const mf of muzzleFlashes) {
        const t = mf.frame / mf.maxFrame;
        const r = 10 * (1 - t) + 4;
        ctx.save();
        ctx.translate(mf.x, mf.y);
        const colorCore = mf.isPlayer ? 'rgba(255,255,180,' : 'rgba(255,200,180,';
        const colorMid  = mf.isPlayer ? 'rgba(255,220,80,'  : 'rgba(255,120,60,';
        const colorOut  = mf.isPlayer ? 'rgba(255,150,0,'    : 'rgba(200,40,0,';
        const a = 1 - t;
        // 外圈
        ctx.fillStyle = colorOut + (a*0.5).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r*1.6, 0, Math.PI*2); ctx.fill();
        // 中圈
        ctx.fillStyle = colorMid + (a*0.8).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        // 核心
        ctx.fillStyle = colorCore + a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // 草地（覆盖在坦克上）
    drawGrass();

    // 爆炸
    for (const ex of explosions) ex.draw(ctx);

    // ===== 得分飘字（最上层） =====
    for (const sp of scorePopups) {
        const t = sp.frame / sp.maxFrame;
        const alpha = Math.min(1, (1 - t) * 1.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.strokeText(sp.text, sp.x, sp.y);
        ctx.fillStyle = sp.color;
        ctx.fillText(sp.text, sp.x, sp.y);
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
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

/* ============================================================
 *  移动端触屏控制 & 响应式适配
 *  - 触摸按钮复用 keys 对象，不改动 handleInput 逻辑
 *  - 支持多点触控（一边移动一边射击）
 *  - Canvas 按屏幕尺寸等比缩放
 * ============================================================ */
(function () {
    'use strict';

    // --- 判断是否为移动端 / 触屏设备 ---
    const isTouchDevice = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches;

    // 触摸按钮 -> 键盘码 的映射
    const btnKeyMap = {
        'ArrowUp':    'ArrowUp',
        'ArrowDown':  'ArrowDown',
        'ArrowLeft':  'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        'Space':      'Space'
    };

    // 记录每个触摸点按下的按钮（支持多点）
    const touchBtnState = new Map(); // touchId -> { el, keyCode }

    function pressKey(keyCode) {
        if (!keyCode) return;
        keys[keyCode] = true;
    }
    function releaseKey(keyCode) {
        if (!keyCode) return;
        keys[keyCode] = false;
    }

    // 获取按钮元素对应的"键码"
    function getBtnKeyCode(el) {
        if (!el || !el.dataset) return null;
        const k = el.dataset.key;
        return btnKeyMap[k] || null;
    }

    // 给按钮添加视觉激活态
    function setBtnActive(el, active) {
        if (!el) return;
        if (active) el.classList.add('active');
        else el.classList.remove('active');
    }

    // 通过触摸点找到 target 所在的 dpad/action 按钮元素
    function findBtnFromTarget(target) {
        if (!target) return null;
        let el = target;
        for (let i = 0; i < 3; i++) {
            if (!el) return null;
            if (el.classList && (el.classList.contains('dpad-btn') || el.classList.contains('action-btn'))) {
                return el;
            }
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

            // 射击按钮特殊：非方向键但 data-key=Space
            // 暂停按钮：没有 data-key，单独处理
            if (btn.id === 'pauseBtn') {
                togglePause();
                // 短暂加个 active 视觉
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
        // 只有确实触摸到游戏按钮时才阻止默认行为，避免影响 startBtn/restartBtn 等的 click 合成
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
            // 如果手指移出了按钮区域，释放该按钮
            const target = document.elementFromPoint(t.clientX, t.clientY);
            const currentBtn = findBtnFromTarget(target);
            if (currentBtn !== state.el) {
                releaseKey(state.keyCode);
                setBtnActive(state.el, false);
                touchBtnState.delete(t.identifier);
                // 如果移到了其他按钮上，触发新按钮
                if (currentBtn && currentBtn.id !== 'pauseBtn') {
                    const kc = getBtnKeyCode(currentBtn);
                    if (kc) {
                        touchBtnState.set(t.identifier, { el: currentBtn, keyCode: kc });
                        setBtnActive(currentBtn, true);
                        pressKey(kc);
                    }
                }
            }
        }
        // 只有正在跟踪的游戏按钮触摸点才阻止滚动，避免影响页面其他区域的交互
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

    function handleTouchCancel(e) {
        if (!isTouchDevice) return;
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const state = touchBtnState.get(t.identifier);
            if (state) {
                releaseKey(state.keyCode);
                setBtnActive(state.el, false);
                touchBtnState.delete(t.identifier);
            }
        }
    }

    // 绑定触摸事件
    // - touchstart 只绑定在按钮容器上，避免在 body 上阻止 startBtn/restartBtn 的 click 合成
    // - touchmove/touchend/touchcancel 绑定在 document 上，跟踪手指移出容器的情况
    function bindTouchEvents() {
        const dpad = document.getElementById('touchDpad');
        const actions = document.getElementById('touchActions');
        const opts = { passive: false, capture: false };

        // touchstart 只在游戏按钮容器上监听（不绑定 body，保证 overlay 内按钮的 click 正常合成）
        if (dpad) dpad.addEventListener('touchstart', handleTouchStart, opts);
        if (actions) actions.addEventListener('touchstart', handleTouchStart, opts);

        // touchmove/touchend/touchcancel 在 document 上监听（用于手指滑出容器后继续跟踪）
        document.addEventListener('touchmove', handleTouchMove, opts);
        document.addEventListener('touchend', handleTouchEnd, opts);
        document.addEventListener('touchcancel', handleTouchCancel, opts);

        // 射击按钮也支持点按式 (click fallback 用于非 touch 调试)
        const fireBtn = document.getElementById('fireBtn');
        if (fireBtn) {
            fireBtn.addEventListener('click', () => {
                // 仅当非 touch 设备（pointer:fine）才用 click 触发
                if (!window.matchMedia('(pointer: coarse)').matches) {
                    pressKey('Space');
                    setTimeout(() => releaseKey('Space'), 60);
                }
            });
        }
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!window.matchMedia('(pointer: coarse)').matches) togglePause();
            });
        }
    }

    // --- Canvas 自适应缩放（保持 624x624 内部分辨率不变，仅 CSS 层缩放） ---
    function resizeCanvas() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        // 计算可用空间
        const isMobile = window.innerWidth <= 980 || window.matchMedia('(pointer: coarse)').matches;
        if (!isMobile) {
            // 桌面端：恢复默认
            canvas.style.width = '624px';
            canvas.style.height = '624px';
            return;
        }

        const infoHeight = 58; // info-panel 大概高度
        const isLandscape = window.innerWidth > window.innerHeight;
        let maxW, maxH;
        if (isLandscape) {
            // 横屏:左右两侧要给触摸控件留空间(dpad ~150px + actions ~110px + 边距)
            // 高度要扣除 info-panel + 上下边距
            maxW = Math.min(window.innerWidth - 280, CANVAS_W);
            maxH = Math.min(window.innerHeight - infoHeight - 20, CANVAS_H);
        } else {
            // 竖屏:宽度优先,高度多留点
            maxW = Math.min(window.innerWidth - 12, CANVAS_W);
            maxH = Math.min(window.innerHeight - infoHeight - 30, CANVAS_H);
        }
        // 保持正方形
        const size = Math.max(180, Math.min(maxW, maxH));
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        // overlay 的尺寸和位置完全交给 CSS 媒体查询管理(position: fixed + 居中)
        // 这里不再用 JS 覆盖,避免与 CSS 冲突导致位置错乱
    }

    // --- 竖屏提示：用 JS 兜底（部分浏览器媒体查询方向判断不准） ---
    function checkOrientation() {
        const mask = document.getElementById('portraitMask');
        if (!mask) return;
        if (!isTouchDevice && window.innerWidth > 980) {
            mask.classList.remove('visible');
            return;
        }
        const isPortrait = window.innerHeight > window.innerWidth;
        if (isPortrait && window.innerWidth <= 980) {
            mask.style.display = 'flex';
        } else {
            mask.style.display = 'none';
        }
    }

    // --- 初始化 ---
    function initMobile() {
        bindTouchEvents();
        resizeCanvas();
        checkOrientation();

        // 桌面端也把触屏控件隐藏（pointer:fine）
        if (!isTouchDevice && window.innerWidth > 980) {
            const d = document.getElementById('touchDpad');
            const a = document.getElementById('touchActions');
            if (d) d.style.display = 'none';
            if (a) a.style.display = 'none';
        }

        window.addEventListener('resize', () => {
            resizeCanvas();
            checkOrientation();
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => { resizeCanvas(); checkOrientation(); }, 250);
        });
        // iOS Safari 有时 orientationchange 后不会立即 resize
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

/* ===== 线上兼容性加固:竖屏遮罩关闭入口 + overlay 按钮 touchend 兜底 =====
 *  - 某些内置浏览器(微信/QQ/企业微信)方向传感器不准,portrait-mask 一直不消失
 *  - 给 portraitCloseBtn 绑定事件,允许用户手动关闭遮罩
 *  - 给 startBtn / restartBtn 再补一层 touchend 触发 click,覆盖移动端所有特殊环境
 * ======================================================================== */
(function () {
    const portraitMask = document.getElementById('portraitMask');
    const portraitCloseBtn = document.getElementById('portraitCloseBtn');
    if (portraitCloseBtn && portraitMask) {
        const closeMask = (e) => {
            portraitMask.style.display = 'none';
            // 记录到 sessionStorage,避免每次切方向都重新弹
            try { sessionStorage.setItem('portraitMaskDismissed', '1'); } catch (e) {}
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.preventDefault) e.preventDefault();
        };
        portraitCloseBtn.addEventListener('touchstart', closeMask, { passive: false, capture: true });
        portraitCloseBtn.addEventListener('click', closeMask);
    }
    // 如果用户之前已手动关闭过,直接初始隐藏
    try {
        if (sessionStorage.getItem('portraitMaskDismissed') === '1' && portraitMask) {
            portraitMask.style.display = 'none';
        }
    } catch (e) {}

    // overlay 按钮 touchend 兜底(用 touchend 直接触发 click,覆盖所有移动端)
    const startBtn2 = document.getElementById('startBtn');
    const restartBtn2 = document.getElementById('restartBtn');
    function addTouchendFallback(btn) {
        if (!btn) return;
        btn.addEventListener('touchend', (e) => {
            // 如果 touchstart 过程中没有被 preventDefault,浏览器通常会合成 click
            // 但某些内置浏览器(微信/支付宝小程序 webview)可能不合成,这里兜底
            e.preventDefault();   // 阻止可能的双重 click
            btn.click();           // 直接触发逻辑
        }, { passive: false, capture: true });
    }
    addTouchendFallback(startBtn2);
    addTouchendFallback(restartBtn2);
})();

// ===== 启动 =====
loop();
