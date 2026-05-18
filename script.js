// ============================================
//  РОБОТ-ПЫЛЕСОС: РЕАЛИСТИЧНАЯ СИМУЛЯЦИЯ
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы интерфейса
const scoreValue = document.getElementById('scoreValue');
const targetsNearby = document.getElementById('targetsNearby');
const batteryFill = document.getElementById('batteryFill');
const robotStatus = document.getElementById('robotStatus');

// Размеры холста
function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth * 0.9, 900);
  canvas.height = Math.min(window.innerHeight * 0.65, 550);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================
//  ОБЪЕКТ РОБОТА
// ============================================
const robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 30,
  speed: 2.2,
  angle: 0,               // текущий угол поворота (радианы)
  targetAngle: 0,         // целевой угол
  targetX: null,
  targetY: null,
  wheelRotation: 0,       // вращение колёс
  particles: [],          // частицы при сборе
  state: 'idle',          // idle, moving, collecting
  stateTimer: 0,
};

// ============================================
//  МАССИВЫ ДАННЫХ
// ============================================
let crumbs = [];
const crumbRadius = 3.5;
let collected = 0;
let hasTarget = false;

// Частицы для эффектов
let effectParticles = [];

// ============================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function lerpAngle(current, target, speed) {
  let diff = target - current;
  // Нормализация угла в [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * speed;
}

// Цвета крошек (естественные оттенки)
const crumbColors = [
  '#d4a574', // песочное печенье
  '#c4956a', // крошка хлеба
  '#e8c9a0', // светлая крошка
  '#a08060', // тёмная крошка
  '#b8956e', // крекер
  '#d2b48c', // пшеничный
  '#8b7355', // ржаной хлеб
  '#deb887', // печенье
];

function randomCrumbColor() {
  return crumbColors[randomInt(0, crumbColors.length - 1)];
}

// Поиск ближайшей крошки
function findNearestCrumb() {
  if (crumbs.length === 0) return null;
  let nearest = null;
  let minDist = Infinity;
  for (const crumb of crumbs) {
    const d = distance(robot.x, robot.y, crumb.x, crumb.y);
    if (d < minDist) {
      minDist = d;
      nearest = crumb;
    }
  }
  return nearest;
}

