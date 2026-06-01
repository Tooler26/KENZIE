const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1. CORE LOGIC TRACK COORDINATES ---
// The common 52 track cell path coordinates (Row, Column) around the board matrix
const COMMON_TRACK_COORDS = [
    {r:7, c:2},  {r:7, c:3},  {r:7, c:4},  {r:7, c:5},  {r:7, c:6},  // Left wing top
    {r:6, c:7},  {r:5, c:7},  {r:4, c:7},  {r:3, c:7},  {r:2, c:7},  {r:1, c:7}, // Top wing left
    {r:1, c:8},  // Top middle bridge
    {r:1, c:9},  {r:2, c:9},  {r:3, c:9},  {r:4, c:9},  {r:5, c:9},  {r:6, c:9}, // Top wing right
    {r:7, c:10}, {r:7, c:11}, {r:7, c:12}, {r:7, c:13}, {r:7, c:14}, {r:7, c:15}, // Right wing top
    {r:8, c:15}, // Right middle bridge
    {r:9, c:14}, {r:9, c:13}, {r:9, c:12}, {r:9, c:11}, {r:9, c:10}, {r:9, c:9},  // Right wing bottom
    {r:10, c:9}, {r:11, c:9}, {r:12, c:9}, {r:13, c:9}, {r:14, c:9}, {r:15, c:9}, // Bottom wing right
    {r:15, c:8}, // Bottom middle bridge
    {r:15, c:7}, {r:14, c:7}, {r:13, c:7}, {r:12, c:7}, {r:11, c:7}, {r:10, c:7}, // Bottom wing left
    {r:9, c:6},  {r:9, c:5},  {r:9, c:4},  {r:9, c:3},  {r:9, c:2},  {r:9, c:1},  // Left wing bottom
    {r:8, c:1}   // Left middle bridge
];

// Structural Base Yard holes mapping directly to the circles in your image file
const YARD_HOLE_COORDS = {
    red:    [{r:3, c:3}, {r:3, c:5}, {r:5, c:3}, {r:5, c:5}],
    green:  [{r:3, c:11}, {r:3, c:13}, {r:5, c:11}, {r:5, c:13}],
    yellow: [{r:11, c:11}, {r:11, c:13}, {r:13, c:11}, {r:13, c:13}],
    blue:   [{r:11, c:3}, {r:11, c:5}, {r:13, c:3}, {r:13, c:5}]
};

// State engine tracking active token status configurations
let gameState = {
    currentPlayer: 'red', // red, green, yellow, blue
    lastRoll: 0,
    tokens: []
};

