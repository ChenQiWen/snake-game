// =================================================================================
// 常量定义 (Constants)
// =================================================================================

const GRID_SIZE = 20; // 每个网格的大小（像素）
const GAME_SPEED = {
    slow: 200,
    medium: 120,
    fast: 80
};
const FOOD_TYPES = {
    NORMAL: { color: '#F44336', score: 10 },
    BONUS: { color: '#FFC107', score: 50 },
    SPEED_UP: { color: '#03A9F4', score: 10, speedMultiplier: 0.7, duration: 5000 },
    SLOW_DOWN: { color: '#9E9E9E', score: 10, speedMultiplier: 1.3, duration: 5000 },
    INVINCIBLE: { color: '#FFD700', score: 20, duration: 5000 }
};
const KEY_CODES = {
    SPACE: 32,
    LEFT_ARROW: 37, UP_ARROW: 38, RIGHT_ARROW: 39, DOWN_ARROW: 40,
    A: 65, W: 87, D: 68, S: 83
};
const BOARD_SHRINK_THRESHOLDS = [100, 250, 500];

// =================================================================================
// 游戏状态变量 (Game State Variables)
// =================================================================================

let canvas, ctx;
let snake = [];
let food = {};
let invincibilityFood = null; // 新增：无敌道具
let direction = 'right';
let nextDirection = 'right';
let gameInterval;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let isPaused = false;
let gameOver = true;
let isCountingDown = false;
let currentSpeed = 'medium';
let isInvincible = false; // 新增：无敌状态
let invincibilityTimer; // 新增：无敌计时器
let speedBoostTimeout;
let shrinkLevel = 0;
let obstacles = [];

let startBtn, pauseBtn, speedSelect, scoreDisplay, highScoreDisplay;
let eatSound, gameOverSound, clickSound;

// =================================================================================
// 初始化与事件监听 (Initialization & Event Listeners)
// =================================================================================

window.onload = function() {
    // 获取并设置 DOM 元素
    setupDOMElements();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 显示最高分
    highScoreDisplay.textContent = highScore;

    // 根据窗口大小调整画布，并显示开始画面
    resizeCanvas();
};

/**
 * 获取所有需要的 DOM 元素
 */
function setupDOMElements() {
    canvas = document.getElementById('game-board');
    ctx = canvas.getContext('2d');
    startBtn = document.getElementById('start-btn');
    pauseBtn = document.getElementById('pause-btn');
    speedSelect = document.getElementById('speed');
    scoreDisplay = document.getElementById('score');
    highScoreDisplay = document.getElementById('high-score');
    eatSound = document.getElementById('eat-sound');
    gameOverSound = document.getElementById('game-over-sound');
    clickSound = document.getElementById('click-sound');
}

/**
 * 设置所有的事件监听器
 */
function setupEventListeners() {
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    pauseBtn.disabled = true;
    speedSelect.addEventListener('change', changeSpeed);
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // 初始加载时调整一次尺寸
};

// 新增：调整画布尺寸
function resizeCanvas() {
    const uiContainer = document.querySelector('.ui-container');
    const uiHeight = uiContainer ? uiContainer.offsetHeight : 0;

    // 让画布填充窗口的剩余空间，同时保持网格的整数倍
    const width = Math.floor(window.innerWidth / GRID_SIZE) * GRID_SIZE;
    const height = Math.floor((window.innerHeight - uiHeight) / GRID_SIZE) * GRID_SIZE;
    
    canvas.width = width;
    canvas.height = height;

    // 重新绘制游戏板（如果游戏未开始，则绘制开始画面）
    if (gameOver) {
        showStartScreen();
    } else {
        drawBoard();
        drawSnake();
        drawFood();
        if (invincibilityFood) drawInvincibilityFood();
    }
}

// =================================================================================
// 游戏主流程 (Main Game Flow)
// =================================================================================

function updateUI() {
    scoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    startBtn.textContent = gameOver ? '开始游戏' : '重新开始';
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    pauseBtn.disabled = gameOver || isCountingDown;
}

/**
 * 开始一个新游戏
 */
