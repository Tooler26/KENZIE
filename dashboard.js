const SUPABASE_URL = "https://eexaxhkscnshyulqgkqy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleGF4aGtzY25zaHl1bHFna3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODc0MzQsImV4cCI6MjA5NTM2MzQzNH0.SwXhxAIpDNTbkcgPZqbvkfdnt_vbEqySVQNl6VQIzUU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    
    // Check if user is actually logged in
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        // No session found, boot them back to login page
        window.location.href = 'index.html';
        return;
    }

    // Display User Profile info
    const userEmail = session.user.email;
    const username = userEmail.split('@')[0]; // Use first part of email as fallback nickname
    document.getElementById('user-name').textContent = username;
    
    // Set up random persistent dicebear avatar based on username
    document.getElementById('user-avatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    // Mock Wallet Data
    document.getElementById('wallet-balance').textContent = "$15.50";

    // --- TAB SWITCHING SYSTEM ---
    const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
    const tabViews = document.querySelectorAll('.tab-view');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Toggle Active State on Buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Show matching view section
            tabViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${targetTab}-view`) {
                    view.classList.add('active');
                }
            });
        });
    });

    // --- LOBBY ROOMS INTERACTION (New Redirect Update) ---
    const joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Take the user straight into the live game arena
            window.location.href = 'game.html';
        });
    });

    // --- LOGOUT ENGINE ---
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });
});