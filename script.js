const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размер холста
function resizeCanvas() {
  canvas.width = window.innerWidth * 0.9;
  canvas.height = window.innerHeight * 0.8;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Робот
const robot = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 25,
  speed: 2,
  angle: 0,
  targetAngle: 0,
  targetX: null,
  targetY: null,
};

let crumbs = [];
const crumbRadius = 4;
let hasTarget = false;

function randomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A37EF0', '#FF9F1C', '#F15BB5', '#ffffff'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function lerpAngle(current, target, speed) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * speed;
}

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

// Рисование фона (чёрный)
function drawBackground() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Рисование белого робота
function drawRobot() {
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.angle);

  // Тень
  ctx.save();
  ctx.rotate(-robot.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, robot.radius * 0.6, robot.radius * 0.8, robot.radius * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Основной белый корпус
  ctx.beginPath();
  ctx.arc(0, 0, robot.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Тёмный ободок сверху (датчик)
  ctx.beginPath();
  ctx.arc(0, 0, robot.radius * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = '#333333';
  ctx.fill();
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Блик
  ctx.beginPath();
  ctx.arc(-robot.radius * 0.25, -robot.radius * 0.25, robot.radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  ctx.restore();
}

// Рисование крошек
function drawCrumbs() {
  for (const crumb of crumbs) {
    ctx.beginPath();
    ctx.arc(crumb.x, crumb.y, crumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = crumb.color;
    ctx.fill();
    ctx.shadowColor = crumb.color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

// Движение робота
function updateRobot() {
  if (!hasTarget || robot.targetX === null) {
    const nearest = findNearestCrumb();
    if (nearest) {
      robot.targetX = nearest.x;
      robot.targetY = nearest.y;
      robot.targetAngle = angleBetween(robot.x, robot.y, nearest.x, nearest.y);
      hasTarget = true;
    } else {
      randomWander();
      return;
    }
  }

  const targetStillExists = crumbs.some(
    c => Math.abs(c.x - robot.targetX) < 0.1 && Math.abs(c.y - robot.targetY) < 0.1
  );
  if (!targetStillExists) {
    robot.targetX = null;
    robot.targetY = null;
    hasTarget = false;
    return;
  }

  const desiredAngle = angleBetween(robot.x, robot.y, robot.targetX, robot.targetY);
  robot.angle = lerpAngle(robot.angle, desiredAngle, 0.12);

  const dx = robot.targetX - robot.x;
  const dy = robot.targetY - robot.y;
  const dist = Math.hypot(dx, dy);

  if (dist < robot.radius * 0.5) {
    robot.targetX = null;
    robot.targetY = null;
    hasTarget = false;
    return;
  }

  robot.x += Math.cos(robot.angle) * robot.speed;
  robot.y += Math.sin(robot.angle) * robot.speed;

  robot.x = Math.max(robot.radius, Math.min(canvas.width - robot.radius, robot.x));
  robot.y = Math.max(robot.radius, Math.min(canvas.height - robot.radius, robot.y));
}

function randomWander() {
  if (!robot.wanderAngle) robot.wanderAngle = robot.angle;

  if (Math.random() < 0.03) {
    robot.wanderAngle += (Math.random() - 0.5) * Math.PI / 2;
  }

  robot.angle = lerpAngle(robot.angle, robot.wanderAngle, 0.05);

  const wanderSpeed = robot.speed * 0.4;
  robot.x += Math.cos(robot.angle) * wanderSpeed;
  robot.y += Math.sin(robot.angle) * wanderSpeed;

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

// Сбор крошек
function collectCrumbs() {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const crumb = crumbs[i];
    const d = distance(robot.x, robot.y, crumb.x, crumb.y);
    if (d < robot.radius + crumbRadius) {
      crumbs.splice(i, 1);
      if (hasTarget && robot.targetX === crumb.x && robot.targetY === crumb.y) {
        robot.targetX = null;
        robot.targetY = null;
        hasTarget = false;
      }
    }
  }
}

// Игровой цикл
function gameLoop() {
  updateRobot();
  collectCrumbs();

  drawBackground();
  drawCrumbs();
  drawRobot();

  requestAnimationFrame(gameLoop);
}

// Клик — создание крошек
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  // Рассыпаем несколько крошек вокруг клика
  for (let i = 0; i < 3; i++) {
    crumbs.push({
      x: mouseX + (Math.random() - 0.5) * 20,
      y: mouseY + (Math.random() - 0.5) * 20,
      radius: crumbRadius,
      color: randomColor(),
    });
  }
});

gameLoop();
