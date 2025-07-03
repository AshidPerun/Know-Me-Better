let client = null;
let clientSessionId = null;
let currentRoom = null;
let isHost = false;
let connectionId = false;
const DOMAIN = 'https://know-me-better-server.onrender.com/'; // exposed in frontend

async function connect(playerName) {
    client = new Colyseus.Client('http://localhost:3001');
    //client = new Colyseus.Client(DOMAIN);
    
    const remoteConnectionId = checkConnectionID();

    if (remoteConnectionId && remoteConnectionId !== connectionId) {
        client.joinById(remoteConnectionId, { name: playerName }).then((gameRoom) => {
            isHost = false;
            onRoomConnected(gameRoom);
            console.log("joined successfully", gameRoom);
        }).catch(e => {
            showAlert('Cannot join room. It may have expired.', 'error', 10000);
            console.error("join error", e);
        });

    }else{
        client.create("GameRoom", { name: playerName, isHost: true }).then((gameRoom) => {
            isHost = true;
            onRoomConnected(gameRoom);
            console.log("joined successfully", gameRoom);
        }).catch(e => {
            showAlert('Cannot create room. Please try again later.', 'error', 10000);
            console.error("join error", e);
        });

    }
}

function checkConnectionID (){
    const urlParams = new URLSearchParams(window.location.search);
    const remoteConnectionId = urlParams.get('connectionId');

    return remoteConnectionId;
}

function onRoomConnected(gameRoom) {
    currentRoom = gameRoom;
    connectionId = gameRoom.roomId;
    clientSessionId = gameRoom.sessionId;
    const $ = Colyseus.getStateCallbacks(currentRoom); 

    if (isHost) {
        const url = new URL(window.location.href);
        url.searchParams.set('connectionId', connectionId);
        currentInviteLink = url.toString();

        currentRoom.onMessage('Host:SetQuizTypes', (data) => {
            setQuizTypes(data);
        });
        
        currentRoom.onMessage('Host:Restart', (data) => {
            onRestart(data);
        });
    }

    $(currentRoom.state).players.onAdd((player, sessionId) => {
        if(sessionId !== clientSessionId){
            onOtherPlayerJoin(player);
        }
    }, false);
    
    $(currentRoom.state).players.onRemove((player, sessionId) => {
        if(sessionId !== clientSessionId){
            onOtherPlayerLeave(player);
        }
    }, false);
    
    currentRoom.onMessage('Client:NextQuiz', (data) => {
        onNextQuiz(data);
    });
    
    currentRoom.onMessage('Client:SetReview', (data) => {
        onSetReview(data);
    });
    
    currentRoom.onMessage('Client:SetMarks', (data) => {
        onSetMarks(data);
    });
    
    currentRoom.onMessage('Client:SetWinner', (data) => {
        onSetWinner(data);
    });
    
    currentRoom.onMessage('Client:RequestRestart', (data) => {
        onRequestRestart(data);
    });
    
    currentRoom.onMessage('Client:NoQuestions', (data) => {
        showAlert('You asked all free Questions !');
    });
    
    onConnected();
}


function sendData(type, data){
    if(currentRoom){
        currentRoom.send(type, data);
    }
}