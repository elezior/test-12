npm i @vercel/analytics
import { Analytics } from "@vercel/analytics/next"
// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bgCanvas = document.getElementById('backgroundCanvas');
const bgCtx = bgCanvas.getContext('2d');

// Set canvas sizes
canvas.width = 1200;
canvas.height = 800;
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;

// Game state
let gameState = 'menu'; // menu, playing, paused, gameover
let gameTime = 0;
let deltaTime = 0;
let lastTime = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let comboTimer = 0;

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 30,
    speed: 5,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    energyRegen: 2,
    angle: 0,
    level: 1,
    exp: 0,
    expToNext: 10,
    invulnerable: false,
    invulnerabilityTime: 0,
    // Stats
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    speedMultiplier: 1,
    critChance: 0.1,
    critDamage: 2,
    armor: 0,
    // Abilities
    boost: false,
    boostCooldown: 0,
    phaseShift: false,
    phaseShiftCooldown: 0
};
        <Analytics />

// Weapons
const weapons = {
    mainGun: {
        enabled: true,
        damage: 10,
        fireRate: 5,
        lastFire: 0,
        projectileSpeed: 15,
        projectileSize: 4,
        spread: 0,
        multishot: 1
    },
    missiles: {
        enabled: false,
        damage: 25,
        fireRate: 1,
        lastFire: 0,
        projectileSpeed: 8,
        projectileSize: 8,
        homingStrength: 0.1
    },
    laser: {
        enabled: false,
        damage: 5,
        range: 300,
        width: 3,
        chains: 0
    },
    shield: {
        enabled: false,
        active: false,
        duration: 0,
        maxDuration: 180,
        cooldown: 0,
        maxCooldown: 600,
        strength: 1
    },
    drones: {
        enabled: false,
        count: 0,
        maxCount: 3,
        damage: 5,
        fireRate: 2,
        list: []
    },
    plasmaBurst: {
        enabled: false,
        damage: 50,
        radius: 150,
        cooldown: 0,
        maxCooldown: 300
    }
};

// Arrays
let projectiles = [];
let enemies = [];
let particles = [];
let pickups = [];
let damageNumbers = [];
let stars = [];

// Enemy types
const enemyTypes = {
    grunt: {
        size: 20, speed: 2, health: 20, damage: 10, exp: 5,
        color: '#f44', ai: 'direct', score: 100
    },
    swarm: {
        size: 12, speed: 4, health: 10, damage: 5, exp: 3,
        color: '#ff0', ai: 'swarm', score: 50
    },
    tank: {
        size: 35, speed: 1, health: 80, damage: 20, exp: 20,
        color: '#f0f', ai: 'direct', armor: 5, score: 300
    },
    sniper: {
        size: 25, speed: 1.5, health: 30, damage: 25, exp: 15,
        color: '#0f0', ai: 'sniper', range: 400, score: 200
    },
    bomber: {
        size: 30, speed: 2.5, health: 40, damage: 30, exp: 25,
        color: '#fa0', ai: 'kamikaze', score: 250
    },
    elite: {
        size: 28, speed: 3, health: 100, damage: 15, exp: 50,
        color: '#0ff', ai: 'smart', score: 500
    },
    boss: {
        size: 60, speed: 1.5, health: 1000, damage: 40, exp: 200,
        color: '#fff', ai: 'boss', armor: 10, score: 2000
    }
};

// Upgrade pool
const upgradePool = [
    // Weapons
    {
        name: "Damage Boost", 
        description: "Increase all weapon damage by 30%",
        rarity: "common",
        apply: () => { player.damageMultiplier *= 1.3; }
    },
    {
        name: "Rapid Fire",
        description: "Increase fire rate by 25%", 
        rarity: "common",
        apply: () => { player.fireRateMultiplier *= 1.25; }
    },
    {
        name: "Missile System",
        description: "Unlock homing missiles",
        rarity: "rare",
        apply: () => { weapons.missiles.enabled = true; },
        condition: () => !weapons.missiles.enabled
    },
    {
        name: "Laser Array",
        description: "Continuous beam weapon that chains to nearby enemies",
        rarity: "rare", 
        apply: () => { weapons.laser.enabled = true; },
        condition: () => !weapons.laser.enabled
    },
    {
        name: "Energy Shield",
        description: "Periodic invulnerability barrier",
        rarity: "rare",
        apply: () => { weapons.shield.enabled = true; },
        condition: () => !weapons.shield.enabled
    },
    {
        name: "Combat Drones",
        description: "Deploy autonomous combat drones",
        rarity: "epic",
        apply: () => { 
            weapons.drones.enabled = true;
            weapons.drones.count++;
            spawnDrone();
        },
        condition: () => weapons.drones.count < weapons.drones.maxCount
    },
    {
        name: "Plasma Burst",
        description: "Area damage explosion ability",
        rarity: "epic",
        apply: () => { weapons.plasmaBurst.enabled = true; },
        condition: () => !weapons.plasmaBurst.enabled
    },
    // Defense
    {
        name: "Armor Plating",
        description: "Reduce damage taken by 20%",
        rarity: "common",
        apply: () => { player.armor += 0.2; }
    },
    {
        name: "Hull Reinforcement", 
        description: "Increase max health by 50",
        rarity: "common",
        apply: () => { 
            player.maxHealth += 50;
            player.health += 50;
        }
    },
    {
        name: "Repair Nanobots",
        description: "Regenerate 1 HP per second",
        rarity: "rare",
        apply: () => { player.healthRegen = true; }
    },
    // Movement
    {
        name: "Boost Jets",
        description: "Hold SHIFT for speed boost",
        rarity: "common",
        apply: () => { player.boostEnabled = true; }
    },
    {
        name: "Phase Shift",
        description: "Press SPACE to become invulnerable briefly",
        rarity: "epic",
        apply: () => { player.phaseShiftEnabled = true; },
        condition: () => !player.phaseShiftEnabled
    },
    {
        name: "Enhanced Thrusters",
        description: "Increase movement speed by 20%",
        rarity: "common",
        apply: () => { player.speedMultiplier *= 1.2; }
    },
    // Special
    {
        name: "Multishot",
        description: "Main weapon fires additional projectiles",
        rarity: "rare",
        apply: () => { 
            weapons.mainGun.multishot += 2;
            weapons.mainGun.spread = Math.PI / 8;
        }
    },
    {
        name: "Energy Core",
        description: "Increase max energy by 50",
        rarity: "common",
        apply: () => { 
            player.maxEnergy += 50;
            player.energy += 50;
        }
    },
    {
        name: "Critical Systems",
        description: "20% chance for double damage",
        rarity: "rare",
        apply: () => { player.critChance += 0.2; }
    },
    {
        name: "Overcharge",
        description: "All weapons deal 50% more damage but cost energy",
        rarity: "legendary",
        apply: () => { 
            player.damageMultiplier *= 1.5;
            player.weaponsUseEnergy = true;
        }
    },
    {
        name: "Quantum Core",
        description: "All projectiles pierce through enemies",
        rarity: "legendary",
        apply: () => { player.projectilesPierce = true; }
    }
];