function startGame() {
    // 防止在游戏进行中或倒计时中重复开始
    if (isCountingDown || (!gameOver && !isPaused)) return;
    
    isCountingDown = true;
    
    // 初始化蛇的位置和方向
    initializeSnake();
    
    // 重置游戏核心状态
    resetGameState();
    
    // 更新 UI 元素
    updateUI();
    
    // 生成障碍物和食物
    generateObstacles();
    generateFood();
    
    // 清除之前的游戏循环
    if (gameInterval) clearInterval(gameInterval);
    
    // 开始游戏前的倒计时
    runCountdown();
}

/**
 * 初始化蛇的身体、位置和方向
 */
function initializeSnake() {
    let startX, startY, startDirection;
    let snakeParts = [];
    let validStart = false;

    // 循环直到找到一个有效的出生点（完全在画布内）
    while (!validStart) {
        startX = Math.floor(Math.random() * (canvas.width / GRID_SIZE));
        startY = Math.floor(Math.random() * (canvas.height / GRID_SIZE));
        const directions = ['up', 'down', 'left', 'right'];
        startDirection = directions[Math.floor(Math.random() * directions.length)];

        snakeParts = [{ x: startX, y: startY }];
        let currentX = startX;
        let currentY = startY;

        // 创建初始长度为3的蛇
        for (let i = 0; i < 2; i++) {
            switch (startDirection) {
                case 'up':    currentY++; break;
                case 'down':  currentY--; break;
                case 'left':  currentX++; break;
                case 'right': currentX--; break;
            }
            snakeParts.push({ x: currentX, y: currentY });
        }

        validStart = snakeParts.every(part =>
            part.x >= 0 && part.x < (canvas.width / GRID_SIZE) &&
            part.y >= 0 && part.y < (canvas.height / GRID_SIZE)
        );
    }
    
    snake = snakeParts;
    direction = startDirection;
    nextDirection = startDirection;
}

/**
 * 重置游戏状态变量
 */
function resetGameState() {
    if (speedBoostTimeout) clearTimeout(speedBoostTimeout);
    score = 0;
    gameOver = false;
    isPaused = false;
    isInvincible = false;
    invincibilityFood = null;
    clearTimeout(invincibilityTimer);
}

/**
 * 运行游戏开始前的倒计时
 */
function runCountdown() {
    let countdown = 3;

    const countdownLoop = () => {
        // 在倒计时的每一秒都重绘游戏画面
        drawGame();
        
        if (countdown > 0) {
            drawCountdown(countdown);
            countdown--;
            setTimeout(countdownLoop, 1000);
        } else {
            drawCountdown('Go!');
            // "Go!" 显示半秒后正式开始游戏
            setTimeout(() => {
                isCountingDown = false;
                gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
            }, 500);
        }
    };
    countdownLoop();
}

/**
 * 游戏主循环，每一帧都会执行
 */
function gameLoop() {
    if (isPaused || gameOver) return;
    
    direction = nextDirection;
    
    moveSnake();
    
    if (checkCollision()) {
        endGame();
        return;
    }
    
    if (isEatingFood()) {
        eatFood();
    } else {
        snake.pop(); // 如果没吃到食物，蛇尾缩短一格
    }

    // 检查是否吃到无敌道具
    if (invincibilityFood && snake[0].x === invincibilityFood.x && snake[0].y === invincibilityFood.y) {
        eatInvincibilityFood();
    }
    
    // 绘制游戏
    drawBoard();
    drawObstacles();
    drawSnake();
    drawFood();
    if (invincibilityFood) drawInvincibilityFood();
}



// =================================================================================
// 蛇与食物逻辑 (Snake & Food Logic)
// =================================================================================

/**
 * 移动蛇的位置
 */
function moveSnake() {
    const head = {x: snake[0].x, y: snake[0].y};
    
    switch(direction) {
        case 'up':    head.y--; break;
        case 'down':  head.y++; break;
        case 'left':  head.x--; break;
        case 'right': head.x++; break;
    }
    
    snake.unshift(head);
}

/**
 * 检查蛇头是否与任何物体发生碰撞
 * @returns {boolean} - 如果发生碰撞则返回 true
 */
function checkCollision() {
    if (isInvincible) return false; // 如果无敌，则不检查碰撞

    const head = snake[0];
    
    // 墙壁碰撞
    if (head.x < shrinkLevel || head.x >= canvas.width / GRID_SIZE - shrinkLevel ||
        head.y < shrinkLevel || head.y >= canvas.height / GRID_SIZE - shrinkLevel) {
        return true;
    }
    
    // 自身碰撞
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }

    // 障碍物碰撞
    for (let o of obstacles) {
        if (head.x === o.x && head.y === o.y) {
            return true;
        }
    }
    
    return false;
}