// ============================================
//  ОТРИСОВКА ФОНА (ТЕКСТУРА ПОЛА)
// ============================================
function drawBackground() {
  // Базовый цвет пола
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#3d3226');
  gradient.addColorStop(0.5, '#4a3b2f');
  gradient.addColorStop(1, '#3d3226');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Текстура деревянных досок
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1;
  const boardWidth = 80;
  for (let x = 0; x < canvas.width; x += boardWidth) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();

    // Сучки на досках (случайные, но фиксированные)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < canvas.height; y += boardWidth) {
      if ((Math.floor(x / boardWidth) + Math.floor(y / boardWidth)) % 3 === 0) {
        ctx.beginPath();
        ctx.ellipse(x + boardWidth / 2 + random(-15, 15), y + boardWidth / 2 + random(-15, 15), 8, 4, random(0, Math.PI), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Лёгкое виньетирование
  const vignette = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.7
  );
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ============================================
//  ОТРИСОВКА РОБОТА (ДЕТАЛИЗИРОВАННАЯ)
// ============================================
function drawRobot() {
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.angle);

  const r = robot.radius;

  // Тень под роботом
  ctx.save();
  ctx.rotate(-robot.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Основной корпус (градиент)
  const bodyGrad = ctx.createLinearGradient(0, -r, 0, r);
  bodyGrad.addColorStop(0, '#e8e8e8');
  bodyGrad.addColorStop(0.4, '#d0d0d0');
  bodyGrad.addColorStop(0.6, '#b8b8b8');
  bodyGrad.addColorStop(1, '#909090');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Верхняя панель
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();

  // Декоративное кольцо
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Логотип / сенсор (синий круг)
  const logoGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 0.45);
  logoGrad.addColorStop(0, '#4fc3f7');
  logoGrad.addColorStop(0.6, '#0288d1');
  logoGrad.addColorStop(1, '#01579b');
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = logoGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Блик на сенсоре
  ctx.beginPath();
  ctx.arc(-r * 0.15, -r * 0.15, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();

  // Кнопка питания
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.5, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Светодиод на кнопке
  const ledGlow = ctx.createRadialGradient(r * 0.5, -r * 0.5, 0, r * 0.5, -r * 0.5, r * 0.2);
  ledGlow.addColorStop(0, '#4ade80');
  ledGlow.addColorStop(0.5, 'rgba(74, 222, 128, 0.6)');
  ledGlow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.5, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = ledGlow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.5, r * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = '#4ade80';
  ctx.fill();

  // Колёса (два по бокам)
  drawWheel(-r * 0.75, r * 0.35, r * 0.3, r * 0.15);
  drawWheel(r * 0.75, r * 0.35, r * 0.3, r * 0.15);

  // Маленькое переднее колесо
  drawWheel(0, -r * 0.7, r * 0.18, r * 0.08);

  // Боковые щётки
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * r * 0.8, r * 0.1);
    ctx.rotate(robot.wheelRotation * 2 * side);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.3, 0);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  ctx.restore();

  // Отладочный луч (лазерный указатель цели) — тонкая линия к цели
  if (hasTarget && robot.targetX !== null) {
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(robot.x, robot.y);
    ctx.lineTo(robot.targetX, robot.targetY);
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawWheel(x, y, outerR, innerR) {
  ctx.save();
  ctx.translate(x, y);
  
  // Внешний обод
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Ступица
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
  
  // Спицы (вращаются)
  for (let i = 0; i < 5; i++) {
    const spokeAngle = (i / 5) * Math.PI * 2 + robot.wheelRotation;
    ctx.save();
    ctx.rotate(spokeAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(outerR * 0.8, 0);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  
  ctx.restore();
}

// ============================================
//  ОТРИСОВКА КРОШЕК (РЕАЛИСТИЧНЫЕ ЧАСТИЦЫ)
// ============================================
function drawCrumb(x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  
  // Случайная форма (немного деформированный круг)
  const points = 8;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = radius * (0.75 + Math.random() * 0.25);
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  
  // Градиент для объёма
  const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, radius * 0.1, 0, 0, radius);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, '#000000');
  
  ctx.fillStyle = grad;
  ctx.fill();
  
  // Тень
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  ctx.restore();
}

function drawCrumbs() {
  for (const crumb of crumbs) {
    drawCrumb(crumb.x, crumb.y, crumb.radius, crumb.color);
  }
}

// ============================================
//  ЧАСТИЦЫ ЭФФЕКТОВ (ПРИ СБОРЕ)
// ============================================
function spawnCollectParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    effectParticles.push({
      x: x,
      y: y,
      vx: random(-2, 2),
      vy: random(-2, 2),
      life: 1,
      decay: random(0.02, 0.05),
      radius: random(1, 3),
      color: color,
    });
  }
}

function updateEffectParticles() {
  for (let i = effectParticles.length - 1; i >= 0; i--) {
    const p = effectParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      effectParticles.splice(i, 1);
    }
  }
}