// Input
const keys = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// Event Listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
});

// UI Event Listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('mainMenuBtn').addEventListener('click', showMainMenu);
document.getElementById('controlsBtn').addEventListener('click', () => {
    document.getElementById('controlsInfo').classList.toggle('hidden');
    document.getElementById('upgradesInfo').classList.add('hidden');
});
document.getElementById('upgradesBtn').addEventListener('click', () => {
    document.getElementById('upgradesInfo').classList.toggle('hidden');
    document.getElementById('controlsInfo').classList.add('hidden');
});

// Initialize
function init() {
    createStarfield();
    gameLoop();
}

// Create background starfield
function createStarfield() {
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// Game functions
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    resetGame();
    gameState = 'playing';
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    resetGame();
    gameState = 'playing';
}

function showMainMenu() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('startScreen').classList.remove('hidden');
    gameState = 'menu';
}

function resetGame() {
    // Reset player
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = 100;
    player.maxHealth = 100;
    player.energy = 100;
    player.maxEnergy = 100;
    player.level = 1;
    player.exp = 0;
    player.expToNext = 10;
    player.damageMultiplier = 1;
    player.fireRateMultiplier = 1;
    player.speedMultiplier = 1;
    player.critChance = 0.1;
    player.armor = 0;
    player.invulnerable = false;
    
    // Reset weapons
    Object.keys(weapons).forEach(key => {
        if (key !== 'mainGun') {
            weapons[key].enabled = false;
        }
    });
    weapons.mainGun.multishot = 1;
    weapons.mainGun.spread = 0;
    weapons.drones.list = [];
    weapons.drones.count = 0;
    
    // Reset game state
    gameTime = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    
    // Clear arrays
    projectiles = [];
    enemies = [];
    particles = [];
    pickups = [];
    damageNumbers = [];
}

// Main game loop
function gameLoop(currentTime = 0) {
    deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (gameState === 'playing' && deltaTime < 0.1) { // Cap deltaTime to prevent issues
        update(deltaTime);
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(dt) {
    gameTime += dt;
    
    updatePlayer(dt);
    updateWeapons(dt);
    updateProjectiles(dt);
    updateEnemies(dt);
    updateParticles(dt);
    updatePickups(dt);
    updateDamageNumbers(dt);
    
    checkCollisions();
    spawnEnemies(dt);
    updateUI();
    
    // Update combo
    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) {
            combo = 0;
            document.getElementById('comboCounter').classList.add('hidden');
        }
    }
    
    // Check level up
    while (player.exp >= player.expToNext) {
        levelUp();
    }
    
    // Check game over
    if (player.health <= 0) {
        gameOver();
    }
}

// Player update
function updatePlayer(dt) {
    // Movement
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    // Apply speed
    let speed = player.speed * player.speedMultiplier;
    if (player.boostEnabled && keys['shift'] && player.energy > 0) {
        speed *= 2;
        player.energy -= 30 * dt;
        createBoostParticles();
    }
    
    player.x += dx * speed * 60 * dt;
    player.y += dy * speed * 60 * dt;
    
    // Bounds
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
    
    // Angle
    player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    
    // Energy regen
    if (player.energy < player.maxEnergy && !keys['shift']) {
        player.energy = Math.min(player.maxEnergy, player.energy + player.energyRegen * dt);
    }
    
    // Health regen
    if (player.healthRegen && player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + dt);
    }
    
    // Invulnerability
    if (player.invulnerable) {
        player.invulnerabilityTime -= dt;
        if (player.invulnerabilityTime <= 0) {
            player.invulnerable = false;
        }
    }
    
    // Phase shift
    if (player.phaseShiftEnabled && keys[' '] && player.phaseShiftCooldown <= 0) {
        player.invulnerable = true;
        player.invulnerabilityTime = 2;
        player.phaseShiftCooldown = 10;
        createPhaseEffect();
    }
    if (player.phaseShiftCooldown > 0) {
        player.phaseShiftCooldown -= dt;
    }
}

