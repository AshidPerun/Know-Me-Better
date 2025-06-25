let peer = null;
let conn = null;
let connectionId = null;
let currentInviteLink = null;
let isHost = false;

function connect(){
    // Create peer instance
    peer = new Peer();

    // Once peer is open and has an ID
    peer.on('open', (id) => {
        connectionId = id;

        // Try to connect if URL contains another peer's ID
        const urlParams = new URLSearchParams(window.location.search);
        const remoteConnectionId = urlParams.get('connectionId');

        if (remoteConnectionId && remoteConnectionId !== connectionId) {
            conn = peer.connect(remoteConnectionId);
            isHost = false;

            conn.on('open', () => {
                conn.on('data', (data) => {
                    if(data.type == 'Quiz'){
                        onQuiz(data.data);
                    }else if(data.type == 'Name'){
                        onName(data.data);
                    }else if(data.type == 'StartQuiz'){
                        onStartQuiz(data.data);
                    }else if(data.type == 'Answer'){
                        onAnswer(data.data);
                    }else if(data.type == 'Review'){
                        onReview(data.data);
                    }else if(data.type == 'ShowReviewResult'){
                        onShowReviewResult(data.data);
                    }else if(data.type == 'ReadyNext'){
                        onReadyNextQuiz(data.data);
                    }else if(data.type == 'Winner'){
                        onWinner(data.data);
                    }
                });

                onConnected();
            });

            conn.on('close', () => {
                showAlert("Other player disconnected.", 'error');
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                showAlert('Connection error. Please try again.', 'error');
            });
        }else{
            // Build dynamic invite link
            const url = new URL(window.location.href);
            url.searchParams.set('connectionId', connectionId);
            currentInviteLink = url.toString();
            isHost = true;

            console.log('Your Peer ID:', connectionId);
            console.log('Invite Link:', currentInviteLink);

            onConnected();
        }
    });

    // Listen for incoming connections
    peer.on('connection', (connection) => {
        conn = connection; // Assuming 1v1, new connection replaces old.
        conn.on('open', () => {
            conn.on('data', (data) => {
                if(data.type == 'Quiz'){
                    onQuiz(data.data);
                }else if(data.type == 'Name'){
                    onName(data.data);
                }else if(data.type == 'StartQuiz'){
                    onStartQuiz(data.data);
                }else if(data.type == 'Answer'){
                    onAnswer(data.data);
                }else if(data.type == 'Review'){
                    onReview(data.data);
                }else if(data.type == 'ShowReviewResult'){
                    onShowReviewResult(data.data);
                }else if(data.type == 'ReadyNext'){
                    onReadyNextQuiz(data.data);
                }else if(data.type == 'Winner'){
                    onWinner(data.data);
                }
            });

            onOtherPlayerJoin();
        });
        
        conn.on('error', (err) => {
            console.error('Connection error with incoming connection:', err);
            showAlert('A connection error occurred.', 'error');
        });

        conn.on('close', () => {
            showAlert("Other player disconnected.", 'error');
        });
    });

    // Handle peer errors
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        // Provide user feedback based on error type if possible
        if (err.type === 'unavailable-id') {
            showAlert('This game ID is already taken. Please refresh.', 'error');
        } else if (err.type === 'peer-unavailable') {
             showAlert('Could not connect to the other player. They might be offline.', 'error');
        } else {
            showAlert('A network error occurred. Please check your connection.', 'error');
        }
    });
};

function sendData(type, data){
    // Corrected condition: use || instead of &&, and check conn.open
    if (!conn || !conn.open) {
        console.warn("sendData: Connection not available or not open.", {type, data});
        // Optionally, inform the user if this is critical
        // showAlert('Not connected to other player. Cannot send data.', 'warning');
        return;
    }

    conn.send({
        type: type,
        data: data
    });
}