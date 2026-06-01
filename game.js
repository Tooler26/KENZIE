const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// 1. FIXED MASTER TRACK CONFIGURATIONS
// ==========================================================================
const COMMON_TRACK_COORDS = [
    {r:7, c:1},  {r:7, c:2},  {r:7, c:3},  {r:7, c:4},  {r:7, c:5},  {r:7, c:6},  // Green Start Runway Area
    {r:6, c:7},  {r:5, c:7},  {r:4, c:7},  {r:3, c:7},  {r:2, c:7},  {r:1, c:7},  
    {r:1, c:8},  
    {r:1, c:9},  {r:2, c:9},  {r:3, c:9},  {r:4, c:9},  {r:5, c:9},  {r:6, c:9},  // Yellow Start Runway Area
    {r:7, c:10}, {r:7, c:11}, {r:7, c:12}, {r:7, c:13}, {r:7, c:14}, {r:7, c:15}, 
    {r:8, c:15}, 
    {r:9, c:15}, {r:9, c:14}, {r:9, c:13}, {r:9, c:12}, {r:9, c:11}, {r:9, c:10}, // Blue Start Runway Area
    {r:10, c:9}, {r:11, c:9}, {r:12, c:9}, {r:13, c:9}, {r:14, c:9}, {r:15, c:9}, 
    {r:15, c:8}, 
    {r:15, c:7}, {r:14, c:7}, {r:13, c:7}, {r:12, c:7}, {r:11, c:7}, {r:10, c:7}, // Red Start Runway Area
    {r:9, c:6},  {r:9, c:5},  {r:9, c:4},  {r:9, c:3},  {r:9, c:2},  {r:9, c:1},  
    {r:8, c:1}   
];

const HOME_RUN_COORDS = {
    red:    [{r:8, c:2}, {r:8, c:3}, {r:8, c:4}, {r:8, c:5}, {r:8, c:6}, {r:8, c:7}],
    green:  [{r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}, {r:6, c:8}, {r:7, c:8}],
    yellow: [{r:8, c:14},{r:8, c:13},{r:8, c:12},{r:8, c:11},{r:8, c:10},{r:8, c:9}],
    blue:   [{r:14, c:8},{r:13, c:8},{r:12, c:8},{r:11, c:8},{r:10, c:8},{r:9, c:8}]
};

const YARD_HOLE_COORDS = {
    red:    [{r:3, c:3}, {r:3, c:4}, {r:4, c:3}, {r:4, c:4}],
    green:  [{r:3, c:12}, {r:3, c:13}, {r:4, c:12}, {r:4, c:13}],
    yellow: [{r:12, c:12}, {r:12, c:13}, {r:13, c:12}, {r:13, c:13}],
    blue:   [{r:12, c:3}, {r:12, c:4}, {r:13, c:3}, {r:13, c:4}]
};

// --- FIX: Corrected absolute launch entry index offsets ---
const START_OFFSETS = { green: 0, yellow: 13, blue: 26, red: 39 };
const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