// Weapons update
function updateWeapons(dt) {
    const now = Date.now();
    
    // Main gun
    if (now - weapons.mainGun.lastFire > 1000 / (weapons.mainGun.fireRate * player.fireRateMultiplier)) {
        fireMainGun();
        weapons.mainGun.lastFire = now;
    }
    
    // Missiles
    if (weapons.missiles.enabled && now - weapons.missiles.lastFire > 1000 / weapons.missiles.fireRate) {
        fireMissiles();
        weapons.missiles.lastFire = now;
    }
    
    // Laser
    if (weapons.laser.enabled) {
        fireLaser();
    }
    
    // Shield
    if (weapons.shield.enabled) {
        if (weapons.shield.cooldown > 0) {
            weapons.shield.cooldown -= dt * 60;
            if (weapons.shield.cooldown <= 0) {
                weapons.shield.active = true;
                weapons.shield.duration = weapons.shield.maxDuration;
            }
        }
        
        if (weapons.shield.active) {
            weapons.shield.duration -= dt * 60;
            if (weapons.shield.duration <= 0) {
                weapons.shield.active = false;
                weapons.shield.cooldown = weapons.shield.maxCooldown;
            }
        }
    }
    
    // Plasma burst
    if (weapons.plasmaBurst.enabled && weapons.plasmaBurst.cooldown > 0) {
        weapons.plasmaBurst.cooldown -= dt * 60;
    }
    if (weapons.plasmaBurst.enabled && keys['e'] && weapons.plasmaBurst.cooldown <= 0) {
        plasmaBurst();
    }
    
    // Drones
    if (weapons.drones.enabled) {
        updateDrones(dt);
    }
}

// Weapon fire functions
function fireMainGun() {
    const baseAngle = player.angle;
    
    for (let i = 0; i < weapons.mainGun.multishot; i++) {
        let angle = baseAngle;
        if (weapons.mainGun.multishot > 1) {
            const spreadAngle = weapons.mainGun.spread;
            angle = baseAngle - spreadAngle/2 + (spreadAngle / (weapons.mainGun.multishot - 1)) * i;
        }
        
        projectiles.push({
            x: player.x + Math.cos(angle) * player.size,
            y: player.y + Math.sin(angle) * player.size,
            vx: Math.cos(angle) * weapons.mainGun.projectileSpeed,
            vy: Math.sin(angle) * weapons.mainGun.projectileSpeed,
            damage: weapons.mainGun.damage * player.damageMultiplier,
            size: weapons.mainGun.projectileSize,
            type: 'bullet',
            color: '#0ff',
            pierce: player.projectilesPierce ? 3 : 0
        });
    }
    
    if (player.weaponsUseEnergy) {
        player.energy = Math.max(0, player.energy - 2);
    }
}

function fireMissiles() {
    // Find closest enemies
    const targets = enemies
        .map(e => ({ enemy: e, dist: Math.hypot(e.x - player.x, e.y - player.y) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);
    
    targets.forEach((t, i) => {
        const angle = player.angle + (i - 1) * 0.3;
        projectiles.push({
            x: player.x + Math.cos(angle) * player.size,
            y: player.y + Math.sin(angle) * player.size,
            vx: Math.cos(angle) * weapons.missiles.projectileSpeed,
            vy: Math.sin(angle) * weapons.missiles.projectileSpeed,
            damage: weapons.missiles.damage * player.damageMultiplier,
            size: weapons.missiles.projectileSize,
            type: 'missile',
            target: t.enemy,
            color: '#f0f',
            trail: []
        });
    });
}

function fireLaser() {
    const closestEnemies = enemies
        .filter(e => Math.hypot(e.x - player.x, e.y - player.y) < weapons.laser.range)
        .sort((a, b) => {
            const distA = Math.hypot(a.x - player.x, a.y - player.y);
            const distB = Math.hypot(b.x - player.x, b.y - player.y);
            return distA - distB;
        });
    
    const hitEnemies = new Set();
    let currentEnemy = closestEnemies[0];
    let chainCount = 0;
    
    while (currentEnemy && chainCount <= weapons.laser.chains) {
        if (!hitEnemies.has(currentEnemy)) {
            hitEnemies.add(currentEnemy);
            currentEnemy.health -= weapons.laser.damage * player.damageMultiplier * deltaTime;
            
            // Create laser particle
            particles.push({
                type: 'laser',
                x1: chainCount === 0 ? player.x : Array.from(hitEnemies)[chainCount - 1].x,
                y1: chainCount === 0 ? player.y : Array.from(hitEnemies)[chainCount - 1].y,
                x2: currentEnemy.x,
                y2: currentEnemy.y,
                life: 0.1,
                color: '#0f0',
                width: weapons.laser.width
            });
            
            // Find next chain target
            if (chainCount < weapons.laser.chains) {
                const nextTargets = enemies.filter(e => 
                    !hitEnemies.has(e) && 
                    Math.hypot(e.x - currentEnemy.x, e.y - currentEnemy.y) < 150
                );
                currentEnemy = nextTargets[0];
            }
            
            chainCount++;
        } else {
            break;
        }
    }
}

function plasmaBurst() {
    weapons.plasmaBurst.cooldown = weapons.plasmaBurst.maxCooldown;
    
    // Damage nearby enemies
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < weapons.plasmaBurst.radius) {
            const damage = weapons.plasmaBurst.damage * player.damageMultiplier * (1 - dist / weapons.plasmaBurst.radius);
            dealDamage(enemy, damage, true);
        }
    });
    
    // Visual effect
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 10;
        particles.push({
            type: 'plasma',
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 8,
            life: 0.5,
            color: '#f0f'
        });
    }
    
    // Screen shake
    screenShake(10);
}

