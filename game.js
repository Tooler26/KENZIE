const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Security Pass: Check user session
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) {
        window.location.href = 'index.html';
        return;
    }

    // Navigation back to dashboard hub
    document.getElementById('back-to-dashboard-btn').addEventListener('click', () => {
        if(confirm("Are you sure you want to exit the current match?")) {
            window.location.href = 'dashboard.html';
        }
    });

    // --- 3D TOKEN GENERATOR WITH MOVEMENT SHADOWS ---
    const board = document.getElementById('ludo-board');

    function spawnToken(color, imageFile, row, col) {
        // Create an interactive structural outer wrapper locked to grid space
        const tokenWrapper = document.createElement('div');
        tokenWrapper.className = `token-wrapper token-${color}`;
        tokenWrapper.style.gridRowStart = row;
        tokenWrapper.style.gridColumnStart = col;

        // Create the individual physical depth-reactive ambient shadow underneath
        const tokenShadow = document.createElement('div');
        tokenShadow.className = 'token-ambient-shadow';

        // Create the actual 3D avatar graphic element
        const tokenImg = document.createElement('img');
        tokenImg.src = imageFile;
        tokenImg.className = 'token-graphic';
        tokenImg.alt = `${color} piece`;
        
        // Setup visual image structural safety fallback
        tokenImg.onerror = () => {
            tokenImg.style.display = 'none'; // If file path is broken, CSS 3D fallback base keeps game perfectly playable
        };

        // Combine structures onto board
        tokenWrapper.appendChild(tokenShadow);
        tokenWrapper.appendChild(tokenImg);
        board.appendChild(tokenWrapper);
    }

    // Deploy tokens directly onto active paths to verify alignment positioning
    spawnToken('red', 'red.jpg', 7, 2);       
    spawnToken('green', 'green.jpg', 2, 9);   
    spawnToken('yellow', 'yellow.jpg', 9, 14); 
    spawnToken('blue', 'blue.jpg', 14, 7);    

    // Place tokens neatly into the middle of home camps
    spawnToken('red', 'red.jpg', 3, 3);
    spawnToken('green', 'green.jpg', 3, 12);
    spawnToken('yellow', 'yellow.jpg', 12, 12);
    spawnToken('blue', 'blue.jpg', 12, 3);


    // --- 3D MATRIX CUBE DICE ENGINE ---
    const diceBtn = document.getElementById('roll-dice-btn');
    const cube = document.getElementById('cube');
    const logContainer = document.querySelector('.game-log');

    // Mathematical coordinate rotations needed to orient face forward towards the player camera view
    const faceRotations = {
        1: { x: 0,    y: 0 },    // Front Face
        6: { x: 180,  y: 0 },    // Back Face
        2: { x: 0,    y: 90 },   // Right Face
        5: { x: 0,    y: -90 },  // Left Face
        3: { x: 90,   y: 0 },    // Top Face
        4: { x: -90,  y: 0 }     // Bottom Face
    };

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        
        // Pick a definitive outcome
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        
        // Add random multi-turn revolutions (spin cycles) to simulate organic velocity physics
        const extraSpinsX = (Math.floor(Math.random() * 3) + 3) * 360; 
        const extraSpinsY = (Math.floor(Math.random() * 3) + 3) * 360; 

        const targetX = faceRotations[finalRoll].x + extraSpinsX;
        const targetY = faceRotations[finalRoll].y + extraSpinsY;

        // Apply global styles causing immediate 3D rolling physics rotation animation
        cube.style.transform = `rotateX(${targetX}deg) rotateY(${targetY}deg)`;

        // Wait for the CSS transition speed timeline to conclude safely
        setTimeout(() => {
            const p = document.createElement('p');
            p.className = 'log-entry';
            p.textContent = `You rolled a beautiful 3D ${finalRoll}!`;
            logContainer.appendChild(p);
            logContainer.scrollTop = logContainer.scrollHeight;

            diceBtn.disabled = false;
        }, 1200); // Mapped perfectly with CSS animation duration timing
    });
});