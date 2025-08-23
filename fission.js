
// 示例关卡（提前声明）
const SIZE = 5;
const EMPTY = 0, CROSS = 1, XMON = 2;

// 示例关卡
const levels = [
    {
        maxSteps: 5,
        board: [
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, CROSS, EMPTY, XMON, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ],
        hp: [
            [0, 0, 0, 0, 0],
            [0, 2, 0, 2, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ]
    },
    {
        maxSteps: 5,
        board: [
            [EMPTY, EMPTY, CROSS, EMPTY, EMPTY],
            [EMPTY, XMON, EMPTY, CROSS, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ],
        hp: [
            [0, 0, 2, 0, 0],
            [0, 2, 0, 2, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ]
    }
];

let board = [];
let monsterHp = [];
let clickCount = 0;
let maxSteps = 0;
let laserEffectCells = [];
let history = [];
let curLevel = 0;
let mode = 'level'; // level, random, daily

function randomMonster(seed) {
    // 20%概率空格，40%十字怪，40%X怪
    const r = seed !== undefined ? seededRandom(seed) : Math.random();
    if (r < 0.2) return EMPTY;
    if (r < 0.6) return CROSS;
    return XMON;
}
function randomHp(seed) {
    return seed !== undefined ? Math.floor(seededRandom(seed) * 4) + 1 : Math.floor(Math.random() * 4) + 1;
}
// 简单的种子随机
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}
function initGame(level = 0, challengeMode = 'level') {
    mode = challengeMode;
    if (typeof level !== 'number' || !Number.isInteger(level)) {
        curLevel = 0;
    } else {
        curLevel = Math.max(0, Math.min(level, levels.length - 1));
    }

    clickCount = 0;
    laserEffectCells = [];
    history = [];
    if (mode === 'level') {
        if (!levels[curLevel]) {
            // 关卡不存在，弹出提示框
            alert(
                "关卡不存在！\n" +
                "当前关卡索引: " + curLevel + "\n" +
                "关卡总数: " + levels.length
            );
        } else {
            board = JSON.parse(JSON.stringify(levels[curLevel].board));
            monsterHp = JSON.parse(JSON.stringify(levels[curLevel].hp));
            maxSteps = levels[curLevel].maxSteps;
        }
    } else if (mode === 'random') {
        // 随机挑战
        board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
        monsterHp = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        let seed = Date.now();
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const type = randomMonster(seed + i * SIZE + j);
                board[i][j] = type;
                monsterHp[i][j] = type === EMPTY ? 0 : randomHp(seed + i * SIZE + j + 100);
            }
        }
        maxSteps = 20;
    } else if (mode === 'daily') {
        // 每日挑战，种子为日期
        board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
        monsterHp = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        let dateSeed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE; j++) {
                const type = randomMonster(dateSeed + i * SIZE + j);
                board[i][j] = type;
                monsterHp[i][j] = type === EMPTY ? 0 : randomHp(dateSeed + i * SIZE + j + 100);
            }
        }
        maxSteps = 20;
    }
    renderBoard();
    updateInfo();
}
function renderBoard() {
    const area = document.getElementById('game-area');
    area.innerHTML = '';
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            const cell = document.createElement('div');
            let cls = 'cell';
            if (board[i][j] === EMPTY) cls += ' empty';
            if (board[i][j] === CROSS) cls += ' cross';
            if (board[i][j] === XMON) cls += ' xmon';
            // 激光特效高亮
            if (laserEffectCells.some(([x, y]) => x === i && y === j)) {
                cls += ' laser';
            }
            cell.className = cls;
            if (board[i][j] === CROSS) cell.innerText = '+' + monsterHp[i][j];
            else if (board[i][j] === XMON) cell.innerText = 'X' + monsterHp[i][j];
            else cell.innerText = '';
            cell.onclick = () => handleClick(i, j);
            area.appendChild(cell);
        }
    }
    drawLasers();
    renderControls();
    updateInfo();
}
function handleClick(i, j) {
    if (board[i][j] === EMPTY) return;
    if (maxSteps > 0 && clickCount >= maxSteps) return;
    saveHistory();
    clickCount++;
    monsterHp[i][j]--;
    if (monsterHp[i][j] <= 0) {
        processDeath([[i, j]]);
    } else {
        renderBoard();
    }
}
function saveHistory() {
    // 保存当前状态
    history.push({
        board: JSON.parse(JSON.stringify(board)),
        monsterHp: JSON.parse(JSON.stringify(monsterHp)),
        clickCount: clickCount
    });
    // 限制历史长度
    if (history.length > 100) history.shift();
}

function undo() {
    if (history.length === 0) return;
    const last = history.pop();
    board = JSON.parse(JSON.stringify(last.board));
    monsterHp = JSON.parse(JSON.stringify(last.monsterHp));
    clickCount = last.clickCount;
    laserEffectCells = [];
    renderBoard();
    updateInfo();
}