// 生成食物
function generateFood() {
    // 随机生成食物位置
    let newFood;
    let foodOnSnake;
    
    do {
        foodOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / GRID_SIZE)),
            y: Math.floor(Math.random() * (canvas.height / GRID_SIZE))
        };
        
        // 确保食物不会生成在蛇身上
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                foodOnSnake = true;
                break;
            }
        }
    } while (foodOnSnake);
    
    food = newFood;

    // 每100分，有几率生成一个无敌道具
    if (score > 0 && score % 100 === 0 && !invincibilityFood) {
        generateInvincibilityFood();
    }
}

// 新增：生成无敌道具
function generateInvincibilityFood() {
    let newFood;
    let foodOnSnake;
    
    do {
        foodOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / GRID_SIZE)),
            y: Math.floor(Math.random() * (canvas.height / GRID_SIZE))
        };
        
        // 确保道具不会生成在蛇身上或普通食物上
        if (newFood.x === food.x && newFood.y === food.y) {
            foodOnSnake = true;
            continue;
        }
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                foodOnSnake = true;
                break;
            }
        }
    } while (foodOnSnake);
    
    invincibilityFood = newFood;
}


function isEatingFood() {
    const head = snake[0];
    return head.x === food.x && head.y === food.y;
}


// 吃食物
function eatFood() {
    playSound(eatSound);
    const foodType = FOOD_TYPES[food.type] || FOOD_TYPES.NORMAL;

    // 增加分数并更新显示
    score += foodType.score;
    
    // 检查并更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
    }

    updateUI();

    // 应用食物的特殊效果
    applyFoodEffect(foodType);

    // 检查是否达到缩小边界的分数
    checkAndShrinkBoard();
    
    // 生成新的食物
    generateFood();
}

function checkAndShrinkBoard() {
    const newShrinkLevel = BOARD_SHRINK_THRESHOLDS.filter(t => score >= t).length;
    if (newShrinkLevel > shrinkLevel) {
        shrinkLevel = newShrinkLevel;
    }
}

// 新增：吃无敌道具
function eatInvincibilityFood() {
    playSound(eatSound);
    invincibilityFood = null;
    isInvincible = true;

    // 清除之前的计时器
    clearTimeout(invincibilityTimer);

    // 5秒后恢复正常
    invincibilityTimer = setTimeout(() => {
        isInvincible = false;
    }, 5000);
}


// 游戏结束
function endGame() {
    playSound(gameOverSound);
    if (speedBoostTimeout) clearTimeout(speedBoostTimeout);
    clearTimeout(invincibilityTimer);
    gameOver = true;
    isInvincible = false;
    clearInterval(gameInterval);
    updateUI();

    // 绘制游戏结束信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 15);

    ctx.font = '20px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
}

/**
 * 应用食物的特殊效果
 * @param {object} foodType - 食物类型对象
 */
function applyFoodEffect(foodType) {
    if (food.type === 'SPEED_UP' || food.type === 'SLOW_DOWN') {
        if (speedBoostTimeout) clearTimeout(speedBoostTimeout);
        
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed] * foodType.speedMultiplier);
        
        speedBoostTimeout = setTimeout(() => {
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
        }, foodType.duration);
    } else if (food.type === 'INVINCIBLE') {
        isInvincible = true;
        if (invincibilityTimer) clearTimeout(invincibilityTimer);
        invincibilityTimer = setTimeout(() => {
            isInvincible = false;
        }, foodType.duration);
    }
}

// =================================================================================
// 生成逻辑 (Generation Logic)
// =================================================================================

/**
 * 在随机位置生成障碍物
 */
function generateObstacles() {
    obstacles = [];
    const numberOfObstacles = 5 + Math.floor(score / 100);
    for (let i = 0; i < numberOfObstacles; i++) {
        let obstacle;
        let isInvalidPosition;
        do {
            isInvalidPosition = false;
            obstacle = {
                x: Math.floor(Math.random() * (canvas.width / GRID_SIZE - shrinkLevel * 2)) + shrinkLevel,
                y: Math.floor(Math.random() * (canvas.height / GRID_SIZE - shrinkLevel * 2)) + shrinkLevel
            };
            
            // 检查新位置是否与蛇或现有障碍物重叠
            if (isPositionOccupied(obstacle, snake) || isPositionOccupied(obstacle, obstacles)) {
                isInvalidPosition = true;
            }
        } while (isInvalidPosition);
        obstacles.push(obstacle);
    }
}

