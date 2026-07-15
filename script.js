const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

const canvas = document.querySelector('#snake-canvas');
const scoreValue = document.querySelector('#score-value');
const bestValue = document.querySelector('#best-value');
const statusValue = document.querySelector('#game-status');
const startBtn = document.querySelector('#start-btn');
const pauseBtn = document.querySelector('#pause-btn');
const restartBtn = document.querySelector('#restart-btn');
const controlButtons = document.querySelectorAll('[data-direction], [data-action="pause"]');
const overlay = document.querySelector('#game-overlay');

if (canvas && scoreValue && bestValue && statusValue && startBtn && pauseBtn && restartBtn) {
  const ctx = canvas.getContext('2d');
  const gridSize = 20;
  const cellCount = 20;
  const storageKey = 'alldemelona-snake-best';
  const colors = {
    background: '#fffafc',
    grid: 'rgba(63, 47, 42, 0.05)',
    snake: '#ff8fb1',
    snakeHead: '#ff6f9f',
    food: '#8ecae6',
    enemy: '#b38bff',
    foodGlow: 'rgba(142, 202, 230, 0.35)',
    enemyGlow: 'rgba(179, 139, 255, 0.28)',
    text: '#3f2f2a',
  };

  let snake = [];
  let currentDirection = { x: 1, y: 0 };
  let queuedDirection = null;
  let food = { x: 0, y: 0 };
  let enemy = { x: 0, y: 0 };
  let score = 0;
  let bestScore = Number(localStorage.getItem(storageKey) || '0');
  let state = 'idle';
  let timerId = null;
  let tickCount = 0;
  let lastRenderScale = 1;

  bestValue.textContent = String(bestScore);

  function fitCanvas() {
    const parentSize = Math.min(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    const size = Math.max(280, parentSize);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastRenderScale = size / cellCount;
    draw();
  }

  function randomCell(exclusions = []) {
    let candidate;
    do {
      candidate = {
        x: Math.floor(Math.random() * cellCount),
        y: Math.floor(Math.random() * cellCount),
      };
    } while (
      snake.some((part) => part.x === candidate.x && part.y === candidate.y) ||
      exclusions.some((part) => part.x === candidate.x && part.y === candidate.y)
    );
    return candidate;
  }

  function resetGame(message = '시작 버튼을 눌러 주세요.') {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    currentDirection = { x: 1, y: 0 };
    queuedDirection = null;
    score = 0;
    tickCount = 0;
    enemy = randomCell();
    food = randomCell([enemy]);
    state = 'idle';
    stopLoop();
    updateHUD(message);
    draw();
  }

  function updateHUD(message) {
    scoreValue.textContent = String(score);
    bestValue.textContent = String(bestScore);
    statusValue.textContent = message;
    if (overlay) {
      overlay.hidden = false;
    }
  }

  function hideOverlay() {
    if (overlay) {
      overlay.hidden = false;
    }
  }

  function showOverlay(message) {
    updateHUD(message);
  }

  function startLoop() {
    stopLoop();
    timerId = window.setInterval(tick, 140);
  }

  function stopLoop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function queueDirection(next) {
    if (!next) return;
    if (isOpposite(next, currentDirection)) return;
    if (queuedDirection && isOpposite(next, queuedDirection)) return;
    queuedDirection = next;
  }

  function setState(nextState, message) {
    state = nextState;
    if (message) {
      statusValue.textContent = message;
    }
    pauseBtn.textContent = state === 'paused' ? '재개' : '일시정지';
    startBtn.textContent = state === 'running' ? '진행 중' : '시작';
  }

  function startGame() {
    if (state === 'running') return;
    if (state === 'paused') {
      setState('running', '게임을 재개했습니다.');
      startLoop();
      return;
    }
    resetGame('게임을 시작했습니다. 행운을 빕니다!');
    setState('running', '게임을 시작했습니다. 행운을 빕니다!');
    startLoop();
  }

  function pauseGame() {
    if (state === 'running') {
      stopLoop();
      setState('paused', '게임을 일시정지했습니다.');
      return;
    }
    if (state === 'paused') {
      setState('running', '게임을 재개했습니다.');
      startLoop();
    }
  }

  function restartGame() {
    resetGame('게임을 다시 시작했습니다.');
    setState('running', '게임을 다시 시작했습니다.');
    startLoop();
  }

  function gameOver() {
    stopLoop();
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem(storageKey, String(bestScore));
    }
    updateHUD('게임 오버입니다. 재시작 버튼을 눌러 다시 도전하세요.');
    draw(true);
  }

  function tick() {
    if (state !== 'running') return;
    tickCount += 1;
    if (queuedDirection && !isOpposite(queuedDirection, currentDirection)) {
      currentDirection = queuedDirection;
    }
    queuedDirection = null;

    const head = snake[0];
    const nextHead = {
      x: head.x + currentDirection.x,
      y: head.y + currentDirection.y,
    };

    const hitWall =
      nextHead.x < 0 ||
      nextHead.x >= cellCount ||
      nextHead.y < 0 ||
      nextHead.y >= cellCount;

    const hitSelf = snake.some((part) => part.x === nextHead.x && part.y === nextHead.y);

    if (hitWall || hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(nextHead);

    if (nextHead.x === enemy.x && nextHead.y === enemy.y) {
      gameOver();
      return;
    }

    const ateFood = nextHead.x === food.x && nextHead.y === food.y;
    if (ateFood) {
      score += 10;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(storageKey, String(bestScore));
      }
      food = randomCell([enemy]);
      scoreValue.textContent = String(score);
      bestValue.textContent = String(bestScore);
      statusValue.textContent = '먹었습니다! 계속 진행해 보세요.';
    } else {
      snake.pop();
    }

    if (tickCount % 3 === 0) {
      moveEnemy();
    }

    draw();
  }

  function moveEnemy() {
    const candidates = [
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x, y: enemy.y + 1 },
      { x: enemy.x, y: enemy.y - 1 },
    ].filter((candidate) =>
      candidate.x >= 0 &&
      candidate.x < cellCount &&
      candidate.y >= 0 &&
      candidate.y < cellCount &&
      !snake.some((part) => part.x === candidate.x && part.y === candidate.y) &&
      !(candidate.x === food.x && candidate.y === food.y)
    );

    if (!candidates.length) {
      return;
    }

    enemy = candidates[Math.floor(Math.random() * candidates.length)];

    if (snake.some((part) => part.x === enemy.x && part.y === enemy.y)) {
      gameOver();
    }
  }

  function roundRect(x, y, w, h, r, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawCell(x, y, color, inset = 0.1) {
    const size = lastRenderScale;
    const offset = size * inset;
    roundRect(
      x * size + offset,
      y * size + offset,
      size - offset * 2,
      size - offset * 2,
      size * 0.25,
      color
    );
  }

  function draw(gameOverState = false) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= cellCount; i += 1) {
      const pos = i * lastRenderScale;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, width);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = colors.foodGlow;
    ctx.shadowBlur = 18;
    drawCell(food.x, food.y, colors.food, 0.18);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = colors.enemyGlow;
    ctx.shadowBlur = 16;
    drawCell(enemy.x, enemy.y, colors.enemy, 0.18);
    ctx.restore();

    snake.forEach((part, index) => {
      const color = index === 0 ? colors.snakeHead : colors.snake;
      drawCell(part.x, part.y, color, index === 0 ? 0.12 : 0.16);
    });

    const head = snake[0];
    if (head) {
      const size = lastRenderScale;
      ctx.fillStyle = '#ffffff';
      const eyeSize = size * 0.08;
      const eyeY = head.y * size + size * 0.33;
      const eyeX = head.x * size + size * 0.58;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(eyeX - size * 0.16, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state === 'paused') {
      drawOverlay('일시정지');
    } else if (state === 'gameover' || gameOverState) {
      drawOverlay('게임 오버');
    } else if (state === 'idle') {
      drawOverlay('시작 버튼을 눌러 주세요');
    }
  }

  function drawOverlay(label) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(0, height * 0.37, width, height * 0.26);
    ctx.fillStyle = colors.text;
    ctx.font = '700 28px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, height / 2);
  }

  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    a: { x: -1, y: 0 },
    s: { x: 0, y: 1 },
    d: { x: 1, y: 0 },
  };

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      pauseGame();
      return;
    }

    const dir = keyMap[key] || keyMap[key.toLowerCase()];
    if (dir) {
      event.preventDefault();
      if (state === 'idle') {
        startGame();
      }
      queueDirection(dir);
    }
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', pauseGame);
  restartBtn.addEventListener('click', restartGame);

  controlButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { direction, action } = button.dataset;
      if (action === 'pause') {
        pauseGame();
        return;
      }
      const dir = keyMap[
        direction === 'up'
          ? 'ArrowUp'
          : direction === 'down'
          ? 'ArrowDown'
          : direction === 'left'
          ? 'ArrowLeft'
          : 'ArrowRight'
      ];
      if (state === 'idle') {
        startGame();
      }
      queueDirection(dir);
    });
  });

  window.addEventListener('resize', fitCanvas);
  fitCanvas();
  resetGame();
  hideOverlay();
}
