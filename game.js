const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================================================
// 1. RE-CALCULATED MATRIX COORDINATES (MATCHES YOUR IMAGE)
// ==========================================================================
// A 52-cell continuous clockwise tracking array mapped precisely to your board.
const COMMON_TRACK_COORDS = [
    // --- LEFT ARM (Moving Right) ---
    {r:7, c:1},  {r:7, c:2},  {r:7, c:3},  {r:7, c:4},  {r:7, c:5},  {r:7, c:6},  
    // --- TOP ARM (Moving Up, then Down) ---
    {r:6, c:7},  {r:5, c:7},  {r:4, c:7},  {r:3, c:7},  {r:2, c:7},  {r:1, c:7},  
    {r:1, c:8}, // Crossover peak 
    {r:1, c:9},  {r:2, c:9},  {r:3, c:9},  {r:4, c:9},  {r:5, c:9},  {r:6, c:9},  
    // --- RIGHT ARM (Moving Right, then Left) ---
    {r:7, c:10}, {r:7, c:11}, {r:7, c:12}, {r:7, c:13}, {r:7, c:14}, {r:7, c:15}, 
    {r:8, c:15}, // Right crossover edge
    {r:9, c:15}, {r:9, c:14}, {r:9, c:13}, {r:9, c:12}, {r:9, c:11}, {r:9, c:10},  
    // --- BOTTOM ARM (Moving Down, then Up) ---
    {r:10, c:9}, {r:11, c:9}, {r:12, c:9}, {r:13, c:9}, {r:14, c:9}, {r:15, c:9}, 
    {r:15, c:8}, // Bottom crossover edge
    {r:15, c:7}, {r:14, c:7}, {r:13, c:7}, {r:12, c:7}, {r:11, c:7}, {r:10, c:7}, 
    // --- LEFT ARM BACK (Moving Left back to start) ---
    {r:9, c:6},  {r:9, c:5},  {r:9, c:4},  {r:9, c:3},  {r:9, c:2},  {r:9, c:1},  
    {r:8, c:1}   // Final loop cell before wrapping back to index 0
];

// Colored runways inside the track pointing directly toward the center triangle
const HOME_RUN_COORDS = {
    red:    [{r:8, c:2}, {r:8, c:3}, {r:8, c:4}, {r:8, c:5}, {r:8, c:6}, {r:8, c:7}],
    green:  [{r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}, {r:6, c:8}, {r:7, c:8}],
    yellow: [{r:8, c:14},{r:8, c:13},{r:8, c:12},{r:8, c:11},{r:8, c:10},{r:8, c:9}],
    blue:   [{r:14, c:8},{r:13, c:8},{r:12, c:8},{r:11, c:8},{r:10, c:8},{r:9, c:8}]
};

// Precise positions matching the 4 circular token holders inside each corner base
const YARD_HOLE_COORDS = {
    red:    [{r:4, c:4}, {r:4, c:7}, {r:7, c:4}, {r:7, c:7}],     // Top-Left
    green:  [{r:4, c:11},{r:4, c:14},{r:7, c:11},{r:7, c:14}],    // Top-Right
    blue:   [{r:11, c:4},{r:11, c:7},{r:14, c:4},{r:14, c:7}],    // Bottom-Left
    yellow: [{r:11, c:11},{r:11, c:14},{r:14, c:11},{r:14, c:14}]  // Bottom-Right
};

// Safe indexes matching gold stars visible along your common track loops
const SAFE_INDICES = [2, 8, 15, 21, 28, 34, 41, 47];

// Exact entry launch offsets aligning colors directly with their visual runway arrows
const START_OFFSETS = { 
    red:    0,   // Launches at Row 7, Col 1 (Red Arrow)
    green:  13,  // Launches at Row 1, Col 9 (Green Arrow)
    yellow: 26,  // Launches at Row 9, Col 15 (Yellow Arrow)
    blue:   39   // Launches at Row 15, Col 7 (Blue Arrow)
};

// ==========================================================================
// 2. STATE MANAGER & NETWORKING CORE
// ==========================================================================
let gameState = {
    currentPlayer: 'red',
    lastRoll: 0,
    hasRolled: false,
    consecutiveSixes: 0,
    tokens: [],
    gameActive: true
};

let localUser = { id: "", username: "Guest Player" };
let activeRoomId = "global-match-lounge";

