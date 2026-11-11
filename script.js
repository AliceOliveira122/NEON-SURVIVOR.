
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const menu = $("menu");
const upgradeScreen = $("upgradeScreen");
const pauseScreen = $("pauseScreen");
const gameOverScreen = $("gameOver");

let state = "menu";
let animationId = null;
let lastTime = 0;

let score = 0;
let wave = 1;
let level = 1;
let xp = 0;
let xpNeeded = 50;
let best = Number(localStorage.getItem("neonBest")) || 0;

let player;
let enemies = [];
let bullets = [];
let particles = [];
let gems = [];
let stars = [];

let spawnTimer = 0;
let shootTimer = 0;
let gameTime = 0;

const keys = {};
const pointer = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    down: false
};

const mobile = {
    up: false,
    down: false,
    left: false,
    right: false
};

$("menuBest").textContent = best;

// =====================================
// CONFIGURAÇÃO DO JOGADOR
// =====================================

function createPlayer() {
    return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 16,
        speed: 240,
        health: 100,
        maxHealth: 100,
        damage: 25,
        fireRate: 0.38,
        bulletSpeed: 520,
        bulletCount: 1,
        invincible: 0,
        dashCooldown: 0,
        dashTime: 0,
        dashSpeed: 650
    };
}

// =====================================
// FUNÇÕES VISUAIS
// =====================================

function drawBackground() {
    ctx.fillStyle = "#080817";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grade futurista
    ctx.strokeStyle = "rgba(100, 90, 180, 0.12)";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Estrelas decorativas
    stars.forEach(star => {
        ctx.fillStyle = "rgba(180, 180, 255, 0.6)";
        ctx.fillRect(star.x, star.y, 2, 2);
    });
}

for (let i = 0; i < 90; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
    });
}

function glowCircle(x, y, radius, color, blur = 20) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// =====================================
// DESENHAR JOGADOR
// =====================================

function drawPlayer() {
    ctx.save();

    ctx.translate(player.x, player.y);

    let angle = Math.atan2(
        pointer.y - player.y,
        pointer.x - player.x
    );

    ctx.rotate(angle + Math.PI / 2);

    if (player.invincible > 0 && Math.floor(gameTime * 12) % 2 === 0) {
        ctx.globalAlpha = 0.4;
    }

    // Sombra luminosa
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 25;

    // Corpo
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(16, 15);
    ctx.lineTo(0, 9);
    ctx.lineTo(-16, 15);
    ctx.closePath();
    ctx.fill();

    // Centro
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Escudo visual
    if (player.invincible > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// =====================================
// INIMIGOS
// =====================================

function spawnEnemy() {
    let side = Math.floor(Math.random() * 4);

    let x, y;

    if (side === 0) {
        x = Math.random() * canvas.width;
        y = -30;
    } else if (side === 1) {
        x = canvas.width + 30;
        y = Math.random() * canvas.height;
    } else if (side === 2) {
        x = Math.random() * canvas.width;
        y = canvas.height + 30;
    } else {
        x = -30;
        y = Math.random() * canvas.height;
    }

    let type = Math.random();

    let enemy;

    if (type < 0.60) {
        enemy = {
            type: "normal",
            radius: 15,
            health: 50,
            speed: 75 + wave * 4,
            damage: 12,
            color: "#f43f5e",
            xp: 12
        };
    } else if (type < 0.88) {
        enemy = {
            type: "fast",
            radius: 10,
            health: 25,
            speed: 145 + wave * 5,
            damage: 8,
            color: "#facc15",
            xp: 10
        };
    } else {
        enemy = {
            type: "tank",
            radius: 24,
            health: 130,
            speed: 43 + wave * 2,
            damage: 20,
            color: "#a855f7",
            xp: 25
        };
    }

    enemies.push({ ...enemy, x, y, maxHealth: enemy.health });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        glowCircle(
            enemy.x,
            enemy.y,
            enemy.radius,
            enemy.color,
            18
        );

        // Olhos
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(enemy.x - 4, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + 4, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Barra de vida
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = "#292943";
            ctx.fillRect(
                enemy.x - enemy.radius,
                enemy.y - enemy.radius - 9,
                enemy.radius * 2,
                4
            );

            ctx.fillStyle = "#4ade80";
            ctx.fillRect(
                enemy.x - enemy.radius,
                enemy.y - enemy.radius - 9,
                enemy.radius * 2 * (enemy.health / enemy.maxHealth),
                4
            );
        }
    });
}