/**
 * 在随机位置生成食物
 */
function generateFood() {
    let newFood;
    let isInvalidPosition;
    
    do {
        isInvalidPosition = false;
        newFood = {
            x: Math.floor(Math.random() * (canvas.width / GRID_SIZE - shrinkLevel * 2)) + shrinkLevel,
            y: Math.floor(Math.random() * (canvas.height / GRID_SIZE - shrinkLevel * 2)) + shrinkLevel
        };
        
        // 检查新位置是否与蛇或障碍物重叠
        if (isPositionOccupied(newFood, snake) || isPositionOccupied(newFood, obstacles)) {
            isInvalidPosition = true;
        }
    } while (isInvalidPosition);

    // 随机决定食物类型
    const rand = Math.random();
    if (rand < 0.60) newFood.type = 'NORMAL';
    else if (rand < 0.75) newFood.type = 'BONUS';
    else if (rand < 0.85) newFood.type = 'SPEED_UP';
    else if (rand < 0.95) newFood.type = 'SLOW_DOWN';
    else newFood.type = 'INVINCIBLE';
    
    food = newFood;
}

/**
 * 检查给定位置是否被一个数组中的任何元素占据
 * @param {{x: number, y: number}} position - 要检查的位置
 * @param {Array<{x: number, y: number}>} occupiedArray - 占据位置的数组
 * @returns {boolean}
 */
function isPositionOccupied(position, occupiedArray) {
    if (position.x < shrinkLevel || position.x >= canvas.width / GRID_SIZE - shrinkLevel ||
        position.y < shrinkLevel || position.y >= canvas.height / GRID_SIZE - shrinkLevel) {
        return true;
    }
    return occupiedArray.some(item => item.x === position.x && item.y === position.y);
}

// =================================================================================
// 绘图函数 (Drawing Functions)
// =================================================================================

/**
 * 绘制所有游戏元素
 */
function drawGame() {
    drawBoard();
    drawObstacles();
    drawSnake();
    drawFood();
}

/**
 * 绘制游戏背景和网格
 */
function drawBoard() {
    // 根据分数动态改变背景颜色
    const hue = (130 + score * 2) % 360;
    const backgroundColor = `hsl(${hue}, 90%, 95%)`;
    
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制缩小的边界
    if (shrinkLevel > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, shrinkLevel * GRID_SIZE);
        ctx.fillRect(0, 0, shrinkLevel * GRID_SIZE, canvas.height);
        ctx.fillRect(canvas.width - shrinkLevel * GRID_SIZE, 0, shrinkLevel * GRID_SIZE, canvas.height);
        ctx.fillRect(0, canvas.height - shrinkLevel * GRID_SIZE, canvas.width, shrinkLevel * GRID_SIZE);
    }

    // 绘制网格线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

/**
 * 绘制障碍物
 */