document.addEventListener('DOMContentLoaded', async () => {
    // Check local authentication state
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) { window.location.href = 'index.html'; return; }

    localUser.id = session.user.id;

    // Fetch True Username Profile Data from Supabase
    try {
        const { data: profile, error: profileErr } = await supabaseClient
            .from('profiles')
            .select('username')
            .eq('id', localUser.id)
            .single();

        if (profile && !profileErr) {
            localUser.username = profile.username;
        }
    } catch (e) {
        console.warn("Using guest mode profile fallback.", e);
    }

    const board = document.getElementById('ludo-board');
    const diceBtn = document.getElementById('roll-dice-btn');
    const visualDice = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');
    const turnIndicator = document.getElementById('current-player-turn');

    // Sync Game Broadcasts over the Web
    const roomSubscription = supabaseClient
        .channel(`room:${activeRoomId}`)
        .on('broadcast', { event: 'player-moved' }, ({ payload }) => {
            syncStateFromCloud(payload);
        })
        .subscribe();

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
        logMessage(`🌐 Online Match Ready! Welcome, ${localUser.username}.`);
    }

    function processTokenInteraction(token) {
        if (!gameState.gameActive) return;
        if (token.color !== gameState.currentPlayer) {
            return logMessage(`It is not your turn yet!`);
        }
        if (!gameState.hasRolled) {
            return logMessage(`Roll the dice first.`);
        }

        const el = document.getElementById(token.id);
        const roll = gameState.lastRoll;

        if (token.status === 'yard') {
            if (roll === 6) {
                const targetIndex = START_OFFSETS[token.color];
                if (isCellBlockedByEnemy(targetIndex, token.color)) {
                    return logMessage(`Entry blocked by opponent wall!`);
                }

                token.status = 'track';
                token.stepCount = 0;
                token.trackIndex = targetIndex;
                
                repositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                logMessage(`🚀 Deployed onto the board track.`);
                evaluateCollisions(token);
                completeTurnSequence(true); 
            } else {
                logMessage(`Requires a 6 to venture out of the yard base.`);
            }
            return;
        }

        if (token.status === 'track') {
            const potentialSteps = token.stepCount + roll;

            if (isPathBlockedByEnemy(token.trackIndex, roll, token.color)) {
                return logMessage(`🚫 Movement paths are blocked by an enemy blockade!`);
            }

            if (potentialSteps <= 51) {
                token.stepCount = potentialSteps;
                token.trackIndex = (token.trackIndex + roll) % 52;
                repositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
                evaluateCollisions(token);
                completeTurnSequence(roll === 6);
            } else {
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
                    logMessage(`✨ Reached Goal Home Triangle!`);
                    checkWinConditions(token.color);
                    completeTurnSequence(true);
                } else {
                    logMessage(`Roll too high to fit into the column runway.`);
                }
            }
            return;
        }

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
                logMessage(`✨ Finished!`);
                checkWinConditions(token.color);
                completeTurnSequence(true);
            } else {
                logMessage(`Roll too high! Exact number required.`);
            }
        }
    }

    function isCellBlockedByEnemy(trackIndex, playerColor) {
        const matchingTokens = gameState.tokens.filter(t => t.status === 'track' && t.trackIndex === trackIndex);
        return (matchingTokens.length >= 2 && matchingTokens[0].color !== playerColor);
    }

    function isPathBlockedByEnemy(startIndex, steps, playerColor) {
        for (let i = 1; i <= steps; i++) {
            const checkIndex = (startIndex + i) % 52;
            if (isCellBlockedByEnemy(checkIndex, playerColor)) return true;
        }
        return false;
    }

    function evaluateCollisions(movedToken) {
        const occupants = gameState.tokens.filter(other => 
            other.id !== movedToken.id && other.status === 'track' && other.trackIndex === movedToken.trackIndex
        );

        if (occupants.length > 0) {
            if (SAFE_INDICES.includes(movedToken.trackIndex)) return;

            const enemy = occupants.find(t => t.color !== movedToken.color);
            if (enemy) {
                logMessage(`💥 captured ${enemy.color.toUpperCase()}'s piece! Sent to yard.`);
                enemy.status = 'yard';
                enemy.stepCount = 0;
                enemy.trackIndex = -1;
                repositionUI(document.getElementById(enemy.id), YARD_HOLE_COORDS[enemy.color][enemy.index]);
            }
        }
    }

    function checkWinConditions(color) {
        const hasWon = gameState.tokens.filter(t => t.color === color).every(t => t.status === 'finished');
        if (hasWon) {
            gameState.gameActive = false;
            alert(`🏆 Match Finished! Victory to player ${color.toUpperCase()}!`);
        }
    }

    function completeTurnSequence(earnedBonus = false) {
        gameState.hasRolled = false;
        gameState.lastRoll = 0;

        if (!earnedBonus) {
            gameState.consecutiveSixes = 0;
            const order = ['red', 'green', 'yellow', 'blue'];
            let nextIdx = (order.indexOf(gameState.currentPlayer) + 1) % 4;
            gameState.currentPlayer = order[nextIdx];
        }

        // Broadcast local moves globally
        roomSubscription.send({
            type: 'broadcast',
            event: 'player-moved',
            payload: { gameState, senderName: localUser.username }
        });

        diceBtn.disabled = false;
        updateTurnHUD();
    }

    function updateTurnHUD() {
        const activeColor = gameState.currentPlayer.toUpperCase();
        
        // Displays both the color assignment role and the logged-in Supabase username
        if (gameState.currentPlayer === 'red') {
            turnIndicator.textContent = `🎲 Turn: [${localUser.username}] (${activeColor})`;
        } else {
            turnIndicator.textContent = `🎲 Turn: [Opponent] (${activeColor})`;
        }

        turnIndicator.className = `turn-indicator turn-${gameState.currentPlayer}`;
    }

    function syncStateFromCloud(cloudState) {
        gameState = cloudState.gameState;
        
        gameState.tokens.forEach(token => {
            const el = document.getElementById(token.id);
            if (!el) return;
            
            if (token.status === 'yard') {
                repositionUI(el, YARD_HOLE_COORDS[token.color][token.index]);
            } else if (token.status === 'track') {
                repositionUI(el, COMMON_TRACK_COORDS[token.trackIndex]);
            } else if (token.status === 'homerun') {
                repositionUI(el, HOME_RUN_COORDS[token.color][token.trackIndex]);
            } else if (token.status === 'finished') {
                el.style.opacity = '0.2';
            }
        });
        
        updateTurnHUD();
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
                logMessage(`Rolled a ${finalRoll}.`);

                if (finalRoll === 6) {
                    gameState.consecutiveSixes++;
                    if (gameState.consecutiveSixes === 3) {
                        logMessage(`⚠️ FOUL! 3 consecutive 6s!`);
                        setTimeout(() => completeTurnSequence(false), 1500);
                        return;
                    }
                } else {
                    gameState.consecutiveSixes = 0;
                }

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
                    logMessage("No moves open! Passing turn...");
                    setTimeout(() => completeTurnSequence(false), 1500);
                } else {
                    updateTurnHUD();
                }
            }
        }, 70);
    });

    initializeMatch();
});