let gameState = {
    currentPlayer: 'red',
    lastRoll: 0,
    hasRolled: false,
    consecutiveSixes: 0, // Counter for the Three-Sixes Rule
    tokens: [],
    gameActive: true
};

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) { window.location.href = 'index.html'; return; }

    const board = document.getElementById('ludo-board');
    const diceBtn = document.getElementById('roll-dice-btn');
    const visualDice = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');
    const turnIndicator = document.getElementById('current-player-turn');

    function initializeMatch() {
        board.querySelectorAll('.token-wrapper').forEach(t => t.remove());
        gameState.tokens = [];
        gameState.currentPlayer = 'red';
        gameState.lastRoll = 0;
        gameState.hasRolled = false;
        gameState.consecutiveSixes = 0;
        gameState.gameActive = true;

        const colors = ['red', 'green', 'yellow', 'blue'];
        colors.forEach(color => {
            for (let i = 0; i < 4; i++) {
                const homeYard = YARD_HOLE_COORDS[color][i];
                const token = {
                    id: `${color}-${i}`,
                    color: color,
                    index: i,
                    status: 'yard',
                    stepCount: 0,
                    trackIndex: -1
                };
                gameState.tokens.push(token);

                const wrapper = document.createElement('div');
                wrapper.className = `token-wrapper token-${color}`;
                wrapper.id = token.id;
                wrapper.style.gridRowStart = homeYard.r;
                wrapper.style.gridColumnStart = homeYard.c;

                const shadow = document.createElement('div');
                shadow.className = 'token-ambient-shadow';

                const img = document.createElement('img');
                img.src = `${color}.jpg`;
                img.className = 'token-pawn-graphic';
                img.alt = color;

                img.onerror = () => {
                    img.style.display = 'none';
                    wrapper.classList.add('fallback-circle');
                    wrapper.innerText = color.charAt(0).toUpperCase();
                };

                wrapper.appendChild(shadow);
                wrapper.appendChild(img);
                wrapper.addEventListener('click', () => processTokenInteraction(token));
                board.appendChild(wrapper);
            }
        });

        updateTurnHUD();
        logMessage("🔴 Red starts! Roll the dice.");
    }

    // ==========================================================================
    // 2. CORE INTERACTION AND BLOCK / HIT REFEREE
    // ==========================================================================
    function processTokenInteraction(token) {
        if (!gameState.gameActive) return;
        if (token.color !== gameState.currentPlayer) {
            return logMessage(`It is ${gameState.currentPlayer.toUpperCase()}'s turn!`);
        }
        if (!gameState.hasRolled) {
            return logMessage(`Roll the dice first!`);
        }

        const el = document.getElementById(token.id);
        const roll = gameState.lastRoll;

        // Rule A: Leaving the Yard
        if (token.status === 'yard') {
            if (roll === 6) {
                // Check if our own start cell is blocked by another of our tokens
                const targetIndex = START_OFFSETS[token.color];
                if (isCellBlockedByEnemy(targetIndex, token.color)) {
                    return logMessage(`Movement blocked! An opponent block prevents your entry.`);
                }

                token.status = 'track';
                token.stepCount = 0;
                token.trackIndex = targetIndex; // Uses newly corrected launch mappings
                
                repositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                logMessage(`🚀 ${token.color.toUpperCase()} pawn deployed to its launchpad space!`);
                evaluateCollisions(token);
                completeTurnSequence(true); // 6 awards bonus roll
            } else {
                logMessage(`You must roll a 6 to bring a pawn out from the yard.`);
            }
            return;
        }

        // Rule B: Traversing the main track
        if (token.status === 'track') {
            const potentialSteps = token.stepCount + roll;

            // Check path for opponent "Blocks"
            if (isPathBlockedByEnemy(token.trackIndex, roll, token.color)) {
                return logMessage(`🚫 Blocked! You cannot pass through an opponent block.`);
            }

            if (potentialSteps <= 51) {
                token.stepCount = potentialSteps;
                token.trackIndex = (token.trackIndex + roll) % 52;
                repositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                evaluateCollisions(token);
                completeTurnSequence(roll === 6);
            } else {
                // Enter Home Column
                const homeIndex = potentialSteps - 52;
                if (homeIndex <= 5) {
                    token.status = 'homerun';
                    token.stepCount = potentialSteps;
                    token.trackIndex = homeIndex;
                    repositionUI(el, HOME_RUN_COORDS[token.color][token.trackIndex]);
                    completeTurnSequence(roll === 6);
                } else if (homeIndex === 6) {
                    token.status = 'finished';
                    el.style.opacity = '0.2';
                    logMessage(`✨ Goal! ${token.color.toUpperCase()} made it to safety.`);
                    checkWinConditions(token.color);
                    completeTurnSequence(true);
                } else {
                    logMessage(`Roll too high to enter the home column.`);
                }
            }
            return;
        }

        // Rule C: Home Run Path Exact fit
        if (token.status === 'homerun') {
            const targetHomeIndex = token.trackIndex + roll;
            if (targetHomeIndex <= 5) {
                token.trackIndex = targetHomeIndex;
                token.stepCount += roll;
                repositionUI(el, HOME_RUN_COORDS[token.color][token.trackIndex]);
                completeTurnSequence(roll === 6);
            } else if (targetHomeIndex === 6) {
                token.status = 'finished';
                el.style.opacity = '0.2';
                logMessage(`✨ Goal! ${token.color.toUpperCase()} reached the final triangle.`);
                checkWinConditions(token.color);
                completeTurnSequence(true);
            } else {
                logMessage(`Roll too high! Exact number needed to finish.`);
            }
        }
    }

    // ==========================================================================
    // 3. BLOCKING AND CAPTURE VERIFICATIONS
    // ==========================================================================
    function isCellBlockedByEnemy(trackIndex, playerColor) {
        // A block is formed when 2 or more tokens of the same enemy color occupy a cell
        const matchingTokens = gameState.tokens.filter(t => t.status === 'track' && t.trackIndex === trackIndex);
        if (matchingTokens.length >= 2 && matchingTokens[0].color !== playerColor) {
            return true;
        }
        return false;
    }

    function isPathBlockedByEnemy(startIndex, steps, playerColor) {
        for (let i = 1; i <= steps; i++) {
            const checkIndex = (startIndex + i) % 52;
            if (isCellBlockedByEnemy(checkIndex, playerColor)) {
                return true;
            }
        }
        return false;
    }

    function evaluateCollisions(movedToken) {
        // Filter out tokens on the exact same common track cell
        const occupants = gameState.tokens.filter(other => 
            other.id !== movedToken.id &&
            other.status === 'track' &&
            other.trackIndex === movedToken.trackIndex
        );

        if (occupants.length > 0) {
            // Safe Zones check
            if (SAFE_INDICES.includes(movedToken.trackIndex)) {
                logMessage(`Safe Zone cell. Multiple colors are resting here safely.`);
                return;
            }

            const enemy = occupants.find(t => t.color !== movedToken.color);
            if (enemy) {
                logMessage(`💥 Cut! ${movedToken.color.toUpperCase()} captured ${enemy.color.toUpperCase()}'s token!`);
                enemy.status = 'yard';
                enemy.stepCount = 0;
                enemy.trackIndex = -1;

                const enemyEl = document.getElementById(enemy.id);
                repositionUI(enemyEl, YARD_HOLE_COORDS[enemy.color][enemy.index]);
            }
        }
    }

    function checkWinConditions(color) {
        const hasWon = gameState.tokens.filter(t => t.color === color).every(t => t.status === 'finished');
        if (hasWon) {
            gameState.gameActive = false;
            diceBtn.disabled = true;
            alert(`🏆 The ${color.toUpperCase()} Player wins the game!`);
        }
    }

    function completeTurnSequence(earnedBonus = false) {
        gameState.hasRolled = false;
        gameState.lastRoll = 0;

        if (earnedBonus && gameState.gameActive) {
            diceBtn.disabled = false;
            updateTurnHUD();
            logMessage(`🎲 Bonus Roll! ${gameState.currentPlayer.toUpperCase()} gets another go.`);
            return;
        }

        // Reset the 6s tracker on regular handoffs
        gameState.consecutiveSixes = 0;

        const order = ['red', 'green', 'yellow', 'blue'];
        let nextIdx = (order.indexOf(gameState.currentPlayer) + 1) % 4;
        gameState.currentPlayer = order[nextIdx];

        diceBtn.disabled = false;
        updateTurnHUD();
    }

    function updateTurnHUD() {
        let text = `${gameState.currentPlayer.toUpperCase()}'s Turn — `;
        if (!gameState.hasRolled) {
            text += "Roll Dice";
        } else {
            text += `Select Piece to move (${gameState.lastRoll})`;
        }
        turnIndicator.textContent = text;
        turnIndicator.className = `turn-${gameState.currentPlayer}`;
    }

    function repositionUI(element, points) {
        element.style.gridRowStart = points.r;
        element.style.gridColumnStart = points.c;
    }

    function logMessage(msg) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = msg;
        logContainer.appendChild(p);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // ==========================================================================
    // 4. DICE CONTROLLER ENGINE (WITH 3-SIXES EXCEPTION FOUL)
    // ==========================================================================
    const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    diceBtn.addEventListener('click', () => {
        if (!gameState.gameActive || gameState.hasRolled) return;
        diceBtn.disabled = true;
        let ticks = 0;

        const shuffle = setInterval(() => {
            const temp = Math.floor(Math.random() * 6) + 1;
            visualDice.textContent = diceFaces[temp];
            ticks++;

            if (ticks > 8) {
                clearInterval(shuffle);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                visualDice.textContent = diceFaces[finalRoll];

                gameState.lastRoll = finalRoll;
                gameState.hasRolled = true;
                logMessage(`${gameState.currentPlayer.toUpperCase()} rolled a ${finalRoll}.`);

                // Evaluate Three-Sixes Rule Exception Foul
                if (finalRoll === 6) {
                    gameState.consecutiveSixes++;
                    if (gameState.consecutiveSixes === 3) {
                        logMessage(`⚠️ FOUL! 3 consecutive 6s rolled. Turn forfeited immediately!`);
                        setTimeout(() => completeTurnSequence(false), 1500);
                        return;
                    }
                } else {
                    gameState.consecutiveSixes = 0;
                }

                // Auto-Pass Assessment
                const team = gameState.tokens.filter(t => t.color === gameState.currentPlayer);
                const canMove = team.some(p => {
                    if (p.status === 'yard' && finalRoll === 6) {
                        return !isCellBlockedByEnemy(START_OFFSETS[p.color], p.color);
                    }
                    if (p.status === 'track') {
                        return !isPathBlockedByEnemy(p.trackIndex, finalRoll, p.color);
                    }
                    if (p.status === 'homerun') {
                        return p.trackIndex + finalRoll <= 6;
                    }
                    return false;
                });

                if (!canMove) {
                    logMessage("No legal moves possible with this roll. Skipping turn...");
                    setTimeout(() => completeTurnSequence(false), 1500);
                } else {
                    updateTurnHUD();
                }
            }
        }, 70);
    });

    initializeMatch();
});