// Drone functions
function spawnDrone() {
    const angle = Math.random() * Math.PI * 2;
    const drone = {
        x: player.x + Math.cos(angle) * 50,
        y: player.y + Math.sin(angle) * 50,
        angle: angle,
        orbitRadius: 50 + weapons.drones.list.length * 20,
        orbitSpeed: 2,
        lastFire: 0
    };
    weapons.drones.list.push(drone);
}

function updateDrones(dt) {
    weapons.drones.list.forEach((drone, index) => {
        // Orbit around player
        drone.angle += drone.orbitSpeed * dt;
        drone.x = player.x + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = player.y + Math.sin(drone.angle) * drone.orbitRadius;
        
        // Fire at enemies
        const now = Date.now();
        if (now - drone.lastFire > 1000 / weapons.drones.fireRate) {
            const target = findClosestEnemy(drone.x, drone.y);
            if (target) {
                const angle = Math.atan2(target.y - drone.y, target.x - drone.x);
                projectiles.push({
                    x: drone.x,
                    y: drone.y,
                    vx: Math.cos(angle) * 10,
                    vy: Math.sin(angle) * 10,
                    damage: weapons.drones.damage * player.damageMultiplier,
                    size: 3,
                    type: 'drone',
                    color: '#ff0'
                });
                drone.lastFire = now;
            }
        }
    });
}

// Update functions
function updateProjectiles(dt) {
    projectiles = projectiles.filter(proj => {
        // Movement
        proj.x += proj.vx * 60 * dt;
        proj.y += proj.vy * 60 * dt;
        
        // Missile homing
        if (proj.type === 'missile' && proj.target && enemies.includes(proj.target)) {
            const angle = Math.atan2(proj.target.y - proj.y, proj.target.x - proj.x);
            const currentAngle = Math.atan2(proj.vy, proj.vx);
            const newAngle = currentAngle + (angle - currentAngle) * weapons.missiles.homingStrength;
            const speed = Math.hypot(proj.vx, proj.vy);
            proj.vx = Math.cos(newAngle) * speed;
            proj.vy = Math.sin(newAngle) * speed;
            
            // Trail
            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > 10) proj.trail.shift();
        }
        
        // Bounds check
        return proj.x > -50 && proj.x < canvas.width + 50 && 
               proj.y > -50 && proj.y < canvas.height + 50;
    });
}

function updateEnemies(dt) {
    enemies = enemies.filter(enemy => {
        // AI behavior
        switch (enemy.ai) {
            case 'direct':
                moveTowardsPlayer(enemy, dt);
                break;
            case 'swarm':
                swarmBehavior(enemy, dt);
                break;
            case 'sniper':
                sniperBehavior(enemy, dt);
                break;
            case 'kamikaze':
                kamikazeBehavior(enemy, dt);
                break;
            case 'smart':
                smartBehavior(enemy, dt);
                break;
            case 'boss':
                bossBehavior(enemy, dt);
                break;
        }
        
        // Check if dead
        if (enemy.health <= 0) {
            onEnemyDeath(enemy);
            return false;
        }
        
        return true;
    });
}

function updateParticles(dt) {
    particles = particles.filter(particle => {
        particle.life -= dt;
        
        if (particle.type === 'explosion' || particle.type === 'plasma') {
            particle.x += particle.vx * 60 * dt;
            particle.y += particle.vy * 60 * dt;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
            particle.size *= 0.98;
        }
        
        return particle.life > 0;
    });
}

function updatePickups(dt) {
    pickups = pickups.filter(pickup => {
        // Attraction
        const dist = Math.hypot(pickup.x - player.x, pickup.y - player.y);
        
        if (dist < player.size + pickup.size) {
            // Collected
            if (pickup.type === 'exp') {
                player.exp += pickup.value;
                score += pickup.value * 10;
            } else if (pickup.type === 'health') {
                const healed = Math.min(player.maxHealth - player.health, pickup.value);
                player.health += healed;
                if (healed > 0) {
                    createDamageNumber(player.x, player.y - 30, `+${Math.floor(healed)}`, 'heal');
                }
            } else if (pickup.type === 'energy') {
                player.energy = Math.min(player.maxEnergy, player.energy + pickup.value);
            }
            return false;
        }
        
        // Move towards player if close
        if (dist < 150) {
            const angle = Math.atan2(player.y - pickup.y, player.x - pickup.x);
            const speed = 300 * dt;
            pickup.x += Math.cos(angle) * speed;
            pickup.y += Math.sin(angle) * speed;
        }
        
        // Float animation
        pickup.floatOffset = (pickup.floatOffset || 0) + dt * 2;
        
        return true;
    });
}

