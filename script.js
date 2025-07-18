const nameInput = document.getElementById('nameInput');
const joinedFriendName = document.getElementById('joinedFriendName');
const answerInput = document.getElementById('answerInput');
const questionNumber = document.getElementById('questionNumber');
const questionArea = document.getElementById('questionArea');
const questionArea_2 = document.getElementById('questionArea_2');
const friendsGuess = document.getElementById('friendsGuess');
const correctWrong = document.getElementById('correctWrong');
const scoreHtml = document.getElementById('score');
const winnerName = document.getElementById('winnerName');
const winnerIs = document.getElementById('winnerIs');
const selectionContainer = document.getElementById('selectionContainer');
const reactionContainer = document.getElementById('reactionContainer');
const quizNumbersContainer = document.getElementById('quizNumbersContainer');
const startButton = document.getElementById('startButton');
const hostGame = document.getElementById('hostGame');

const quizLevels = 5;

let isGameStarted = false;
let currentScreenId = 'startScreen';
let quizType = 0;
let quizTypes = [];
let round = 1;
let restart = false;
let MAX_ROUNDS = 5;
let playerName = null;
let friendName = null;
let tempFriendName = null;
let askedQuestions = [];

let myScore = 0;
let friendScore = 0;

let previousAlertTimeout = null;
let currentQuiz = null;
let myLastSubmittedReview = null;
let isAnsweredCurrentQuiz = false;
let isReviewedCurrentQuiz = false;
let isReadyForNextQuiz = false;
let friendsAnswer = null;
let friendsReview = null;
let friendReadyForNextQuiz = false;