function updateEnemies(dt) {
    enemies.forEach(enemy => {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let distance = Math.hypot(dx, dy) || 1;

        enemy.x += (dx / distance) * enemy.speed * dt;
        enemy.y += (dy / distance) * enemy.speed * dt;

        // Colisão com jogador
        if (distance < player.radius + enemy.radius) {
            if (player.invincible <= 0) {
                player.health -= enemy.damage;
                player.invincible = 0.8;

                createExplosion(player.x, player.y, "#38bdf8", 8);

                enemy.x -= (dx / distance) * 20;
                enemy.y -= (dy / distance) * 20;

                updateHUD();

                if (player.health <= 0) {
                    endGame();
                }
            }
        }
    });
}

// =====================================
// TIROS
// =====================================

function shoot() {
    let target = null;

    if (pointer.down) {
        target = pointer;
    } else if (isMobile()) {
        target = findNearestEnemy();
    }

    if (!target) return;

    let angle = Math.atan2(
        target.y - player.y,
        target.x - player.x
    );

    for (let i = 0; i < player.bulletCount; i++) {
        let spread = (i - (player.bulletCount - 1) / 2) * 0.13;
        let finalAngle = angle + spread;

        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(finalAngle) * player.bulletSpeed,
            vy: Math.sin(finalAngle) * player.bulletSpeed,
            radius: 5,
            damage: player.damage
        });
    }
}

function findNearestEnemy() {
    if (enemies.length === 0) return null;

    return enemies.reduce((nearest, enemy) => {
        let d1 = Math.hypot(
            enemy.x - player.x,
            enemy.y - player.y
        );

        let d2 = Math.hypot(
            nearest.x - player.x,
            nearest.y - player.y
        );

        return d1 < d2 ? enemy : nearest;
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        glowCircle(
            bullet.x,
            bullet.y,
            bullet.radius,
            "#67e8f9",
            15
        );
    });
}

function updateBullets(dt) {
    bullets.forEach(bullet => {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        enemies.forEach(enemy => {
            let distance = Math.hypot(
                bullet.x - enemy.x,
                bullet.y - enemy.y
            );

            if (distance < bullet.radius + enemy.radius) {
                if (!bullet.hit) {
                    bullet.hit = true;
                    enemy.health -= bullet.damage;

                    createExplosion(
                        bullet.x,
                        bullet.y,
                        "#67e8f9",
                        3
                    );

                    if (enemy.health <= 0) {
                        score += enemy.type === "tank" ? 30 : 10;

                        createExplosion(
                            enemy.x,
                            enemy.y,
                            enemy.color,
                            15
                        );

                        gems.push({
                            x: enemy.x,
                            y: enemy.y,
                            value: enemy.xp,
                            radius: 7
                        });

                        enemy.dead = true;
                    }
                }
            }
        });
    });

    bullets = bullets.filter(b =>
        !b.hit &&
        b.x > -20 &&
        b.x < canvas.width + 20 &&
        b.y > -20 &&
        b.y < canvas.height + 20
    );

    enemies = enemies.filter(e => !e.dead);
}

// =====================================
// EXPERIÊNCIA
// =====================================

function drawGems() {
    gems.forEach(gem => {
        glowCircle(gem.x, gem.y, gem.radius, "#4ade80", 16);

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("✦", gem.x, gem.y + 3);
    });
}