function updateDamageNumbers(dt) {
    const container = document.getElementById('damageNumbers');
    
    damageNumbers = damageNumbers.filter(dn => {
        dn.life -= dt;
        dn.y -= 50 * dt;
        
        if (dn.element) {
            dn.element.style.left = dn.x + 'px';
            dn.element.style.top = dn.y + 'px';
            dn.element.style.opacity = dn.life;
        }
        
        if (dn.life <= 0 && dn.element) {
            container.removeChild(dn.element);
            return false;
        }
        
        return true;
    });
}

// Enemy AI behaviors
function moveTowardsPlayer(enemy, dt) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * 60 * dt;
        enemy.y += (dy / dist) * enemy.speed * 60 * dt;
    }
}

function swarmBehavior(enemy, dt) {
    // Move towards player with some randomness
    const dx = player.x - enemy.x + (Math.random() - 0.5) * 100;
    const dy = player.y - enemy.y + (Math.random() - 0.5) * 100;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 0) {
        enemy.x += (dx / dist) * enemy.speed * 60 * dt;
        enemy.y += (dy / dist) * enemy.speed * 60 * dt;
    }
    
    // Avoid other swarm enemies
    enemies.forEach(other => {
        if (other !== enemy && other.type === 'swarm') {
            const dx = enemy.x - other.x;
            const dy = enemy.y - other.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 30 && dist > 0) {
                enemy.x += (dx / dist) * 50 * dt;
                enemy.y += (dy / dist) * 50 * dt;
            }
        }
    });
}

function sniperBehavior(enemy, dt) {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    
    if (dist < enemy.range - 50) {
        // Too close, back away
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        enemy.x += (dx / dist) * enemy.speed * 60 * dt;
        enemy.y += (dy / dist) * enemy.speed * 60 * dt;
    } else if (dist > enemy.range + 50) {
        // Too far, move closer
        moveTowardsPlayer(enemy, dt);
    }
    
    // Shoot at player
    enemy.shootCooldown = (enemy.shootCooldown || 0) - dt;
    if (enemy.shootCooldown <= 0 && dist < enemy.range) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        projectiles.push({
            x: enemy.x + Math.cos(angle) * enemy.size,
            y: enemy.y + Math.sin(angle) * enemy.size,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            damage: enemy.damage,
            size: 6,
            type: 'enemyBullet',
            color: '#f00'
        });
        enemy.shootCooldown = 2;
    }
}

function kamikazeBehavior(enemy, dt) {
    // Accelerate towards player
    enemy.speed *= 1.01;
    moveTowardsPlayer(enemy, dt);
    
    // Flash when close
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < 100) {
        enemy.flashing = true;
    }
}

function smartBehavior(enemy, dt) {
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    
    // Strafe around player
    enemy.strafeAngle = (enemy.strafeAngle || 0) + dt * 2;
    const strafeX = Math.cos(enemy.strafeAngle) * 100;
    const strafeY = Math.sin(enemy.strafeAngle) * 100;
    
    const targetX = player.x + strafeX;
    const targetY = player.y + strafeY;
    
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const tdist = Math.hypot(dx, dy);
    
    if (tdist > 0) {
        enemy.x += (dx / tdist) * enemy.speed * 60 * dt;
        enemy.y += (dy / tdist) * enemy.speed * 60 * dt;
    }
    
    // Dodge projectiles
    projectiles.forEach(proj => {
        if (proj.type !== 'enemyBullet') {
            const pdist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (pdist < 50) {
                const avoidX = enemy.x - proj.x;
                const avoidY = enemy.y - proj.y;
                enemy.x += (avoidX / pdist) * 100 * dt;
                enemy.y += (avoidY / pdist) * 100 * dt;
            }
        }
    });
}

function bossBehavior(enemy, dt) {
    enemy.phase = enemy.phase || 1;
    enemy.attackTimer = (enemy.attackTimer || 0) - dt;
    
    // Movement pattern based on phase
    if (enemy.phase === 1) {
        // Circle around player
        enemy.angle = (enemy.angle || 0) + dt * 0.5;
        const radius = 300;
        enemy.x += ((player.x + Math.cos(enemy.angle) * radius) - enemy.x) * 0.02;
        enemy.y += ((player.y + Math.sin(enemy.angle) * radius) - enemy.y) * 0.02;
        
        // Spiral attack
        if (enemy.attackTimer <= 0) {
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12 + enemy.angle;
                projectiles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    damage: 15,
                    size: 8,
                    type: 'enemyBullet',
                    color: '#f00'
                });
            }
            enemy.attackTimer = 1.5;
        }
    }
    
    // Phase change
    if (enemy.health < enemy.maxHealth * 0.5 && enemy.phase === 1) {
        enemy.phase = 2;
        enemy.speed *= 1.5;
        createBossPhaseEffect(enemy);
    }
}

// Spawn enemies
function spawnEnemies(dt) {
    const wave = Math.floor(gameTime / 30) + 1;
    const spawnRate = Math.min(1 + wave * 0.5, 5);
    
    enemy.spawnTimer = (enemy.spawnTimer || 0) - dt;
    
    if (enemy.spawnTimer <= 0) {
        // Determine enemy type based on wave
        let type;
        const rand = Math.random();
        
        if (wave >= 10 && gameTime % 60 < 1 && !enemies.find(e => e.type === 'boss')) {
            type = 'boss';
            showWaveAnnouncement('BOSS INCOMING!', true);
        } else if (wave >= 8 && rand < 0.1) {
            type = 'elite';
        } else if (wave >= 6 && rand < 0.15) {
            type = 'bomber';
        } else if (wave >= 4 && rand < 0.2) {
            type = 'sniper';
        } else if (wave >= 3 && rand < 0.3) {
            type = 'tank';
        } else if (wave >= 2 && rand < 0.5) {
            type = 'swarm';
        } else {
            type = 'grunt';
        }
        
        spawnEnemy(type);
        enemy.spawnTimer = 1 / spawnRate;
    }
    
    // Wave announcements
    if (Math.floor(gameTime / 30) > Math.floor((gameTime - dt) / 30)) {
        showWaveAnnouncement(`WAVE ${wave}`, false);
    }
}