function drawObstacles() {
    ctx.fillStyle = '#5D4037';
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    obstacles.forEach(o => {
        ctx.fillRect(o.x * GRID_SIZE, o.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        ctx.strokeRect(o.x * GRID_SIZE, o.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    });
}

/**
 * 绘制蛇
 */
function drawSnake() {
    snake.forEach((segment, index) => {
        if (isInvincible) {
            const hue = (Date.now() / 10 + index * 20) % 360;
            ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
        } else {
            ctx.fillStyle = index === 0 ? '#388E3C' : '#4CAF50';
        }
        roundRect(ctx, segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE, 5, true);
        
        // 只为蛇头绘制眼睛
        if (index === 0) {
            drawSnakeEyes(segment);
        }
    });
}

/**
 * 绘制蛇的眼睛
 * @param {{x: number, y: number}} head - 蛇头的位置
 */
function drawSnakeEyes(head) {
    ctx.fillStyle = 'white';
    const eyeSize = GRID_SIZE / 5;
    const eyeOffset = GRID_SIZE / 3;
    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

    switch(direction) {
        case 'up':
            leftEyeX = head.x * GRID_SIZE + eyeOffset;
            leftEyeY = head.y * GRID_SIZE + eyeOffset;
            rightEyeX = head.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            rightEyeY = head.y * GRID_SIZE + eyeOffset;
            break;
        case 'down':
            leftEyeX = head.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            leftEyeY = head.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            rightEyeX = head.x * GRID_SIZE + eyeOffset;
            rightEyeY = head.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            break;
        case 'left':
            leftEyeX = head.x * GRID_SIZE + eyeOffset;
            leftEyeY = head.y * GRID_SIZE + eyeOffset;
            rightEyeX = head.x * GRID_SIZE + eyeOffset;
            rightEyeY = head.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            break;
        case 'right':
            leftEyeX = head.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            leftEyeY = head.y * GRID_SIZE + eyeOffset;
            rightEyeX = head.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            rightEyeY = head.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
            break;
    }
    ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
    ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
}

/**
 * 绘制食物
 */
function drawFood() {
    const foodType = FOOD_TYPES[food.type] || FOOD_TYPES.NORMAL;
    ctx.fillStyle = foodType.color;
    
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE / 3, food.y * GRID_SIZE + GRID_SIZE / 3, GRID_SIZE / 6, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * 绘制各种覆盖层（开始、结束、暂停、倒计时）
 */
function drawOverlay(text, subtext = '') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    if (subtext) {
        ctx.font = '30px Arial';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 15);
        ctx.font = '20px Arial';
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 20);
    } else {
        ctx.font = '40px Arial';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
}

function showStartScreen() {
    drawBoard();
    drawOverlay('贪吃蛇', '按任意键开始游戏');
}

function drawGameOverScreen() {
    drawOverlay('游戏结束!', `最终得分: ${score}`);
}

function drawPausedScreen() {
    drawOverlay('已暂停');
}

function drawCountdown(text) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '80px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 30);
}

// =================================================================================
// 用户输入与控制 (User Input & Controls)
// =================================================================================

/**
 * 处理键盘按键事件
 * @param {KeyboardEvent} event
 */
function handleKeyPress(event) {
    // 阻止方向键和空格键的默认行为（如滚动页面）
    if (Object.values(KEY_CODES).includes(event.keyCode)) {
        event.preventDefault();
    }

    if (gameOver) {
        startGame();
        return;
    }

    if (event.keyCode === KEY_CODES.SPACE) {
        togglePause();
        return;
    }

    if (isPaused || isCountingDown) return;

    playSound(clickSound);

    const newDirection = getDirectionFromKey(event.keyCode);
    if (isValidDirectionChange(newDirection)) {
        nextDirection = newDirection;
    }
}

/**
 * 根据按键码返回方向字符串
 * @param {number} keyCode
 * @returns {string|null}
 */
function getDirectionFromKey(keyCode) {
    switch(keyCode) {
        case KEY_CODES.UP_ARROW: case KEY_CODES.W: return 'up';
        case KEY_CODES.DOWN_ARROW: case KEY_CODES.S: return 'down';
        case KEY_CODES.LEFT_ARROW: case KEY_CODES.A: return 'left';
        case KEY_CODES.RIGHT_ARROW: case KEY_CODES.D: return 'right';
        default: return null;
    }
}

/**
 * 检查是否是有效的方向改变（不能180度掉头）
 * @param {string} newDirection
 * @returns {boolean}
 */
function isValidDirectionChange(newDirection) {
    if (!newDirection) return false;
    return (direction === 'up' && newDirection !== 'down') ||
           (direction === 'down' && newDirection !== 'up') ||
           (direction === 'left' && newDirection !== 'right') ||
           (direction === 'right' && newDirection !== 'left');
}

/**
 * 切换暂停状态
 */
function togglePause() {
    if (gameOver || isCountingDown) return;

    isPaused = !isPaused;
    updateUI();

    clearInterval(gameInterval);

    if (isPaused) {
        drawPausedScreen();
    } else {
        gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
    }
}

/**
 * 改变游戏速度
 */
function changeSpeed() {
    currentSpeed = speedSelect.value;
    
    if (!gameOver && !isPaused) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
    }
}

// =================================================================================
// 工具函数 (Utility Functions)
// =================================================================================

/**
 * 播放音效
 * @param {HTMLAudioElement} sound
 */
