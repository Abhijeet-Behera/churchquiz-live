const { io } = require('socket.io-client');

const SERVER_URL =
    'https://churchquiz-api.duckdns.org';

const PIN = process.argv[2];
const PLAYER_COUNT =
    Number(process.argv[3] || 50);

if (!PIN) {
    console.log(`
Usage:

node load-test.cjs GAME_PIN PLAYER_COUNT

Example:

node load-test.cjs 517265 50
`);
    process.exit(1);
}

if (
    !Number.isInteger(PLAYER_COUNT) ||
    PLAYER_COUNT < 1 ||
    PLAYER_COUNT > 300
) {
    console.error(
        'PLAYER_COUNT must be between 1 and 300.'
    );
    process.exit(1);
}

const clients = [];
let shuttingDown = false;

const stats = {
    requested: PLAYER_COUNT,
    connected: 0,
    joined: 0,
    joinFailed: 0,
    answersAccepted: 0,
    answersRejected: 0,
    disconnects: 0,
    reconnects: 0,
    connectionErrors: 0
};

const joinedClientIds = new Set();

function printStats() {
    console.log('');
    console.log('================================');
    console.log(' ChurchQuiz Load Test');
    console.log('================================');
    console.log(
        `Requested           : ${stats.requested}`
    );
    console.log(
        `Socket connected    : ${stats.connected}`
    );
    console.log(
        `Joined successfully : ${stats.joined}`
    );
    console.log(
        `Join failed         : ${stats.joinFailed}`
    );
    console.log(
        `Answers accepted    : ${stats.answersAccepted}`
    );
    console.log(
        `Answers rejected    : ${stats.answersRejected}`
    );
    console.log(
        `Disconnects         : ${stats.disconnects}`
    );
    console.log(
        `Reconnects          : ${stats.reconnects}`
    );
    console.log(
        `Connection errors   : ${stats.connectionErrors}`
    );
    console.log('================================');
    console.log('');
}

function createPlayer(index) {
    const name =
        `LoadTest-${String(index).padStart(3, '0')}`;

    const socket = io(
        SERVER_URL,
        {
            autoConnect: true,

            reconnection: true,

            reconnectionAttempts:
                Infinity,

            reconnectionDelay:
                1000,

            reconnectionDelayMax:
                5000,

            timeout:
                10000
        }
    );

    const client = {
        index,
        name,
        socket,
        playerId: null,
        connectedOnce: false,
        answeredQuestions:
            new Set()
    };

    clients.push(client);

    socket.on(
        'connect',
        () => {

            if (
                client.connectedOnce
            ) {
                stats.reconnects++;
            } else {
                client.connectedOnce =
                    true;

                stats.connected++;
            }

            const payload = {
                pin: PIN,
                name: name
            };

            if (client.playerId) {
                payload.playerId =
                    client.playerId;
            }

            socket.emit(
                'player:join-game',
                payload,
                response => {

                    if (
                        !response?.success
                    ) {
                        if (
                            !joinedClientIds.has(
                                index
                            )
                        ) {
                            stats.joinFailed++;
                        }

                        console.error(
                            `JOIN FAILED ${name}:`,
                            response?.error
                                ?.message ||
                            response
                        );

                        return;
                    }

                    client.playerId =
                        response.data
                            .player.id;

                    if (
                        !joinedClientIds.has(
                            index
                        )
                    ) {
                        joinedClientIds.add(
                            index
                        );

                        stats.joined++;

                        if (
                            stats.joined % 10 ===
                            0 ||
                            stats.joined ===
                            PLAYER_COUNT
                        ) {
                            console.log(
                                `Joined ${stats.joined}/${PLAYER_COUNT}`
                            );
                        }
                    }
                }
            );
        }
    );

    socket.on(
        'question:started',
        question => {

            if (!client.playerId) {
                return;
            }

            const questionIndex =
                question
                    ?.questionIndex ?? 0;

            if (
                client
                    .answeredQuestions
                    .has(questionIndex)
            ) {
                return;
            }

            client
                .answeredQuestions
                .add(questionIndex);

            const options =
                Array.isArray(
                    question?.options
                )
                    ? question.options
                    : [];

            if (
                options.length === 0
            ) {
                return;
            }

            const selectedOption =
                Math.floor(
                    Math.random() *
                    options.length
                );

            // Simulated human answer time:
            // 0.5 sec - 4 sec
            const delay =
                500 +
                Math.floor(
                    Math.random() *
                    3500
                );

            setTimeout(
                () => {

                    if (
                        !socket.connected
                    ) {
                        return;
                    }

                    socket.emit(
                        'player:submit-answer',
                        {
                            pin: PIN,

                            playerId:
                                client.playerId,

                            selectedOption
                        },
                        response => {

                            if (
                                response?.success
                            ) {
                                stats
                                    .answersAccepted++;
                            } else {
                                stats
                                    .answersRejected++;

                                console.error(
                                    `ANSWER FAILED ${name}:`,
                                    response
                                        ?.error
                                        ?.message ||
                                    response
                                );
                            }
                        }
                    );
                },
                delay
            );
        }
    );

    socket.on(
        'disconnect',
        reason => {

            if (!shuttingDown) {
                stats.disconnects++;

                console.log(
                    `${name} disconnected: ${reason}`
                );
            }
        }
    );

    socket.on(
        'connect_error',
        error => {

            stats.connectionErrors++;

            console.error(
                `Connection error ${name}: ${error.message}`
            );
        }
    );
}

console.log('');
console.log(
    '================================'
);
console.log(
    ' ChurchQuiz Simulated Load Test'
);
console.log(
    '================================'
);
console.log(
    `Backend : ${SERVER_URL}`
);
console.log(
    `PIN     : ${PIN}`
);
console.log(
    `Players : ${PLAYER_COUNT}`
);
console.log(
    '================================'
);
console.log('');

let created = 0;

/*
 * Add players gradually.
 * 100 ms apart prevents all clients
 * being created on exactly the same
 * millisecond.
 */
const joinTimer =
    setInterval(() => {

        created++;

        createPlayer(created);

        if (
            created >=
            PLAYER_COUNT
        ) {
            clearInterval(
                joinTimer
            );

            setTimeout(
                () => {

                    printStats();

                    console.log(
                        'All simulated players created.'
                    );

                    console.log(
                        'Now start the quiz from the real Host browser.'
                    );
                },
                5000
            );
        }
    }, 100);

setInterval(
    printStats,
    15000
);

process.on(
    'SIGINT',
    () => {
        shuttingDown = true;

        console.log(
            '\nStopping load test...'
        );

        clients.forEach(
            client => {
                client.socket.disconnect();
            }
        );

        printStats();

        process.exit(0);
    }
);