function spawnEnemy(type) {
    const template = enemyTypes[type];
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(edge) {
        case 0: // Top
            x = Math.random() * canvas.width;
            y = -template.size;
            break;
        case 1: // Right
            x = canvas.width + template.size;
            y = Math.random() * canvas.height;
            break;
        case 2: // Bottom
            x = Math.random() * canvas.width;
            y = canvas.height + template.size;
            break;
        case 3: // Left
            x = -template.size;
            y = Math.random() * canvas.height;
            break;
    }
    
    enemies.push({
        x: x,
        y: y,
        type: type,
        ...template,
        maxHealth: template.health
    });
}

// Collision detection
function checkCollisions() {
    // Player-enemy collisions
    if (!player.invulnerable && !weapons.shield.active) {
        enemies.forEach(enemy => {
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (dist < player.size + enemy.size) {
                const damage = enemy.damage * (1 - player.armor);
                player.health -= damage;
                createDamageNumber(player.x, player.y, Math.floor(damage), 'normal');
                
                // Knockback
                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                player.x += Math.cos(angle) * 20;
                player.y += Math.sin(angle) * 20;
                
                // Explosion effect for kamikaze
                if (enemy.type === 'bomber') {
                    createExplosion(enemy.x, enemy.y, 50, '#fa0');
                    enemy.health = 0;
                }
                
                player.invulnerable = true;
                player.invulnerabilityTime = 0.5;
            }
        });
    }
    
    // Projectile collisions
    projectiles = projectiles.filter(proj => {
        if (proj.type === 'enemyBullet') {
            // Check player collision
            if (!player.invulnerable && !weapons.shield.active) {
                const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
                if (dist < player.size) {
                    const damage = proj.damage * (1 - player.armor);
                    player.health -= damage;
                    createDamageNumber(player.x, player.y, Math.floor(damage), 'normal');
                    createHitEffect(proj.x, proj.y, '#f00');
                    return false;
                }
            }
        } else {
            // Check enemy collisions
            for (let enemy of enemies) {
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (dist < proj.size + enemy.size) {
                    dealDamage(enemy, proj.damage);
                    createHitEffect(proj.x, proj.y, proj.color);
                    
                    // Pierce
                    if (proj.pierce > 0) {
                        proj.pierce--;
                        return true;
                    }
                    
                    return false;
                }
            }
        }
        return true;
    });
}

// Damage and effects
function dealDamage(enemy, damage, isExplosion = false) {
    const isCrit = Math.random() < player.critChance;
    const finalDamage = damage * (isCrit ? player.critDamage : 1);
    
    enemy.health -= finalDamage;
    createDamageNumber(
        enemy.x + (Math.random() - 0.5) * 20, 
        enemy.y - enemy.size, 
        Math.floor(finalDamage), 
        isCrit ? 'crit' : 'normal'
    );
    
    // Update combo
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    comboTimer = 2;
    updateComboDisplay();
}

function onEnemyDeath(enemy) {
    // Effects
    createExplosion(enemy.x, enemy.y, enemy.size, enemy.color);
    
    // Drops
    pickups.push({
        x: enemy.x,
        y: enemy.y,
        type: 'exp',
        value: enemy.exp,
        size: 8
    });
    
    // Chance for health/energy drops
    if (Math.random() < 0.1) {
        pickups.push({
            x: enemy.x + (Math.random() - 0.5) * 30,
            y: enemy.y + (Math.random() - 0.5) * 30,
            type: Math.random() < 0.7 ? 'health' : 'energy',
            value: 20,
            size: 12
        });
    }
    
    // Score
    score += enemy.score * combo;
    
    // Boss defeat
    if (enemy.type === 'boss') {
        screenShake(20);
        // Bonus exp
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            pickups.push({
                x: enemy.x + Math.cos(angle) * 50,
                y: enemy.y + Math.sin(angle) * 50,
                type: 'exp',
                value: 10,
                size: 10
            });
        }
    }
}

// Visual effects
function createExplosion(x, y, size, color = '#ff0') {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            type: 'explosion',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * size/2 + 2,
            life: Math.random() * 0.5 + 0.3,
            color: color
        });
    }
}

function createHitEffect(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            type: 'hit',
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            size: Math.random() * 3 + 1,
            life: 0.2,
            color: color
        });
    }
}

function createBoostParticles() {
    const backAngle = player.angle + Math.PI;
    for (let i = 0; i < 2; i++) {
        particles.push({
            type: 'boost',
            x: player.x + Math.cos(backAngle) * player.size,
            y: player.y + Math.sin(backAngle) * player.size,
            vx: Math.cos(backAngle + (Math.random() - 0.5) * 0.5) * 3,
            vy: Math.sin(backAngle + (Math.random() - 0.5) * 0.5) * 3,
            size: 5,
            life: 0.3,
            color: '#0ff'
        });
    }
}

