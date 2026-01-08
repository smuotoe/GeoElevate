/**
 * Full multiplayer match completion test.
 * Both players answer all questions and verify final results.
 */

const WebSocket = require('ws');

const API_BASE = 'http://localhost:5002';
const WS_URL = 'ws://localhost:3007';

async function main() {
    console.log('=== FULL MULTIPLAYER MATCH TEST ===\n');

    // 1. Login both users
    console.log('1. Logging in both users...');
    const [login1Res, login2Res] = await Promise.all([
        fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        }),
        fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'player2@example.com', password: 'TestPass123' })
        })
    ]);
    const login1Data = await login1Res.json();
    const login2Data = await login2Res.json();
    const token1 = login1Data.accessToken;
    const token2 = login2Data.accessToken;
    console.log('   Both users logged in\n');

    // 2. Create challenge
    console.log('2. Creating challenge...');
    const challengeRes = await fetch(`${API_BASE}/api/multiplayer/challenge`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token1}`
        },
        body: JSON.stringify({ opponentId: 37, gameType: 'flags' })
    });
    const challengeData = await challengeRes.json();
    const matchId = challengeData.matchId;
    console.log('   Match ID:', matchId, '\n');

    // 3. Accept invite
    console.log('3. Accepting invite...');
    const invitesRes = await fetch(`${API_BASE}/api/multiplayer/invites`, {
        headers: { 'Authorization': `Bearer ${token2}` }
    });
    const invitesData = await invitesRes.json();
    const invite = invitesData.invites?.find(i => i.id === matchId);
    if (invite) {
        await fetch(`${API_BASE}/api/multiplayer/invites/${invite.id}/accept`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token2}` }
        });
        console.log('   Invite accepted\n');
    }

    // 4. Both connect to WebSocket
    console.log('4. Connecting to WebSocket...');

    const p1Questions = [];
    const p2Questions = [];
    let p1FinalScore = 0;
    let p2FinalScore = 0;
    let matchEnded = false;
    let winnerId = null;

    const ws1 = new WebSocket(`${WS_URL}?token=${token1}`);
    const ws2 = new WebSocket(`${WS_URL}?token=${token2}`);

    // Helper to answer a question
    function answerQuestion(ws, msg, playerName) {
        if (msg.question?.options?.length > 0) {
            // Pick random answer (sometimes correct, sometimes not)
            const answer = msg.question.options[Math.floor(Math.random() * msg.question.options.length)];
            console.log(`   [${playerName}] Q${msg.questionIndex}: answering ${answer}`);
            ws.send(JSON.stringify({
                type: 'submit_answer',
                matchId,
                questionIndex: msg.questionIndex,
                answer,
                timeMs: 1000 + Math.random() * 2000
            }));
        }
    }

    ws1.on('open', () => {
        console.log('   Player1 connected');
        ws1.send(JSON.stringify({ type: 'join_match', matchId }));
    });

    ws2.on('open', () => {
        console.log('   Player2 connected');
        ws2.send(JSON.stringify({ type: 'join_match', matchId }));
    });

    ws1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'match_start' || msg.type === 'next_question') {
            p1Questions.push(msg.question?.prompt);
            setTimeout(() => answerQuestion(ws1, msg, 'P1'), 500);
        }
        if (msg.type === 'match_end') {
            p1FinalScore = msg.scores[1] || 0;
            winnerId = msg.winnerId;
            matchEnded = true;
        }
    });

    ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'match_start' || msg.type === 'next_question') {
            p2Questions.push(msg.question?.prompt);
            setTimeout(() => answerQuestion(ws2, msg, 'P2'), 500);
        }
        if (msg.type === 'match_end') {
            p2FinalScore = msg.scores[37] || 0;
        }
    });

    ws1.on('error', (e) => console.log('   P1 error:', e.message));
    ws2.on('error', (e) => console.log('   P2 error:', e.message));

    // Wait for match to complete (max 60 seconds)
    console.log('\n5. Playing match...');
    const startTime = Date.now();
    while (!matchEnded && Date.now() - startTime < 60000) {
        await new Promise(r => setTimeout(r, 1000));
    }

    ws1.close();
    ws2.close();

    // 6. Verify results
    console.log('\n=== RESULTS ===');
    console.log('Match completed:', matchEnded);
    console.log('P1 questions received:', p1Questions.length);
    console.log('P2 questions received:', p2Questions.length);
    console.log('P1 final score:', p1FinalScore);
    console.log('P2 final score:', p2FinalScore);
    console.log('Winner ID:', winnerId);

    // Check sync
    let synced = true;
    for (let i = 0; i < Math.min(p1Questions.length, p2Questions.length); i++) {
        if (p1Questions[i] !== p2Questions[i]) {
            console.log(`Question ${i} MISMATCH!`);
            synced = false;
        }
    }
    console.log('Questions synced:', synced ? 'YES' : 'NO');

    if (matchEnded && synced && p1Questions.length >= 10 && p2Questions.length >= 10) {
        console.log('\n*** TEST PASSED ***');
        process.exit(0);
    } else {
        console.log('\n*** TEST INCOMPLETE ***');
        process.exit(1);
    }
}

main().catch(console.error);