function drawEffectParticles() {
  for (const p of effectParticles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

// ============================================
//  ЛОГИКА ДВИЖЕНИЯ РОБОТА
// ============================================
function updateRobot() {
  // Поиск цели
  if (!hasTarget || robot.targetX === null) {
    const nearest = findNearestCrumb();
    if (nearest) {
      robot.targetX = nearest.x;
      robot.targetY = nearest.y;
      robot.targetAngle = angleBetween(robot.x, robot.y, nearest.x, nearest.y);
      hasTarget = true;
      robot.state = 'moving';
    } else {
      randomWander();
      return;
    }
  }

  // Проверка, существует ли цель
  const targetStillExists = crumbs.some(
    c => Math.abs(c.x - robot.targetX) < 0.1 && Math.abs(c.y - robot.targetY) < 0.1
  );
  if (!targetStillExists) {
    robot.targetX = null;
    robot.targetY = null;
    hasTarget = false;
    robot.state = 'idle';
    return;
  }

  // Плавный поворот к цели
  const desiredAngle = angleBetween(robot.x, robot.y, robot.targetX, robot.targetY);
  robot.angle = lerpAngle(robot.angle, desiredAngle, 0.12);

  // Движение вперёд (робот едет "носом")
  const dx = robot.targetX - robot.x;
  const dy = robot.targetY - robot.y;
  const dist = Math.hypot(dx, dy);

  if (dist < robot.radius * 0.7) {
    // Достаточно близко — цель будет собрана коллизией
    robot.targetX = null;
    robot.targetY = null;
    hasTarget = false;
    robot.state = 'idle';
    return;
  }

  // Двигаемся вперёд
  robot.x += Math.cos(robot.angle) * robot.speed;
  robot.y += Math.sin(robot.angle) * robot.speed;

  // Вращение колёс
  robot.wheelRotation += robot.speed * 0.15;

  // Ограничение границ
  robot.x = Math.max(robot.radius, Math.min(canvas.width - robot.radius, robot.x));
  robot.y = Math.max(robot.radius, Math.min(canvas.height - robot.radius, robot.y));

  robot.state = 'moving';
}

function randomWander() {
  robot.state = 'idle';
  
  if (!robot.wanderAngle) {
    robot.wanderAngle = robot.angle;
  }
  
  // Плавное изменение направления
  if (Math.random() < 0.03) {
    robot.wanderAngle += random(-Math.PI / 3, Math.PI / 3);
  }

  robot.angle = lerpAngle(robot.angle, robot.wanderAngle, 0.05);

  // Медленное движение
  const wanderSpeed = robot.speed * 0.4;
  robot.x += Math.cos(robot.angle) * wanderSpeed;
  robot.y += Math.sin(robot.angle) * wanderSpeed;
  robot.wheelRotation += wanderSpeed * 0.1;

  // Отскок от стен
  const margin = robot.radius + 20;
  if (robot.x < margin || robot.x > canvas.width - margin) {
    robot.wanderAngle = Math.PI - robot.wanderAngle;
    robot.x = Math.max(margin, Math.min(canvas.width - margin, robot.x));
  }
  if (robot.y < margin || robot.y > canvas.height - margin) {
    robot.wanderAngle = -robot.wanderAngle;
    robot.y = Math.max(margin, Math.min(canvas.height - margin, robot.y));
  }
}

// ============================================
//  СБОР КРОШЕК
// ============================================
function collectCrumbs() {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const crumb = crumbs[i];
    const d = distance(robot.x, robot.y, crumb.x, crumb.y);
    if (d < robot.radius + crumb.radius) {
      // Эффект частиц
      spawnCollectParticles(crumb.x, crumb.y, crumb.color);
      
      // Удаляем крошку
      crumbs.splice(i, 1);
      collected++;
      scoreValue.textContent = collected;
      
      // Сброс цели
      if (hasTarget && robot.targetX === crumb.x && robot.targetY === crumb.y) {
        robot.targetX = null;
        robot.targetY = null;
        hasTarget = false;
      }
      
      robot.state = 'collecting';
      robot.stateTimer = 10;
    }
  }
  
  // Таймер состояния
  if (robot.stateTimer > 0) {
    robot.stateTimer--;
    if (robot.stateTimer === 0) {
      robot.state = 'idle';
    }
  }
}

// ============================================
//  ОБНОВЛЕНИЕ UI
// ============================================
function updateUI() {
  targetsNearby.textContent = crumbs.length;
  
  // Имитация разряда батареи (медленно)
  const batteryLevel = Math.max(20, 100 - collected * 0.5);
  batteryFill.style.width = batteryLevel + '%';
  
  // Цвет батареи
  if (batteryLevel < 30) {
    batteryFill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
  } else if (batteryLevel < 60) {
    batteryFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  } else {
    batteryFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
  }
  
  // Статус робота
  const statusMap = {
    'idle': 'Ожидание',
    'moving': 'В работе',
    'collecting': 'Сбор крошки',
  };
  robotStatus.textContent = statusMap[robot.state] || 'В работе';
}

// ============================================
//  ИГРОВОЙ ЦИКЛ
// ============================================
function gameLoop() {
  updateRobot();
  collectCrumbs();
  updateEffectParticles();
  updateUI();
  
  drawBackground();
  drawCrumbs();
  drawEffectParticles();
  drawRobot();
  
  requestAnimationFrame(gameLoop);
}

// ============================================
//  ОБРАБОТЧИК КЛИКОВ (СОЗДАНИЕ КРОШЕК)
// ============================================
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  // Создаём несколько крошек вокруг точки клика для реалистичности
  const count = randomInt(2, 5);
  for (let i = 0; i < count; i++) {
    crumbs.push({
      x: mouseX + random(-15, 15),
      y: mouseY + random(-15, 15),
      radius: crumbRadius * random(0.6, 1.4),
      color: randomCrumbColor(),
    });
  }
});

// Запуск
gameLoop();