document.addEventListener('DOMContentLoaded', async () => {
    // Security Pass: Check user session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        if(confirm("Are you sure you want to exit the match?")) {
            window.location.href = 'dashboard.html';
        }
    });

    const board = document.getElementById('ludo-board');
    const diceBtn = document.getElementById('roll-dice-btn');
    const visualDice = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');

    // --- 2. DYNAMIC TOKEN CONTROLLER WITH MOVEMENT CLICK EVENT ---
    function spawnAllPlayerTokens() {
        board.querySelectorAll('.token-wrapper').forEach(t => t.remove());
        gameState.tokens = [];

        const colors = ['red', 'green', 'yellow', 'blue'];
        
        colors.forEach(color => {
            for (let i = 0; i < 4; i++) {
                const initialCoords = YARD_HOLE_COORDS[color][i];
                
                const tokenObj = {
                    id: `${color}-${i}`,
                    color: color,
                    index: i,
                    status: 'yard', // yard, track, homeRun, finished
                    stepCount: 0,
                    coord: { r: initialCoords.r, c: initialCoords.c }
                };
                
                gameState.tokens.push(tokenObj);

                // Build HTML layout node
                const wrapper = document.createElement('div');
                wrapper.className = `token-wrapper token-${color}`;
                wrapper.id = tokenObj.id;
                wrapper.style.gridRowStart = tokenObj.coord.r;
                wrapper.style.gridColumnStart = tokenObj.coord.c;

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
                
                // Add Movement Click Event Interaction Handler
                wrapper.addEventListener('click', () => handleTokenMovement(tokenObj));
                
                board.appendChild(wrapper);
            }
        });
    }

    // --- 3. MOVEMENT RESOLUTION ENGINE ---
    function handleTokenMovement(token) {
        // Validation Guard: Ensure it's this token color's active turn
        if (token.color !== gameState.currentPlayer) {
            logMessage(`It's not ${token.color}'s turn right now!`);
            return;
        }
        
        if (gameState.lastRoll === 0) {
            logMessage(`Please roll the dice first!`);
            return;
        }

        const el = document.getElementById(token.id);

        // Rule: Moving out of the base yard requires exactly a 6
        if (token.status === 'yard') {
            if (gameState.lastRoll === 6) {
                token.status = 'track';
                token.stepCount = 0;
                
                // Set starting track entry point matching player spawn offsets
                let startTrackIndex = 0;
                if (token.color === 'green') startTrackIndex = 0;
                if (token.color === 'yellow') startTrackIndex = 13;
                if (token.color === 'blue') startTrackIndex = 26;
                if (token.color === 'red') startTrackIndex = 39;

                token.trackIndex = startTrackIndex;
                const nextPos = COMMON_TRACK_COORDS[startTrackIndex];
                
                el.style.gridRowStart = nextPos.r;
                el.style.gridColumnStart = nextPos.c;
                
                logMessage(`${token.color.toUpperCase()} pawn successfully entered the active track!`);
                resetTurn();
            } else {
                logMessage(`You need a 6 to release pawns from the base yard!`);
            }
            return;
        }

        // Rule: Regular track step movement update traversal cycle
        if (token.status === 'track') {
            token.stepCount += gameState.lastRoll;
            token.trackIndex = (token.trackIndex + gameState.lastRoll) % 52;
            
            const targetCoordinate = COMMON_TRACK_COORDS[token.trackIndex];
            
            // Render smooth translation coordinate shifts
            el.style.gridRowStart = targetCoordinate.r;
            el.style.gridColumnStart = targetCoordinate.c;
            
            logMessage(`Moved ${token.color} token forward ${gameState.lastRoll} steps.`);
            resetTurn();
        }
    }

    function resetTurn() {
        gameState.lastRoll = 0;
        diceBtn.disabled = false;
        
        // Cycle turn manager logic tracking parameters
        const order = ['red', 'green', 'yellow', 'blue'];
        let nextIdx = (order.indexOf(gameState.currentPlayer) + 1) % 4;
        gameState.currentPlayer = order[nextIdx];
        
        const turnIndicator = document.getElementById('current-player-turn');
        turnIndicator.className = `turn-${gameState.currentPlayer}`;
        turnIndicator.textContent = `${gameState.currentPlayer.toUpperCase()} Player`;
    }

    function logMessage(text) {
        const p = document.createElement('p');
        p.className = 'log-entry';
        p.textContent = text;
        logContainer.appendChild(p);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // --- 4. REVERTED ORIGINAL DICE TEXT ROLLING LOGIC ---
    const diceFaces = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        let counter = 0;
        
        const rollInterval = setInterval(() => {
            const randomTmp = Math.floor(Math.random() * 6) + 1;
            visualDice.textContent = diceFaces[randomTmp];
            counter++;
            
            if (counter > 8) {
                clearInterval(rollInterval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                visualDice.textContent = diceFaces[finalRoll];
                
                gameState.lastRoll = finalRoll;
                logMessage(`${gameState.currentPlayer.toUpperCase()} rolled a ${finalRoll}!`);
                
                // If rolled value has no valid active strategic moves, auto-pass turn
                const activePlayerTokens = gameState.tokens.filter(t => t.color === gameState.currentPlayer);
                const hasYardTokens = activePlayerTokens.some(t => t.status === 'yard');
                const hasTrackTokens = activePlayerTokens.some(t => t.status === 'track');

                if (!hasTrackTokens && finalRoll !== 6) {
                    logMessage(`No valid moves available! Passing turn...`);
                    setTimeout(resetTurn, 1000);
                }
            }
        }, 80);
    });

    // Initialize placement
    spawnAllPlayerTokens();
});