function createPhaseEffect() {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        particles.push({
            type: 'phase',
            x: player.x + Math.cos(angle) * player.size,
            y: player.y + Math.sin(angle) * player.size,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            size: 4,
            life: 0.5,
            color: '#fff'
        });
    }
}

function createBossPhaseEffect(boss) {
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * boss.size;
        particles.push({
            type: 'explosion',
            x: boss.x + Math.cos(angle) * dist,
            y: boss.y + Math.sin(angle) * dist,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            size: 10,
            life: 1,
            color: '#fff'
        });
    }
}

function createDamageNumber(x, y, text, type) {
    const element = document.createElement('div');
    element.className = `damage-number damage-${type}`;
    element.textContent = text;
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    
    document.getElementById('damageNumbers').appendChild(element);
    
    damageNumbers.push({
        element: element,
        x: x,
        y: y,
        life: 1
    });
}

// Screen shake
let shakeAmount = 0;
function screenShake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
}

// Level up
function levelUp() {
    player.level++;
    player.exp -= player.expToNext;
    player.expToNext = Math.floor(player.expToNext * 1.5);
    
    // Pause and show upgrades
    gameState = 'upgrading';
    showUpgradeMenu();
}

function showUpgradeMenu() {
    const menu = document.getElementById('upgradeMenu');
    const options = document.getElementById('upgradeOptions');
    
    // Clear previous options
    options.innerHTML = '';
    
    // Get available upgrades
    const available = upgradePool.filter(u => !u.condition || u.condition());
    const selected = [];
    
    // Select up to 3 random upgrades
    for (let i = 0; i < 3 && available.length > 0; i++) {
        const index = Math.floor(Math.random() * available.length);
        selected.push(available.splice(index, 1)[0]);
    }
    
    // Create upgrade cards
    selected.forEach(upgrade => {
        const div = document.createElement('div');
        div.className = 'upgrade-option';
        div.innerHTML = `
            <div class="upgrade-rarity rarity-${upgrade.rarity}">${upgrade.rarity.toUpperCase()}</div>
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;
        div.onclick = () => {
            upgrade.apply();
            menu.classList.add('hidden');
            gameState = 'playing';
            updateWeaponIndicators();
        };
        options.appendChild(div);
    });
    
    menu.classList.remove('hidden');
}

// UI updates
function updateUI() {
    // Health
    document.getElementById('healthBarFill').style.width = (player.health / player.maxHealth * 100) + '%';
    document.getElementById('healthText').textContent = `${Math.floor(player.health)}/${player.maxHealth}`;
    
    // Experience
    document.getElementById('expBarFill').style.width = (player.exp / player.expToNext * 100) + '%';
    document.getElementById('levelText').textContent = player.level;
    
    // Energy
    document.getElementById('energyBarFill').style.width = (player.energy / player.maxEnergy * 100) + '%';
    document.getElementById('energyText').textContent = `${Math.floor(player.energy)}/${player.maxEnergy}`;
    
    // Stats
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    document.getElementById('timeText').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('killsText').textContent = enemies.filter(e => e.health <= 0).length;
    document.getElementById('waveText').textContent = Math.floor(gameTime / 30) + 1;
    document.getElementById('scoreText').textContent = Math.floor(score).toLocaleString();
}

function updateComboDisplay() {
    const counter = document.getElementById('comboCounter');
    const number = document.getElementById('comboNumber');
    
    if (combo > 1) {
        counter.classList.remove('hidden');
        number.textContent = `x${combo}`;
    }
}

function updateWeaponIndicators() {
    document.getElementById('missileIndicator').classList.toggle('inactive', !weapons.missiles.enabled);
    document.getElementById('laserIndicator').classList.toggle('inactive', !weapons.laser.enabled);
    document.getElementById('shieldIndicator').classList.toggle('inactive', !weapons.shield.enabled);
    document.getElementById('shieldIndicator').classList.toggle('active', weapons.shield.active);
    document.getElementById('droneIndicator').classList.toggle('inactive', !weapons.drones.enabled);
}

function showWaveAnnouncement(text, isBoss) {
    const announcement = document.getElementById('waveAnnouncement');
    const waveText = announcement.querySelector('.wave-text');
    const subtitle = document.getElementById('waveSubtitle');
    
    if (isBoss) {
        waveText.innerHTML = text;
        subtitle.textContent = 'Prepare for battle!';
        waveText.style.color = '#f00';
    } else {
        waveText.innerHTML = text;
        subtitle.textContent = 'Enemies incoming!';
        waveText.style.color = '#ff0';
    }
    
    announcement.classList.remove('hidden');
    setTimeout(() => {
        announcement.classList.add('hidden');
    }, 2000);
}

// Game over
function gameOver() {
    gameState = 'gameover';
    
    // Update final stats
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    document.getElementById('finalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('finalKills').textContent = enemies.filter(e => e.health <= 0).length;
    document.getElementById('finalLevel').textContent = player.level;
    document.getElementById('finalScore').textContent = Math.floor(score).toLocaleString();
    document.getElementById('finalCombo').textContent = `x${maxCombo}`;
    
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// Render functions
function render() {
    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    renderBackground();
    
    // Apply screen shake
    if (shakeAmount > 0) {
        ctx.save();
        ctx.translate(
            (Math.random() - 0.5) * shakeAmount,
            (Math.random() - 0.5) * shakeAmount
        );
        shakeAmount *= 0.9;
    }
    
    // Game elements
    if (gameState !== 'menu') {
        renderGrid();
        renderPickups();
        renderEnemies();
        renderProjectiles();
        renderPlayer();
        renderParticles();
    }
    
    if (shakeAmount > 0) {
        ctx.restore();
    }
}

function renderBackground() {
    bgCtx.fillStyle = '#000';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // Stars
    bgCtx.fillStyle = '#fff';
    stars.forEach(star => {
        bgCtx.beginPath();
        bgCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        bgCtx.fill();
        
        // Move stars
        star.y += star.speed;
        if (star.y > bgCanvas.height) {
            star.y = 0;
            star.x = Math.random() * bgCanvas.width;
        }
    });
}

function renderGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function renderPickups() {
    pickups.forEach(pickup => {
        ctx.save();
        ctx.translate(pickup.x, pickup.y + Math.sin(pickup.floatOffset || 0) * 5);
        
        if (pickup.type === 'exp') {
            ctx.fillStyle = '#0f0';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#0f0';
            ctx.fillRect(-pickup.size/2, -pickup.size/2, pickup.size, pickup.size);
        } else if (pickup.type === 'health') {
            ctx.fillStyle = '#f00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f00';
            ctx.beginPath();
            ctx.arc(0, 0, pickup.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', 0, 0);
        } else if (pickup.type === 'energy') {
            ctx.fillStyle = '#00f';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f';
            ctx.beginPath();
            ctx.arc(0, 0, pickup.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

function renderEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        // Flashing effect for kamikaze
        if (enemy.flashing) {
            ctx.globalAlpha = 0.5 + Math.sin(gameTime * 20) * 0.5;
        }
        
        // Draw enemy
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
        
        if (enemy.type === 'boss') {
            // Boss shape
            ctx.rotate(gameTime);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8;
                const radius = i % 2 === 0 ? enemy.size : enemy.size * 0.7;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (enemy.type === 'tank') {
            // Tank shape
            ctx.fillRect(-enemy.size, -enemy.size * 0.8, enemy.size * 2, enemy.size * 1.6);
            ctx.fillStyle = '#888';
            ctx.fillRect(-enemy.size * 0.6, -enemy.size * 1.2, enemy.size * 1.2, enemy.size * 0.6);
        } else if (enemy.type === 'elite') {
            // Diamond shape
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-enemy.size * 0.7, -enemy.size * 0.7, enemy.size * 1.4, enemy.size * 1.4);
        } else {
            // Circle
            ctx.beginPath();
            ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Health bar
        if (enemy.health < enemy.maxHealth) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#000';
            ctx.fillRect(-enemy.size, -enemy.size - 10, enemy.size * 2, 4);
            ctx.fillStyle = enemy.type === 'boss' ? '#fff' : '#f00';
            ctx.fillRect(-enemy.size, -enemy.size - 10, (enemy.health / enemy.maxHealth) * enemy.size * 2, 4);
        }
        
        ctx.restore();
    });
}

function renderProjectiles() {
    projectiles.forEach(proj => {
        ctx.save();
        
        // Missile trail
        if (proj.type === 'missile' && proj.trail) {
            ctx.strokeStyle = proj.color;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = proj.size;
            ctx.beginPath();
            proj.trail.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }
        
        // Projectile
        ctx.globalAlpha = 1;
        ctx.fillStyle = proj.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

function renderPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Invulnerability effect
    if (player.invulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(gameTime * 10) * 0.3;
    }
    
    // Shield
    if (weapons.shield.active) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.globalAlpha = 0.5 + Math.sin(gameTime * 5) * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, player.size + 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    // Drones
    if (weapons.drones.enabled) {
        weapons.drones.list.forEach(drone => {
            ctx.save();
            ctx.translate(drone.x - player.x, drone.y - player.y);
            ctx.fillStyle = '#ff0';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    
    // Mecha body
    ctx.rotate(player.angle);
    
    // Main body
    ctx.fillStyle = '#00f';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f';
    ctx.fillRect(-player.size * 0.8, -player.size * 0.5, player.size * 1.6, player.size);
    
    // Cockpit
    ctx.fillStyle = '#0ff';
    ctx.fillRect(player.size * 0.2, -player.size * 0.3, player.size * 0.4, player.size * 0.6);
    
    // Weapons
    ctx.fillStyle = '#888';
    ctx.fillRect(player.size * 0.5, -player.size * 0.4, player.size * 0.3, player.size * 0.2);
    ctx.fillRect(player.size * 0.5, player.size * 0.2, player.size * 0.3, player.size * 0.2);
    
    // Engine glow
    if (keys['shift'] && player.boostEnabled) {
        ctx.fillStyle = '#0ff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-player.size * 1.2, -player.size * 0.3, player.size * 0.4, player.size * 0.6);
    }
    
    ctx.restore();
}

function renderParticles() {
    particles.forEach(particle => {
        ctx.save();
        
        if (particle.type === 'laser') {
            ctx.strokeStyle = particle.color;
            ctx.lineWidth = particle.width || 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.globalAlpha = particle.life * 5;
            ctx.beginPath();
            ctx.moveTo(particle.x1, particle.y1);
            ctx.lineTo(particle.x2, particle.y2);
            ctx.stroke();
        } else {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

// Helper functions
function findClosestEnemy(x, y) {
    let closest = null;
    let minDist = Infinity;
    
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < minDist) {
            minDist = dist;
            closest = enemy;
        }
    });
    
    return closest;
}

// Initialize game
enemy = { spawnTimer: 0 };
init();
