// script.js

// Получаем ссылки на canvas и элемент счёта
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('scoreValue');

// Подгоняем размер canvas под окно (или фиксированный)
function resizeCanvas() {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.8;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // начальный размер

// --- Объекты игры ---

// Робот-пылесос
const robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 25,          // радиус корпуса
  speed: 2,            // пикселей за кадр
  targetX: null,       // координаты цели (крошки)
  targetY: null,
};

// Массив крошек. Каждая крошка: { x, y, radius, color }
let crumbs = [];
const crumbRadius = 4;

// Счётчик собранных крошек
let collected = 0;

// Флаг, движется ли робот к конкретной крошке или блуждает
let hasTarget = false;

// --- Вспомогательные функции ---

// Генерация случайного цвета для крошки
function randomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A37EF0', '#FF9F1C', '#F15BB5'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Расстояние между двумя точками
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Поиск ближайшей крошки к роботу
function findNearestCrumb() {
  if (crumbs.length === 0) return null;
  let nearest = null;
  let minDist = Infinity;
  for (let crumb of crumbs) {
    const d = distance(robot.x, robot.y, crumb.x, crumb.y);
    if (d < minDist) {
      minDist = d;
      nearest = crumb;
    }
  }
  return nearest;
}

// --- Отрисовка ---

function drawBackground() {
  // Чёрный фон
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRobot() {
  // Корпус (большой круг)
  ctx.beginPath();
  ctx.arc(robot.x, robot.y, robot.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#AAAAAA';
  ctx.fill();
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Декоративная "щетка" сзади (маленькая дуга)
  ctx.beginPath();
  ctx.arc(robot.x, robot.y, robot.radius + 5, -Math.PI / 4, Math.PI / 4);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Центральный индикатор (глазок)
  ctx.beginPath();
  ctx.arc(robot.x, robot.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#00FFAA';
  ctx.fill();
  ctx.strokeStyle = '#008855';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Маленький блик
  ctx.beginPath();
  ctx.arc(robot.x - 3, robot.y - 3, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
}

function drawCrumbs() {
  for (let crumb of crumbs) {
    ctx.beginPath();
    ctx.arc(crumb.x, crumb.y, crumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = crumb.color;
    ctx.fill();
    // Лёгкая тень для объёма
    ctx.shadowColor = crumb.color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

function drawUI() {
  // Счёт уже выводится в HTML, но можно продублировать на canvas (не обязательно)
}

// --- Логика движения робота ---

function updateRobot() {
  // Если нет цели, ищем ближайшую крошку
  if (!hasTarget || robot.targetX === null) {
    const nearest = findNearestCrumb();
    if (nearest) {
      robot.targetX = nearest.x;
      robot.targetY = nearest.y;
      hasTarget = true;
    } else {
      // Нет крошек – случайное блуждание
      randomWander();
      return;
    }
  }

  // Проверяем, не пропала ли целевая крошка (её могли собрать)
  const targetStillExists = crumbs.some(
    c => c.x === robot.targetX && c.y === robot.targetY
  );
  if (!targetStillExists) {
    // Сбросить цель, выбрать новую в следующем кадре
    robot.targetX = null;
    robot.targetY = null;
    hasTarget = false;
    return;
  }

  // Вычисляем направление к цели
  const dx = robot.targetX - robot.x;
  const dy = robot.targetY - robot.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    // Прибыли на место, но крошка уже могла быть собрана другим? Нет, мы её ещё не собирали.
    // Лучше собирать по коллизии, а не по достижению точки.
    hasTarget = false;
    robot.targetX = null;
    robot.targetY = null;
    return;
  }

  // Двигаемся в сторону цели с постоянной скоростью
  const stepX = (dx / dist) * robot.speed;
  const stepY = (dy / dist) * robot.speed;

  robot.x += stepX;
  robot.y += stepY;

  // Ограничиваем, чтобы робот не выходил за границы canvas
  robot.x = Math.max(robot.radius, Math.min(canvas.width - robot.radius, robot.x));
  robot.y = Math.max(robot.radius, Math.min(canvas.height - robot.radius, robot.y));
}

function randomWander() {
  // Простое случайное движение с отскоком от стен
  if (!robot.wanderAngle) {
    robot.wanderAngle = Math.random() * Math.PI * 2;
  }
  // Иногда меняем направление
  if (Math.random() < 0.02) {
    robot.wanderAngle = Math.random() * Math.PI * 2;
  }

  robot.x += Math.cos(robot.wanderAngle) * robot.speed * 0.7; // чуть медленнее
  robot.y += Math.sin(robot.wanderAngle) * robot.speed * 0.7;

  // Отскок от границ
  if (robot.x - robot.radius < 0 || robot.x + robot.radius > canvas.width) {
    robot.wanderAngle = Math.PI - robot.wanderAngle;
    robot.x = Math.max(robot.radius, Math.min(canvas.width - robot.radius, robot.x));
  }
  if (robot.y - robot.radius < 0 || robot.y + robot.radius > canvas.height) {
    robot.wanderAngle = -robot.wanderAngle;
    robot.y = Math.max(robot.radius, Math.min(canvas.height - robot.radius, robot.y));
  }
}

// --- Сбор крошек (коллизия) ---

function collectCrumbs() {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const crumb = crumbs[i];
    const d = distance(robot.x, robot.y, crumb.x, crumb.y);
    // Если робот касается крошки (расстояние меньше суммы радиусов)
    if (d < robot.radius + crumbRadius) {
      crumbs.splice(i, 1);
      collected++;
      scoreSpan.textContent = collected;

      // Сбрасываем цель, если робот ехал к этой крошке
      if (
        hasTarget &&
        robot.targetX === crumb.x &&
        robot.targetY === crumb.y
      ) {
        robot.targetX = null;
        robot.targetY = null;
        hasTarget = false;
      }
    }
  }
}

// --- Игровой цикл ---

function gameLoop() {
  updateRobot();
  collectCrumbs();

  drawBackground();
  drawCrumbs();
  drawRobot();
  drawUI();

  requestAnimationFrame(gameLoop);
}

// --- Обработка кликов (создание крошек) ---

canvas.addEventListener('mousedown', (e) => {
  // Реагируем только на левую кнопку (button === 0)
  if (e.button !== 0) return;

  // Получаем координаты клика относительно canvas
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;   // соотношение, если canvas растянут
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Создаём новую крошку
  crumbs.push({
    x: mouseX,
    y: mouseY,
    radius: crumbRadius,
    color: randomColor(),
  });
});

// Запускаем игру
gameLoop();
