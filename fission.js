let board = [];
let monsterHp = [];
let size = 5;
let clickCount = 0;
let maxSteps = 0;
let laserEffectCells = [];
let history = [];
let curLevel = 0;
let mode = 'level'; // level, random, daily
let isProcessing = false;
let soundEnabled = false; // 音效开关，默认关

// 音效工具
function playSound(type, chain = 0) {
    if (!soundEnabled) return;
    const ctx = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    let freq = 440;
    let duration = 0.15;
    if (type === 'click') {
        freq = 320;
        duration = 0.08;
    } else if (type === 'kill') {
        freqlist=[261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
        freq = freqlist[Math.min(chain, freqlist.length - 1)];
        duration = 0.12;
    } else if (type === 'win') {
        freq = 880;
        duration = 0.5;
    }
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.2;
    o.start();
    o.stop(ctx.currentTime + duration);
    o.onended = () => ctx.close();
}

// 示例关卡（提前声明）
const EMPTY = 0, CROSS = 1, XMON = 2;

// 示例关卡
// 新关卡序列化格式：{size, maxSteps, board: ['0','C1','X3'...]}
const levels = [
    {
        size: 3,
        maxSteps: 2,
        board: [
            '0','0','0',
            'C2','0','C1',
            '0','0','0'
        ]
    },
    {
        size: 3,
        maxSteps: 1,
        board: [
            '0','0','0',
            'C2','C1','C1',
            '0','0','0'
        ]
    },
    {
        size: 3,
        maxSteps: 1,
        board: [
            'C1','C1','C4',
            'C1','C1','C1',
            'C4','C1','C1'
        ]
    },
    {
        size: 4,
        maxSteps: 1,
        board: [
            'C1','C1','0', 'C2',
            '0', 'C1','0', 'C2',
            '0', '0', '0', 'C2',
            'C2','C2','C2','C1'
        ]
    },
    {
        size: 4,
        maxSteps: 4,
        board: [
            'C1','C2','0', 'C2',
            '0', 'C2','C1','C2',
            '0', 'C4','C2','C3',
            'C3','C1','C2','C3'
        ]
    },
    {
        size: 4,
        maxSteps: 3,
        board: [
            'X1','C2','0', 'X1',
            '0', 'X2','0', '0',
            '0', '0', '0', '0',
            'C2','0', '0', '0'
        ]
    },
    {
        size: 5,
        maxSteps: 7,
        board: [
            'X2','X4','C2','C1','X3',
            'X3','C1','X2','X4','C1',
            '0', 'X2','0', 'X2','0',
            'C2','C3','X4','X3','X1',
            'X3','C3','0', 'C3','C1'
        ]
    }
];

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
            alert(
                "关卡不存在！\n" +
                "当前关卡索引: " + curLevel + "\n" +
                "关卡总数: " + levels.length
            );
        } else {
            size = levels[curLevel].size;
            maxSteps = levels[curLevel].maxSteps;
            // 反序列化关卡
            board = Array.from({ length: size }, (_, i) => Array(size).fill(EMPTY));
            monsterHp = Array.from({ length: size }, (_, i) => Array(size).fill(0));
            for (let idx = 0; idx < levels[curLevel].board.length; idx++) {
                const str = levels[curLevel].board[idx];
                const i = Math.floor(idx / size), j = idx % size;
                if (str === '0') {
                    board[i][j] = EMPTY;
                    monsterHp[i][j] = 0;
                } else if (str.startsWith('C')) {
                    board[i][j] = CROSS;
                    monsterHp[i][j] = parseInt(str.slice(1));
                } else if (str.startsWith('X')) {
                    board[i][j] = XMON;
                    monsterHp[i][j] = parseInt(str.slice(1));
                }
            }
        }
    } else if (mode === 'random') {
        size = 5;
        board = Array.from({ length: size }, () => Array(size).fill(EMPTY));
        monsterHp = Array.from({ length: size }, () => Array(size).fill(0));
        let seed = Date.now();
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const type = randomMonster(seed + i * size + j);
                board[i][j] = type;
                monsterHp[i][j] = type === EMPTY ? 0 : randomHp(seed + i * size + j + 100);
            }
        }
        maxSteps = 20;
    } else if (mode === 'daily') {
        size = 5;
        board = Array.from({ length: size }, () => Array(size).fill(EMPTY));
        monsterHp = Array.from({ length: size }, () => Array(size).fill(0));
        let dateSeed = parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const type = randomMonster(dateSeed + i * size + j);
                board[i][j] = type;
                monsterHp[i][j] = type === EMPTY ? 0 : randomHp(dateSeed + i * size + j + 100);
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
    // 动态设置棋盘网格
    area.style.gridTemplateColumns = `repeat(${size}, 50px)`;
    area.style.gridTemplateRows = `repeat(${size}, 50px)`;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
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
            if (board[i][j] === CROSS) cell.innerText = monsterHp[i][j];
            else if (board[i][j] === XMON) cell.innerText = monsterHp[i][j];
            else cell.innerText = '';
            cell.onclick = () => handleClick(i, j);
            area.appendChild(cell);
        }
    }
    drawLasers();
    renderControls();
    //updateInfo();
}
function handleClick(i, j) {
    if (isProcessing) return;
    if (board[i][j] === EMPTY) return;
    if (maxSteps > 0 && clickCount >= maxSteps) return;
    saveHistory();
    clickCount++;
    monsterHp[i][j]--;
    if (monsterHp[i][j] <= 0) {
        isProcessing = true;
        processDeath([[i, j]]);
    } else {
        playSound('click');
        renderBoard();
        updateInfo();
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
    // 去重处理
    const uniqueDeadList = Array.from(new Set(deadList.map(([x, y]) => x + ',' + y))).map(str => str.split(',').map(Number));
    let laserTargets = [];
    let laserBeams = [];
    let chainLevel = arguments[1] || 0;
    // 记录本批次死亡怪物
    let deadSet = new Set(uniqueDeadList.map(([x, y]) => x + ',' + y));
    // 1. 发射激光
    uniqueDeadList.forEach(([i, j]) => {
        if (board[i][j] === CROSS) {
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([di, dj], idx) => {
                let ni = i + di, nj = j + dj;
                let color = '#2196f3'; // 蓝色
                let start = [i, j];
                let end = null;
                while (ni >= 0 && ni < size && nj >= 0 && nj < size) {
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
                        di === 0 ? i : (di > 0 ? size - 1 : 0),
                        dj === 0 ? j : (dj > 0 ? size - 1 : 0)
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
                while (ni >= 0 && ni < size && nj >= 0 && nj < size) {
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
    // 播放击杀音效，音调随 chainLevel 递增
    if (uniqueDeadList.length > 0) playSound('kill', chainLevel);
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
        uniqueDeadList.forEach(([i, j]) => {
            board[i][j] = EMPTY;
            monsterHp[i][j] = 0;
        });
        laserEffectCells = [];
        renderBoard();
        drawLasers([]); // 清除激光
        // 4. 连锁递归
        if (nextDead.length > 0) {
            setTimeout(() => processDeath(nextDead, chainLevel + 1), 400);
        } else {
            isProcessing = false;
            updateInfo();
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
        playSound('win');
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
    html += `<button onclick="initGame(0, 'daily')">每日挑战</button> `;
    html += `<button onclick="toggleSound()">音效${soundEnabled ? '开' : '关'}</button> `;
    html += `<button onclick="exportLevel()">导出关卡</button> `;
    html += `<button onclick="importLevel()">加载关卡</button>`;
    ctrl.innerHTML = html;
}
// 导出当前关卡为文本
function exportLevel() {
    // 当前关卡对象
    const levelObj = {
        size,
        maxSteps,
        board: [].concat(...board.map((row, i) => row.map((v, j) => {
            if (v === EMPTY) return '0';
            if (v === CROSS) return 'C' + monsterHp[i][j];
            if (v === XMON) return 'X' + monsterHp[i][j];
        })))
    };
    const text = JSON.stringify(levelObj, null, 2);
    showTextDialog('关卡导出', text);
}

// 加载关卡
function importLevel() {
    showTextDialog('粘贴关卡数据', '', function(input) {
        try {
            const obj = JSON.parse(input);
            if (!obj.size || !obj.maxSteps || !Array.isArray(obj.board)) throw new Error('格式错误');
            // 加载到临时关卡
            levels.push(obj);
            initGame(levels.length - 1, 'level');
        } catch(e) {
            alert('解析失败: ' + e.message);
        }
    });
}

// 通用弹窗文本框
function showTextDialog(title, text, onConfirm) {
    const dlg = document.createElement('div');
    dlg.style.position = 'fixed';
    dlg.style.left = '0';
    dlg.style.top = '0';
    dlg.style.width = '100vw';
    dlg.style.height = '100vh';
    dlg.style.background = 'rgba(0,0,0,0.3)';
    dlg.style.zIndex = '9999';
    dlg.style.display = 'flex';
    dlg.style.alignItems = 'center';
    dlg.style.justifyContent = 'center';
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '20px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 2px 12px #888';
    box.style.minWidth = '320px';
    box.innerHTML = `<div style="font-size:18px;margin-bottom:10px;">${title}</div>`;
    const ta = document.createElement('textarea');
    ta.style.width = '100%';
    ta.style.height = '120px';
    ta.value = text;
    box.appendChild(ta);
    box.appendChild(document.createElement('br'));
    const btns = document.createElement('div');
    btns.style.textAlign = 'right';
    btns.style.marginTop = '10px';
    const btnOk = document.createElement('button');
    btnOk.innerText = onConfirm ? '确定' : '关闭';
    btnOk.onclick = function() {
        if (onConfirm) onConfirm(ta.value);
        document.body.removeChild(dlg);
    };
    btns.appendChild(btnOk);
    const btnCancel = document.createElement('button');
    btnCancel.innerText = '取消';
    btnCancel.style.marginLeft = '10px';
    btnCancel.onclick = function() {
        document.body.removeChild(dlg);
    };
    btns.appendChild(btnCancel);
    box.appendChild(btns);
    dlg.appendChild(box);
    document.body.appendChild(dlg);
    ta.focus();
    ta.select();
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    renderControls();
}

function nextLevel() {
    if (curLevel + 1 < levels.length) {
        initGame(curLevel + 1, 'level');
    }
}


window.onload = initGame;