function restartLevel() {
    initGame(curLevel, mode);
}
function processDeath(deadList) {
    // deadList: [[i,j], ...] 当前批次死亡怪物
    let laserTargets = [];
    let laserBeams = [];
    // 记录本批次死亡怪物
    let deadSet = new Set(deadList.map(([x, y]) => x + ',' + y));
    // 1. 发射激光
    deadList.forEach(([i, j]) => {
        if (board[i][j] === CROSS) {
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([di, dj], idx) => {
                let ni = i + di, nj = j + dj;
                let color = '#2196f3'; // 蓝色
                let start = [i, j];
                let end = null;
                while (ni >= 0 && ni < SIZE && nj >= 0 && nj < SIZE) {
                    if (board[ni][nj] !== EMPTY && !deadSet.has(ni + ',' + nj)) {
                        laserTargets.push([ni, nj]);
                        end = [ni, nj];
                        break;
                    }
                    ni += di; nj += dj;
                }
                if (!end) {
                    // 到边界
                    end = [
                        di === 0 ? i : (di > 0 ? SIZE - 1 : 0),
                        dj === 0 ? j : (dj > 0 ? SIZE - 1 : 0)
                    ];
                }
                laserBeams.push({ start, end, color });
            });
        } else if (board[i][j] === XMON) {
            [[-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(([di, dj], idx) => {
                let ni = i + di, nj = j + dj;
                let color = '#e53935'; // 红色
                let start = [i, j];
                let end = null;
                while (ni >= 0 && ni < SIZE && nj >= 0 && nj < SIZE) {
                    if (board[ni][nj] !== EMPTY && !deadSet.has(ni + ',' + nj)) {
                        laserTargets.push([ni, nj]);
                        end = [ni, nj];
                        break;
                    }
                    ni += di; nj += dj;
                }
                if (!end) {
                    // 到边界
                    end = [ni - di, nj - dj];
                }
                laserBeams.push({ start, end, color });
            });
        }
    });
    // 激光特效高亮
    laserEffectCells = laserTargets.slice();
    renderBoard();
    drawLasers(laserBeams);
    // 2. 激光结算（同一批次死亡怪物不吸收激光）
    let nextDead = [];
    setTimeout(() => {
        laserTargets.forEach(([i, j]) => {
            monsterHp[i][j]--;
            if (monsterHp[i][j] <= 0 && board[i][j] !== EMPTY && !deadSet.has(i + ',' + j)) {
                nextDead.push([i, j]);
            }
        });
        // 3. 清理死亡怪物
        deadList.forEach(([i, j]) => {
            board[i][j] = EMPTY;
            monsterHp[i][j] = 0;
        });
        laserEffectCells = [];
        renderBoard();
        drawLasers([]); // 清除激光
        // 4. 连锁递归
        if (nextDead.length > 0) {
            setTimeout(() => processDeath(nextDead), 400);
        }
    }, 350);
}
// 绘制激光线条
function drawLasers(beams) {
    const canvas = document.getElementById('laser-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!beams) return;
    // 计算每个格子的中心坐标
    const cellSize = 50, gap = 6, offset = 0;
    function cellCenter(i, j) {
        return [j * (cellSize + gap) + cellSize / 2 + offset, i * (cellSize + gap) + cellSize / 2 + offset];
    }
    beams.forEach(({ start, end, color }) => {
        const [x1, y1] = cellCenter(start[0], start[1]);
        const [x2, y2] = cellCenter(end[0], end[1]);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    });
}

function updateInfo() {
    let info = '';
    let status = '';
    const allCleared = board && board.length > 0 && board.flat().every(v => v === EMPTY);
    if (mode === 'level') {
        info = `关卡 ${curLevel + 1} / ${levels.length}　步数：${clickCount} / ${maxSteps}`;
    } else if (mode === 'random') {
        info = `随机挑战  步数：${clickCount} / ${maxSteps}`;
    } else if (mode === 'daily') {
        info = `每日挑战  步数：${clickCount} / ${maxSteps}`;
    }
    if (allCleared) {
        status = '🎉 恭喜通关！';
    } else if (maxSteps > 0 && clickCount >= maxSteps) {
        status = '❌ 步数已用尽，挑战失败';
    }
    document.getElementById('info').innerText = info + (status ? '\n' + status : '');
}
function renderControls() {
    let ctrl = document.getElementById('controls');
    if (!ctrl) {
        ctrl = document.createElement('div');
        ctrl.id = 'controls';
        ctrl.style.textAlign = 'center';
        ctrl.style.margin = '10px';
        document.body.insertBefore(ctrl, document.getElementById('info'));
    }
    let html = '';
    if (mode === 'level') {
        html += `<button onclick="restartLevel()">重玩本关</button> `;
        html += `<button onclick="undo()">撤销</button> `;
        html += `<button onclick="nextLevel()">下一关</button> `;
    } else {
        html += `<button onclick="restartLevel()">重玩</button> `;
        html += `<button onclick="undo()">撤销</button> `;
    }
    html += `<button onclick="initGame(0, 'level')">关卡模式</button> `;
    html += `<button onclick="initGame(0, 'random')">随机挑战</button> `;
    html += `<button onclick="initGame(0, 'daily')">每日挑战</button>`;
    ctrl.innerHTML = html;
}

function nextLevel() {
    if (curLevel + 1 < levels.length) {
        initGame(curLevel + 1, 'level');
    }
}


window.onload = initGame;