function updateGems(dt) {
    gems.forEach(gem => {
        let dx = player.x - gem.x;
        let dy = player.y - gem.y;
        let distance = Math.hypot(dx, dy) || 1;

        // Ímã de experiência
        if (distance < 110) {
            gem.x += (dx / distance) * 240 * dt;
            gem.y += (dy / distance) * 240 * dt;
        }

        if (distance < player.radius + gem.radius + 5) {
            xp += gem.value;
            gem.collected = true;

            createExplosion(gem.x, gem.y, "#4ade80", 5);

            if (xp >= xpNeeded) {
                levelUp();
            }
        }
    });

    gems = gems.filter(gem => !gem.collected);
}

// =====================================
// MELHORIAS
// =====================================

const upgrades = [
    {
        icon: "⚔️",
        name: "DANO EXTRA",
        description: "Aumenta o dano dos seus disparos em 25%.",
        apply: () => {
            player.damage *= 1.25;
        }
    },
    {
        icon: "💨",
        name: "VELOCIDADE",
        description: "Aumenta sua velocidade de movimento em 15%.",
        apply: () => {
            player.speed *= 1.15;
        }
    },
    {
        icon: "❤️",
        name: "CURA",
        description: "Recupera 35 pontos de vida.",
        apply: () => {
            player.health = Math.min(
                player.maxHealth,
                player.health + 35
            );
        }
    },
    {
        icon: "⚡",
        name: "TIRO RÁPIDO",
        description: "Aumenta a frequência dos disparos.",
        apply: () => {
            player.fireRate = Math.max(
                0.12,
                player.fireRate * 0.78
            );
        }
    },
    {
        icon: "🔫",
        name: "MULTITIROS",
        description: "Adiciona mais um projétil por disparo.",
        apply: () => {
            player.bulletCount = Math.min(
                5,
                player.bulletCount + 1
            );
        }
    },
    {
        icon: "💚",
        name: "VIDA MÁXIMA",
        description: "Aumenta a vida máxima em 25 e recupera 25.",
        apply: () => {
            player.maxHealth += 25;
            player.health = Math.min(
                player.maxHealth,
                player.health + 25
            );
        }
    },
    {
        icon: "🎯",
        name: "TIRO POTENTE",
        description: "Aumenta a velocidade dos projéteis em 20%.",
        apply: () => {
            player.bulletSpeed *= 1.2;
        }
    }
];