// Initialize the first screen
document.addEventListener('DOMContentLoaded', () => {
    const allSections = document.querySelectorAll('#appContainer > section');
    allSections.forEach(section => {
        if (section.id === currentScreenId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    const hasConnectionID = checkConnectionID();
    if(hasConnectionID){
        startButton.innerText = 'Join Game'

        hostGame.style.display = 'block';
        hostGame.onclick = () => {
            const url = new URL(window.location.href);
            url.searchParams.delete('connectionId');
            window.history.replaceState({}, '', url);
            window.location.reload();
        }
    }


    console.log(
        "%cOf course you can cheat... but why? 😊",
        "color: #ff4081; font-size: 16px; font-weight: bold;"
    );

    enableFeedBack(false);
});

quizNumbersContainer.querySelectorAll('h3').forEach(item => {
  item.addEventListener('click', () => {
    quizNumbersContainer.querySelectorAll('h3').forEach(h3 => h3.classList.remove('active'));
    item.classList.add('active');
  });
});

function startGame() {
    if(isGameStarted) return;

    if (nameInput.value && nameInput.value.length <= 15) {
        playerName = nameInput.value;
        connect(playerName);
        
        isGameStarted = true;
        showAlert('Please wait this will take a little time', 'info', 3000);
    }else if(nameInput.value.length > 15){
        showAlert('Name is Too Big!', 'warning');
    } else {
        showAlert('Enter your name to start', 'warning');
    }
}

function setQuizTypes(data){
    if(data){
        selectionContainer.innerHTML = '';
        quizTypes = data;
        Object.entries(data).forEach(([key, { label, isReward }]) => {
            const h3 = document.createElement('h3');
            h3.innerHTML = isReward ? label + Icons.video('#6500c9', 20, 20, '0 0 0 8px') : label;
            h3.onclick = () => onTypeSelect(Number(key));
            
            selectionContainer.appendChild(h3);
        });

        selectionContainer.querySelectorAll('h3').forEach(item => {
            item.addEventListener('click', () => {
                selectionContainer.querySelectorAll('h3').forEach(h3 => h3.classList.remove('active'));
                item.classList.add('active');
            });
        });

        goToScreen('typeSelectionScreen');
    }
}

function onConnected() {
    if (!isHost) {
        goToScreen('inGameWaitingScreen'); // Wait for quiz from host
    }
}

function onContinueQuizType(){
    if (quizType === 0) {
        showAlert('Please Choose a Quiz Type..', 'warning');
        return;
    }

    const data = quizTypes[quizType];
    const isReward = data.isReward;
    const isAdult = data.isAdult;

    if(isReward){
        if(isAdult){
            showConform("This pack is intended for adults only. Are you 18 or older?", 
                () => {
                    showMidroll(() => { goToScreen('quizNumberScreen'); });
                }, 
                () => {
                    console.log('Cancelled');
                });
        }else{
            showMidroll(() => { goToScreen('quizNumberScreen'); });
        }
    }else{
        goToScreen('quizNumberScreen');
    }
}

function onGameSetup() {
    if(restart && isHost){
        startQuiz();
    }else{
        goToScreen('inviteScreen');
    }
}

function inviteFriend() {
    if (isHost) {
        navigator.clipboard.writeText(currentInviteLink)
            .then(() => {
                showAlert("Copied to clipboard!", 'success');
            })
            .catch(err => {
                console.error("Failed to copy:", err);
            });

        setTimeout(() => {
            goToScreen('waitingScreen');
        }, 1000);
    }
}

function onTypeSelect(number) {
    quizType = number;
}

function setMaxQuizCount(number) {
    MAX_ROUNDS = number;
}

function onOtherPlayerJoin(player) {
    if(player && player.name){
        joinedFriendName.innerText = player.name;

        if(isHost){
            tempFriendName = player.name;
        }else{
            friendName = player.name;
        }

        if(isHost){
            goToScreen('friendConnectedScreen');
        }else{
            goToScreen('inGameWaitingScreen');
        }
    }
}

function onOtherPlayerLeave(){
    showAlert('Other Player Disconnected', 'error', 10000);
}

function acceptFriend() {
    friendName = tempFriendName;
    startQuiz(); // Host starts quiz after guest joins
}

function startQuiz() {
    if (isHost) {
        sendData('GameRoom:StartQuiz', { quizType: quizType, maxRounds: MAX_ROUNDS });
    }
}

function onNextQuiz(data){
    if(data){
        setQuiz(data.quiz, data.round);
        askedQuestions.push(data.quiz);
    }
}

function setQuiz(quiz, quizNumber) {
    if (quiz && quiz.length > 0) {
        questionArea.innerHTML = quiz;
        answerInput.value = '';

        questionNumber.innerText = `Question ${quizNumber}`;
        goToScreen('beforeQuestionScreen');

        setTimeout(() => {
            goToScreen('questionScreen');
        }, 3000);
    }
}

function generateReactions(reactions){
    if(reactions.length > 0){
        reactionContainer.innerHTML = '';

        reactions.forEach((reaction) => {
            const button = document.createElement('button');

            if(reaction.className !== undefined){
                button.classList.add('button', reaction.className);
            }else{
                button.classList.add('button', 'buttonReaction');
            }
            
            button.innerHTML = reaction.isReward ?  reaction.label + ' +' + reaction.points + Icons.video('#6500c9', 20, 20, '0 0 0 8px') : reaction.label + ' +' + reaction.points;
            button.onclick =  () => beforeSubmitReview(Number(reaction.points), reaction.label, reaction.isReward);

            reactionContainer.appendChild(button);
        });
    }
}

// ✳️ Answer Phase
function submitAnswer() {
    const answer = answerInput.value.trim();

    if (answer) {
        sendData('GameRoom:SubmitAnswer', { answer: answer });
        goToScreen('inGameWaitingScreen');
    } else {
        showAlert("Let's give a valid Answer", 'warning');
    }
}

function onSetReview(data) {
    if (data && typeof data.answer == 'string' && typeof data.quiz == 'string' && data.reactions.length > 0) {
        questionArea_2.innerHTML = data.quiz;
        friendsGuess.innerText = data.answer;
        friendsAnswer = data.answer;

        generateReactions(data.reactions);
        goToScreen('reviewScreen');
    }else{
        console.log(data);
    }
}

// ✳️ Review Phase
function beforeSubmitReview(score, reaction, isReward = false) {
    if(isReward){
        showMidroll(() => { submitReview(score, reaction); });
    }else{
        submitReview(score, reaction);
    }
}

function submitReview(score, reaction){
    if (typeof score === 'number') {
        sendData('GameRoom:SubmitReview', { score: score, reaction: reaction });
        goToScreen('inGameWaitingScreen');
    } else {
        showAlert("Please select Correct or Wrong", 'warning');
    }
}

function onSetMarks(data){
    if (
        data && 
        typeof data.quiz === 'string' && 
        typeof data.answer === 'string' && 
        typeof data.lastReaction === 'string' && 
        typeof data.lastAddedScore === 'number' && 
        typeof data.score === 'number' && 
        typeof data.otherScore === 'number' 
    ) {
        const pName = playerName.split(' ');
        const fName = friendName.split(' ');
        scoreHtml.innerText = `${pName[0]} : ${data.score} | ${fName[0]} : ${data.otherScore}`;

        correctWrong.innerText = data.lastReaction + ' +' + data.lastAddedScore;
        goToScreen('correctWrongScreen');
    } else {
        console.warn("onShowReviewResult: Invalid data received", data);
    }
}

// ✳️ Ready Next Phase
function submitReadyNextQuiz(){
    sendData('GameRoom:SubmitReadyNext', { readyNext: true });
    goToScreen('inGameWaitingScreen');
}

function onSetWinner(data){
    if (data.isDraw) {
        winnerIs.innerText = 'It\'s a Draw!';
        winnerName.innerText = 'You both played well!';
    } else {
        winnerIs.innerText = 'The Winner is';
        winnerName.innerText = data.winner.name + ' 🥳';
    }

    for(let c = 0; c < 5; c++){
        setTimeout(() => {
            createConfetti();
        }, c * (500 + 1000 * Math.random()));
    }

    goToScreen('winnerScreen');
}


function requestRestart(){
    sendData('GameRoom:RequestRestart', { restart: true });
    goToScreen('inGameWaitingScreen');
}

function onRequestRestart(){
    goToScreen('requestRestartScreen');
}

function acceptRestart(){
    sendData('GameRoom:AcceptRestart', { restart: true });
    goToScreen('inGameWaitingScreen');
}

function onRestart(data){
    if(data && data.restart){
        if(isHost){
            restart = true;
            goToScreen('typeSelectionScreen');
        }
    }
}

// function  register() {
//     const email = document.getElementById('registerEmail').value.trim();
//     const password = document.getElementById('registerPassword').value.trim();
//     const username = document.getElementById('registerUsername').value.trim();

//     const data = {
//         email: email,
//         username: username,
//         password: password
//     };

//     fetch(`${DOMAIN}/api/users/register`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(data)
//     })
//     .then(async (response) => {
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.message || 'Failed to register');
//         }
//         return response.json();
//     })
//     .then(data => {
//         showAlert(data.message, 'succes');
//         goToScreen('startScreen');
//     })
//     .catch(error => {
//         showAlert(error.message, 'error');
//         console.error('Error:', error.message);
//     });
// }

// function login(){
//     const email = document.getElementById('emailInput').value.trim();
//     const password = document.getElementById('passwordInput').value.trim();

//     const data = {
//         email: email,
//         password: password
//     };

//     fetch(`${DOMAIN}/api/users/login`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(data)
//     })
//     .then(async (response) => {
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.message || 'Failed to register');
//         }
//         return response.json();
//     })
//     .then(data => {
//         showAlert(data.message, 'succes');
//         goToScreen('startScreen');
//     })
//     .catch(error => {
//         showAlert(error.message, 'error');
//         console.error('Error:', error.message);
//     });
// }



//Helpers


//https://knowmebetter.io/applixir-callback
function showMidroll(callBack){
    const options = {
        apiKey: "7d6523f3-96c1-4377-966f-46167b1e3e28", // Replace with your actual API key
        injectionElementId: "adPlacement", // This is the ID of the div from step 2.
        customParams: {
            sessionId: client.sessionId,
            roomId: connectionId
        },
        adStatusCallbackFn: (status) => {
            callBack();
        },
        adErrorCallbackFn: (error) => { 
            callBack();
            console.log("Error: ", error.getError().data);
        }
    };

    initializeAndOpenPlayer(options);
}

function goToScreen(toId) {
    const fromScreen = document.getElementById(currentScreenId) || null;
    const toScreen = document.getElementById(toId);

    if (toScreen) {
        // If there's a screen to hide, remove its 'active' class
        if (fromScreen && fromScreen !== toScreen) { // Don't do anything if to and from are the same
            fromScreen.classList.remove('active');
        }

        toScreen.classList.add('active');
        currentScreenId = toId;

        //console.log(`Transitioned from ${fromId || 'null'} to ${toId}`);
    } else {
        console.error(`Screen with ID "${toId}" not found.`);
    }
}

function showAlert(message = "Success!", type = 'info', duration = 2000) {
  const alertBox = document.getElementById("alertBox");

  // Icons per type
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor"
                  viewBox="0 0 16 16">
                  <path d="M8.982 1.566a1.5 1.5 0 0 0-2.964 0L.165 13.233A1.5 1.5 0 0 0 1.5 15h13a1.5 1.5 0 0 0 1.335-2.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor"
               viewBox="0 0 16 16">
               <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM8.93 4.588a.5.5 0 1 1-.858-.514.5.5 0 0 1 .858.514zM6.5 7h1v4h1V7h1V6H6.5v1z"/>
            </svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor"
                viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 
                .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 
                4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>`
  };

  // Background colors per type
  const colors = {
    success: "#28a745",  // Green
    warning: "#FFCC00",  // Yellow
    info: "#17a2b8",     // Blue
    error: "#dc3545"     // Red
  };
  
  const textColors = {
    success: "#ffffff",  // Green
    warning: "#000000",  // Yellow
    info: "#ffffff",     // Blue
    error: "#ffffff"     // Red
  };

  // Fallback if type is invalid
  const alertType = colors[type] ? type : 'info';

  alertBox.innerHTML = icons[alertType] + `<span style="margin-left: 10px;">${message}</span>`;
  alertBox.style.backgroundColor = colors[alertType];
  alertBox.style.color = textColors[alertType];
  alertBox.classList.add("show");

  if (previousAlertTimeout) {
    clearTimeout(previousAlertTimeout);
  }

  previousAlertTimeout = setTimeout(() => {
    alertBox.classList.remove("show");
    previousAlertTimeout = null;
  }, duration);
}

function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';

    input.type = isPassword ? 'text' : 'password';

    if(isPassword){
      iconElement.innerHTML = ` <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
                                <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
                                `;
    }else{
        iconElement.innerHTML = ` <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />
                                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
                                    `;
    }
}


const Icons = {
  video: (color, width = 16, height = 16, margin = '0 8px 0 0') => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" fill="${color}" style="margin: ${margin}; vertical-align: middle;" class="bi bi-play-btn-fill" viewBox="0 0 16 16">
      <path d="M0 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2m6.79-6.907A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814z"/>
    </svg>`;
  }
}

