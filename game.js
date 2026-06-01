const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Security Pass: Check if user session exists inside active room
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

    // Premium Asset Dice Functionality
    const diceBtn = document.getElementById('roll-dice-btn');
    const diceVisual = document.getElementById('visual-dice');
    const logContainer = document.querySelector('.game-log');
    
    // Exact mapping matching the image extensions you uploaded
    const diceImages = [
        'dice1.png',
        'dice2.png',
        'dice3.jpg',
        'dice4.jpg',
        'dice5.jpg',
        'dice6.jpg'
    ];

    diceBtn.addEventListener('click', () => {
        diceBtn.disabled = true;
        diceVisual.classList.add('rolling-animation'); // Trigger CSS rotation/shake effect
        let rollCount = 0;
        
        // High-speed image rotation effect
        const rollInterval = setInterval(() => {
            const tempRoll = Math.floor(Math.random() * 6);
            diceVisual.src = diceImages[tempRoll];
            rollCount++;

            if (rollCount > 12) {
                clearInterval(rollInterval);
                diceVisual.classList.remove('rolling-animation');
                
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                diceVisual.src = diceImages[finalRoll - 1]; // Set exact definitive final face
                
                // Print statement update to match feed
                const p = document.createElement('p');
                p.className = 'log-entry';
                p.textContent = `You rolled a ${finalRoll}!`;
                logContainer.appendChild(p);
                logContainer.scrollTop = logContainer.scrollHeight; // Auto Scroll Log

                diceBtn.disabled = false;
            }
        }, 70); // Cycle speed in milliseconds
    });
});