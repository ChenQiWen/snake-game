// 游戏常量
const GRID_SIZE = 20; // 网格大小
const GAME_SPEED = {
    slow: 200,
    medium: 120,
    fast: 80
};

// 游戏变量
let canvas, ctx;
let snake = [];
let food = {};
let direction = 'right';
let nextDirection = 'right';
let gameInterval;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let isPaused = false;
let gameOver = true;
let currentSpeed = 'medium';

// DOM 元素
let startBtn, pauseBtn, speedSelect, scoreDisplay, highScoreDisplay;

// 初始化游戏
window.onload = function() {
    // 获取 DOM 元素
    canvas = document.getElementById('game-board');
    ctx = canvas.getContext('2d');
    startBtn = document.getElementById('start-btn');
    pauseBtn = document.getElementById('pause-btn');
    speedSelect = document.getElementById('speed');
    scoreDisplay = document.getElementById('score');
    highScoreDisplay = document.getElementById('high-score');
    
    // 设置事件监听器
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    pauseBtn.disabled = true;
    speedSelect.addEventListener('change', changeSpeed);
    document.addEventListener('keydown', handleKeyPress);
    
    // 显示最高分
    highScoreDisplay.textContent = highScore;
    
    // 绘制初始空白游戏板
    drawBoard();
};

// 开始游戏
function startGame() {
    if (!gameOver && !isPaused) return;
    
    // --- 新增：随机生成蛇的初始位置和方向 ---
    let startX, startY, startDirection;
    let snakeParts = [];
    let validStart = false;

    while (!validStart) {
        // 随机生成蛇头位置
        startX = Math.floor(Math.random() * (canvas.width / GRID_SIZE));
        startY = Math.floor(Math.random() * (canvas.height / GRID_SIZE));

        // 随机生成初始方向
        const directions = ['up', 'down', 'left', 'right'];
        startDirection = directions[Math.floor(Math.random() * directions.length)];

        // 根据方向和头部位置，计算蛇的初始身体部分
        snakeParts = [{ x: startX, y: startY }];
        let currentX = startX;
        let currentY = startY;

        // 假设初始长度为3
        for (let i = 0; i < 2; i++) {
            switch (startDirection) {
                case 'up':    currentY++; break;
                case 'down':  currentY--; break;
                case 'left':  currentX++; break;
                case 'right': currentX--; break;
            }
            snakeParts.push({ x: currentX, y: currentY });
        }

        // 检查蛇的所有部分是否都在游戏板内
        validStart = snakeParts.every(part =>
            part.x >= 0 && part.x < (canvas.width / GRID_SIZE) &&
            part.y >= 0 && part.y < (canvas.height / GRID_SIZE)
        );
    }
    // --- 随机生成结束 ---
    
    // 重置游戏状态
    snake = snakeParts;
    direction = startDirection;
    nextDirection = startDirection;
    score = 0;
    gameOver = false;
    isPaused = false;
    
    // 更新 UI
    scoreDisplay.textContent = score;
    startBtn.textContent = '重新开始';
    pauseBtn.disabled = false;
    
    // 生成第一个食物
    generateFood();
    
    // 清除之前的游戏循环
    if (gameInterval) clearInterval(gameInterval);
    
    // 开始游戏循环
    gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
}

// 游戏主循环
function gameLoop() {
    if (isPaused || gameOver) return;
    
    // 更新蛇的方向
    direction = nextDirection;
    
    // 移动蛇
    moveSnake();
    
    // 检查碰撞
    if (checkCollision()) {
        endGame();
        return;
    }
    
    // 检查是否吃到食物
    if (snake[0].x === food.x && snake[0].y === food.y) {
        eatFood();
    } else {
        // 如果没有吃到食物，移除蛇尾
        snake.pop();
    }
    
    // 绘制游戏
    drawBoard();
    drawSnake();
    drawFood();
}

// 移动蛇
function moveSnake() {
    const head = {x: snake[0].x, y: snake[0].y};
    
    // 根据方向移动蛇头
    switch(direction) {
        case 'up':
            head.y--;
            break;
        case 'down':
            head.y++;
            break;
        case 'left':
            head.x--;
            break;
        case 'right':
            head.x++;
            break;
    }
    
    // 将新的头部添加到蛇身体的前面
    snake.unshift(head);
}

// 检查碰撞
function checkCollision() {
    const head = snake[0];
    
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= canvas.width / GRID_SIZE ||
        head.y < 0 || head.y >= canvas.height / GRID_SIZE) {
        return true;
    }
    
    // 检查自身碰撞（从第二个身体部分开始检查）
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
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
}

// 吃食物
function eatFood() {
    // 增加分数
    score += 10;
    scoreDisplay.textContent = score;
    
    // 更新最高分
    if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
    
    // 生成新的食物
    generateFood();
}

// 游戏结束
function endGame() {
    gameOver = true;
    pauseBtn.disabled = true;
    clearInterval(gameInterval);
    
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

// 暂停/继续游戏
function togglePause() {
    if (gameOver) return;

    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';

    // 总是先清除现有的 interval
    clearInterval(gameInterval);

    if (!isPaused) {
        // 继续游戏循环
        gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
    } else {
        // 如果是暂停，则显示暂停信息
        // 显示暂停信息
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
    }
}

// 改变游戏速度
function changeSpeed() {
    currentSpeed = speedSelect.value;
    
    // 如果游戏正在运行，更新游戏循环速度
    if (!gameOver && !isPaused) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, GAME_SPEED[currentSpeed]);
    }
}

// 处理键盘输入
function handleKeyPress(event) {
    // 防止方向键和空格键滚动页面
    if ([37, 38, 39, 40, 65, 87, 68, 83, 32].includes(event.keyCode)) {
        event.preventDefault();
    }

    // 如果游戏结束，按任意键重新开始
    if (gameOver) {
        startGame();
        return;
    }

    // 空格键 - 暂停/继续
    if (event.keyCode === 32) {
        togglePause();
        return; // 处理完暂停后直接返回
    }

    // 如果游戏暂停，则忽略其他按键
    if (isPaused) return;

    // 根据按键设置下一个方向
    // 确保蛇不能直接掉头（例如，向右移动时不能直接向左转）
    switch(event.keyCode) {
        // 上箭头或 W
        case 38:
        case 87:
            if (direction !== 'down') nextDirection = 'up';
            break;
        // 下箭头或 S
        case 40:
        case 83:
            if (direction !== 'up') nextDirection = 'down';
            break;
        // 左箭头或 A
        case 37:
        case 65:
            if (direction !== 'right') nextDirection = 'left';
            break;
        // 右箭头或 D
        case 39:
        case 68:
            if (direction !== 'left') nextDirection = 'right';
            break;
    }
}

// 绘制游戏板
function drawBoard() {
    // 清除画布
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线（可选）
    ctx.strokeStyle = '#c8e6c9';
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