function showConform(message, onYes, onNo) {
  const conform = document.getElementById('conform');
  const msg = document.getElementById('conform-message');
  const yesBtn = document.getElementById('conform-yes');
  const noBtn = document.getElementById('conform-no');

  msg.textContent = message;
  conform.classList.remove('hidden');

  function cleanup() {
    conform.classList.add('hidden');
    yesBtn.removeEventListener('click', handleYes);
    noBtn.removeEventListener('click', handleNo);
  }

  function handleYes() {
    cleanup();
    if (onYes) onYes();
  }

  function handleNo() {
    cleanup();
    if (onNo) onNo();
  }

  yesBtn.addEventListener('click', handleYes);
  noBtn.addEventListener('click', handleNo);
}

const toggleBtn = document.getElementById('feedback-toggle');
const form = document.getElementById('feedback-form');
const sendBtn = document.getElementById('feedback-send');
const textarea = document.getElementById('feedback-text');
const container = document.getElementById('feedback-container');

toggleBtn.addEventListener('click', () => {
    if(form.classList.contains('hidden')){
        form.classList.replace('hidden', 'flex')
    }else{
        form.classList.replace('flex', 'hidden');
    }
});

function enableFeedBack(state){
    if(state){
        if(toggleBtn.classList.contains('hidden')){
            toggleBtn.classList.replace('hidden', 'flex')
        }else{
            toggleBtn.classList.add('flex');
        }
    }else{
        if(toggleBtn.classList.contains('flex')){
            toggleBtn.classList.replace('flex', 'hidden');
        }else{
            toggleBtn.classList.add('hidden');
        }
    }
}

sendBtn.addEventListener('click', () => {
  const message = textarea.value.trim();
  if (message) {
    sendData('GameRoom:FeedBack', { message });
    textarea.value = '';
    form.classList.add('hidden');
    showAlert("Thanks for your feedback!", "success");
    form.classList.replace('flex', 'hidden');
  }
});

document.addEventListener('click', (event) => {
  if (!container.contains(event.target) && form.classList.contains('flex')) {
    form.classList.replace('flex', 'hidden');
  }
});


