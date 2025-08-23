const SIZE = 5;
const EMPTY = 0, CROSS = 1, XMON = 2;
let board = [];
let monsterHp = [];
let clickCount = 0;
let laserEffectCells = [];

function randomMonster() {
    // 20%概率空格，40%十字怪，40%X怪
    const r = Math.random();
    if (r < 0.2) return EMPTY;
    if (r < 0.6) return CROSS;
    return XMON;
}
function randomHp() {
    return Math.floor(Math.random() * 3) + 2; // 2~4
}
function initGame() {
    board = Array.from({length: SIZE}, () => Array(SIZE).fill(EMPTY));
    monsterHp = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    clickCount = 0;
    laserEffectCells = [];
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE; j++) {
            const type = randomMonster();
            board[i][j] = type;
            monsterHp[i][j] = type === EMPTY ? 0 : randomHp();
        }
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
}
function handleClick(i, j) {
    if (board[i][j] === EMPTY) return;
    clickCount++;
    updateInfo();
    monsterHp[i][j]--;
    if (monsterHp[i][j] <= 0) {
        processDeath([[i, j]]);
    } else {
        renderBoard();
    }
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
            [[-1,0],[1,0],[0,-1],[0,1]].forEach(([di, dj], idx) => {
                let ni = i + di, nj = j + dj;
                let color = '#2196f3'; // 蓝色
                let start = [i, j];
                let end = null;
                while (ni >= 0 && ni < SIZE && nj >= 0 && nj < SIZE) {
                    if (board[ni][nj] !== EMPTY && !deadSet.has(ni+','+nj)) {
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
                laserBeams.push({start, end, color});
            });
        } else if (board[i][j] === XMON) {
            [[-1,-1],[1,1],[-1,1],[1,-1]].forEach(([di, dj], idx) => {
                let ni = i + di, nj = j + dj;
                let color = '#e53935'; // 红色
                let start = [i, j];
                let end = null;
                while (ni >= 0 && ni < SIZE && nj >= 0 && nj < SIZE) {
                    if (board[ni][nj] !== EMPTY && !deadSet.has(ni+','+nj)) {
                        laserTargets.push([ni, nj]);
                        end = [ni, nj];
                        break;
                    }
                    ni += di; nj += dj;
                }
                if (!end) {
                    // 到边界
                    end = [ni-di, nj-dj];
                }
                laserBeams.push({start, end, color});
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
            if (monsterHp[i][j] <= 0 && board[i][j] !== EMPTY && !deadSet.has(i+','+j)) {
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
    beams.forEach(({start, end, color}) => {
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
    document.getElementById('info').innerText = `有效点击次数：${clickCount}`;
}

window.onload = initGame;