function levelUp() {
    level++;

    xp -= xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.35);

    state = "upgrade";

    showScreen(upgradeScreen);

    const container = $("upgradeOptions");
    container.innerHTML = "";

    let choices = [...upgrades]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    choices.forEach(upgrade => {
        const card = document.createElement("button");

        card.className = "upgrade-card";

        card.innerHTML = `
            <div class="icon">${upgrade.icon}</div>
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;

        card.addEventListener("click", () => {
            upgrade.apply();

            updateHUD();

            state = "playing";
            hideAllScreens();
        });

        container.appendChild(card);
    });

    updateHUD();
}

// =====================================
// PARTÍCULAS
// =====================================

function createExplosion(x, y, color, amount) {
    for (let i = 0; i < amount; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 130 + 30;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.4 + Math.random() * 0.4,
            maxLife: 0.8,
            color,
            radius: Math.random() * 3 + 1
        });
    }
}

function updateParticles(dt) {
    particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.life -= dt;
    });

    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        glowCircle(p.x, p.y, p.radius, p.color, 8);
    });

    ctx.globalAlpha = 1;
}

// =====================================
// MOVIMENTAÇÃO E INVESTIDA
// =====================================

function isMobile() {
    return window.matchMedia("(max-width: 650px)").matches;
}

function movePlayer(dt) {
    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"] || mobile.up) dy--;
    if (keys["s"] || keys["arrowdown"] || mobile.down) dy++;
    if (keys["a"] || keys["arrowleft"] || mobile.left) dx--;
    if (keys["d"] || keys["arrowright"] || mobile.right) dx++;

    let length = Math.hypot(dx, dy);

    if (length > 0) {
        dx /= length;
        dy /= length;
    }

    let speed = player.dashTime > 0
        ? player.dashSpeed
        : player.speed;

    player.x += dx * speed * dt;
    player.y += dy * speed * dt;

    player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x)
    );

    player.y = Math.max(
        player.radius,
        Math.min(canvas.height - player.radius, player.y)
    );
}

function dash() {
    if (state !== "playing") return;
    if (player.dashCooldown > 0) return;

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"] || mobile.up) dy--;
    if (keys["s"] || keys["arrowdown"] || mobile.down) dy++;
    if (keys["a"] || keys["arrowleft"] || mobile.left) dx--;
    if (keys["d"] || keys["arrowright"] || mobile.right) dx++;

    let length = Math.hypot(dx, dy);

    if (length === 0) {
        let angle = Math.atan2(
            pointer.y - player.y,
            pointer.x - player.x
        );

        dx = Math.cos(angle);
        dy = Math.sin(angle);
    } else {
        dx /= length;
        dy /= length;
    }

    player.x = Math.max(
        player.radius,
        Math.min(canvas.width - player.radius, player.x + dx * 65)
    );

    player.y = Math.max(
        player.radius,
        Math.min(canvas.height - player.radius, player.y + dy * 65)
    );

    player.dashTime = 0.15;
    player.dashCooldown = 2.5;
    player.invincible = 0.35;

    createExplosion(player.x, player.y, "#38bdf8", 12);
}

// =====================================
// INTERFACE
// =====================================

function updateHUD() {
    $("healthBar").style.width =
        Math.max(0, player.health / player.maxHealth * 100) + "%";

    $("healthText").textContent =
        Math.ceil(player.health) + " / " + player.maxHealth;

    $("xpBar").style.width =
        Math.min(100, xp / xpNeeded * 100) + "%";

    $("levelText").textContent = "NÍVEL " + level;

    $("score").textContent = score;
    $("wave").textContent = wave;
}

function showScreen(screen) {
    hideAllScreens();
    screen.classList.remove("hidden");
}

function hideAllScreens() {
    [menu, upgradeScreen, pauseScreen, gameOverScreen]
        .forEach(screen => screen.classList.add("hidden"));
}

// =====================================
// PAUSA E GAME OVER
// =====================================

function pauseGame() {
    if (state === "playing") {
        state = "paused";
        showScreen(pauseScreen);
    } else if (state === "paused") {
        state = "playing";
        hideAllScreens();
    }
}

function endGame() {
    if (state === "gameover") return;

    state = "gameover";

    if (score > best) {
        best = score;
        localStorage.setItem("neonBest", best);
    }

    $("finalScore").textContent = score;
    $("finalWave").textContent = wave;
    $("finalBest").textContent = best;
    $("menuBest").textContent = best;

    showScreen(gameOverScreen);
}

// =====================================
// ATUALIZAÇÃO DO JOGO
// =====================================

function update(dt) {
    if (state !== "playing") return;

    gameTime += dt;

    player.invincible = Math.max(0, player.invincible - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.dashTime = Math.max(0, player.dashTime - dt);

    movePlayer(dt);

    // Disparos automáticos
    shootTimer -= dt;

    if (shootTimer <= 0) {
        shoot();
        shootTimer = player.fireRate;
    }

    // Aparecimento dos inimigos
    spawnTimer -= dt;

    if (spawnTimer <= 0) {
        spawnEnemy();

        let interval = Math.max(0.28, 1.1 - wave * 0.045);
        spawnTimer = interval;
    }

    // Novas ondas
    let newWave = Math.floor(gameTime / 25) + 1;

    if (newWave > wave) {
        wave = newWave;
    }

    updateEnemies(dt);
    updateBullets(dt);
    updateGems(dt);
    updateParticles(dt);

    if (state !== "playing") return;

    if (score > 0) {
        // Pontuação já atualizada pelos inimigos.
    }

    updateHUD();
}

// =====================================
// DESENHAR O JOGO
// =====================================

function draw() {
    drawBackground();

    if (!player) return;

    drawGems();
    drawBullets();
    drawEnemies();
    drawParticles();
    drawPlayer();

    // Indicador da investida
    if (player.dashCooldown > 0) {
        ctx.fillStyle = "#aaaacb";
        ctx.font = "12px Orbitron";
        ctx.textAlign = "left";

        ctx.fillText(
            "INVESTIDA: " + player.dashCooldown.toFixed(1) + "s",
            15,
            canvas.height - 15
        );
    } else {
        ctx.fillStyle = "#4ade80";
        ctx.font = "12px Orbitron";
        ctx.textAlign = "left";
        ctx.fillText("INVESTIDA DISPONÍVEL", 15, canvas.height - 15);
    }
}

// =====================================
// LOOP PRINCIPAL
// =====================================

function gameLoop(timestamp) {
    let dt = lastTime
        ? Math.min((timestamp - lastTime) / 1000, 0.04)
        : 0;

    lastTime = timestamp;

    update(dt);
    draw();

    animationId = requestAnimationFrame(gameLoop);
}

// =====================================
// INICIAR E REINICIAR
// =====================================

function startGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    score = 0;
    wave = 1;
    level = 1;
    xp = 0;
    xpNeeded = 50;

    gameTime = 0;
    spawnTimer = 0.5;
    shootTimer = 0;

    enemies = [];
    bullets = [];
    particles = [];
    gems = [];

    player = createPlayer();

    Object.keys(keys).forEach(k => keys[k] = false);

    Object.keys(mobile).forEach(k => mobile[k] = false);

    pointer.down = false;

    updateHUD();

    state = "playing";
    hideAllScreens();

    lastTime = 0;
    animationId = requestAnimationFrame(gameLoop);
}

// =====================================
// CONTROLES DO TECLADO
// =====================================

document.addEventListener("keydown", event => {
    let key = event.key.toLowerCase();

    if ([
        "arrowup", "arrowdown", "arrowleft",
        "arrowright", " "
    ].includes(key)) {
        event.preventDefault();
    }

    keys[key] = true;

    if (key === "escape") {
        pauseGame();
    }

    if (key === " " && !event.repeat) {
        dash();
    }
});

document.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});

// =====================================
// CONTROLES DO MOUSE
// =====================================

canvas.addEventListener("pointermove", event => {
    const rect = canvas.getBoundingClientRect();

    pointer.x =
        (event.clientX - rect.left) * canvas.width / rect.width;

    pointer.y =
        (event.clientY - rect.top) * canvas.height / rect.height;
});

canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse") {
        pointer.down = true;
    }
});

window.addEventListener("pointerup", () => {
    pointer.down = false;
});

// =====================================
// CONTROLES PARA CELULAR
// =====================================

function mobileButton(id, direction) {
    const button = $(id);

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        mobile[direction] = true;
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(name => {
        button.addEventListener(name, () => {
            mobile[direction] = false;
        });
    });
}

mobileButton("upBtn", "up");
mobileButton("downBtn", "down");
mobileButton("leftBtn", "left");
mobileButton("rightBtn", "right");

$("dashBtn").addEventListener("pointerdown", event => {
    event.preventDefault();
    dash();
});

// =====================================
// BOTÕES DO MENU
// =====================================

$("startBtn").addEventListener("click", startGame);
$("restartBtn").addEventListener("click", startGame);
$("pauseRestartBtn").addEventListener("click", startGame);

$("resumeBtn").addEventListener("click", () => {
    pauseGame();
});

$("menuBtn").addEventListener("click", () => {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    state = "menu";
    showScreen(menu);

    draw();
});

// =====================================
// TELA INICIAL
// =====================================

player = createPlayer();
drawBackground();
drawPlayer();