function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => {
            console.error("音频播放失败:", error);
        });
    }
}

/**
 * 动态调整画布大小以适应窗口
 */
function resizeCanvas() {
    const uiContainer = document.querySelector('.ui-container');
    const uiHeight = uiContainer ? uiContainer.offsetHeight : 0;

    const width = Math.floor(window.innerWidth / GRID_SIZE) * GRID_SIZE;
    const height = Math.floor((window.innerHeight - uiHeight) / GRID_SIZE) * GRID_SIZE;
    
    canvas.width = width;
    canvas.height = height;

    if (gameOver) {
        showStartScreen();
    } else {
        drawGame();
    }
}

// 绘制游戏板
function drawBoard() {
    // --- 新增：根据分数计算背景颜色 ---
    // 使用 HSL 颜色模型，通过改变色相来实现渐变
    // 色相值从 0 到 360，这里我们让它随分数循环变化
    // 初始色相（绿色系）
    const baseHue = 130; 
    // 分数越高，色相变化越大
    const hue = (baseHue + score * 2) % 360;
    const saturation = 90; // 饱和度
    const lightness = 95;  // 亮度 (保持一个较高的亮度，使背景看起来比较柔和)
    
    const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    // --- 背景颜色计算结束 ---

    // 清除画布
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线（可选）
    // 为了让网格线在不同背景下都可见，可以给它一个半透明的深色
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 绘制蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        // 如果无敌，蛇会闪烁
        if (isInvincible) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
        }
        
        // 蛇头使用深绿色，身体使用绿色
        ctx.fillStyle = index === 0 ? '#388E3C' : '#4CAF50';
        
        // 绘制圆角矩形作为蛇的身体部分
        roundRect(
            ctx,
            segment.x * GRID_SIZE,
            segment.y * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE,
            5,
            true
        );
        
        // 恢复透明度
        ctx.globalAlpha = 1.0;

        // 为蛇头添加眼睛
        if (index === 0) {
            ctx.fillStyle = 'white';
            
            // 根据方向绘制眼睛
            const eyeSize = GRID_SIZE / 5;
            const eyeOffset = GRID_SIZE / 3;
            
            // 左眼
            let leftEyeX, leftEyeY;
            // 右眼
            let rightEyeX, rightEyeY;
            
            switch(direction) {
                case 'up':
                    leftEyeX = segment.x * GRID_SIZE + eyeOffset;
                    leftEyeY = segment.y * GRID_SIZE + eyeOffset;
                    rightEyeX = segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    rightEyeY = segment.y * GRID_SIZE + eyeOffset;
                    break;
                case 'down':
                    leftEyeX = segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    leftEyeY = segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    rightEyeX = segment.x * GRID_SIZE + eyeOffset;
                    rightEyeY = segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    break;
                case 'left':
                    leftEyeX = segment.x * GRID_SIZE + eyeOffset;
                    leftEyeY = segment.y * GRID_SIZE + eyeOffset;
                    rightEyeX = segment.x * GRID_SIZE + eyeOffset;
                    rightEyeY = segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    break;
                case 'right':
                    leftEyeX = segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    leftEyeY = segment.y * GRID_SIZE + eyeOffset;
                    rightEyeX = segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    rightEyeY = segment.y * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize;
                    break;
            }
            
            ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
            ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
        }
    });
}

// 绘制食物
function drawFood() {
    ctx.fillStyle = '#F44336'; // 红色食物
    
    // 绘制圆形食物
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 3,
        food.y * GRID_SIZE + GRID_SIZE / 3,
        GRID_SIZE / 6,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 新增：绘制无敌道具
function drawInvincibilityFood() {
    const x = invincibilityFood.x * GRID_SIZE + GRID_SIZE / 2;
    const y = invincibilityFood.y * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 2;
    
    // 绘制一个闪烁的星星
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Date.now() / 500); // 旋转
    
    ctx.fillStyle = `hsl(${Date.now() / 10 % 360}, 100%, 50%)`; // 彩虹色
    ctx.strokeStyle = 'gold';
    ctx.lineWidth = 2;
    
    drawStar(0, 0, 5, radius, radius / 2);
    
    ctx.restore();
}

// 新增：绘制星星的辅助函数
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}


// 辅助函数：绘制圆角矩形
function roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}
