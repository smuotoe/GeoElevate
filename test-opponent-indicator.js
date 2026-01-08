/**
 * Test script to simulate second player (testuser) in multiplayer match.
 * This connects via WebSocket and answers one question to trigger
 * the "opponent answered" indicator on player 1's screen.
 */
const WebSocket = require('ws');

const API_BASE = 'http://localhost:5002';
const WS_URL = 'ws://localhost:3007';
const MATCH_ID = 12;

async function main() {
    console.log('Testing opponent answered indicator...');

    // 1. Login as testuser
    console.log('1. Logging in as testuser...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
        })
    });

    if (!loginResponse.ok) {
        console.error('Login failed:', await loginResponse.text());
        return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log('   Logged in as testuser (ID:', loginData.user.id, ')');

    // 2. Connect to WebSocket
    console.log('2. Connecting to WebSocket...');
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.on('open', () => {
        console.log('   WebSocket connected');

        // Join the match
        console.log('3. Joining match #' + MATCH_ID + '...');
        ws.send(JSON.stringify({
            type: 'join_match',
            matchId: MATCH_ID
        }));
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('   Received:', message.type);

        if (message.type === 'match_start' || message.type === 'next_question') {
            console.log('   Question received!');
            console.log('   Options:', message.question?.options?.join(', '));

            // Wait 2 seconds, then answer with the first option
            // This should trigger "opponent answered" on player 1's screen
            setTimeout(() => {
                const answer = message.question?.options?.[0];
                console.log('4. Submitting answer:', answer);
                ws.send(JSON.stringify({
                    type: 'submit_answer',
                    matchId: MATCH_ID,
                    questionIndex: message.questionIndex || 0,
                    answer: answer,
                    timeMs: 2000
                }));
                console.log('   Answer submitted! Player 1 should now see "Opponent answered" indicator.');
            }, 2000);
        }

        if (message.type === 'opponent_answered') {
            console.log('   Opponent (player 1) has answered!');
        }

        if (message.type === 'question_results') {
            console.log('   Question results received:', JSON.stringify(message.results));
        }

        if (message.type === 'match_end') {
            console.log('   Match ended! Winner:', message.winnerId || 'Tie');
            ws.close();
        }
    });

    ws.on('error', (err) => {
        console.error('   WebSocket error:', err.message);
    });

    ws.on('close', () => {
        console.log('   WebSocket closed');
        process.exit(0);
    });

    // Keep running for 60 seconds
    setTimeout(() => {
        console.log('   Timeout reached, closing...');
        ws.close();
    }, 60000);
}

main().catch(console.error);
