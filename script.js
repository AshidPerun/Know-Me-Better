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


let currentScreenId = 'startScreen';
let quizType = 0;
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

    console.log(
        "%cOf course you can cheat... but why? 😊",
        "color: #ff4081; font-size: 16px; font-weight: bold;"
    );
});

Object.entries(questionsMap).forEach(([key, { label }]) => {
    const h3 = document.createElement('h3');
    h3.innerText = label;
    h3.onclick = () => onTypeSelect(Number(key));
    
    selectionContainer.appendChild(h3);
});

document.querySelectorAll('.selctionContainer h3').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.selctionContainer h3').forEach(h3 => h3.classList.remove('active'));
    item.classList.add('active');
  });
});

function startGame() {
    if (nameInput.value && nameInput.value.length <= 15) {
        playerName = nameInput.value;
        connect(); // Handles peer connection
    }else if( nameInput.value.length > 15){
        showAlert('Name is Too Big!', 'warning');
    } else {
        showAlert('Enter your name to start', 'warning');
    }
}

function onConnected() {
    if (isHost) {
        goToScreen('typeSelectionScreen');
    } else {
        goToScreen('inGameWaitingScreen'); // Wait for quiz from host
        sendData('Name', { name: playerName });
    }
}

function onGameSetup() {
    if (quizType === 0) {
        showAlert('Please Choose a Quiz Type..', 'warning');
        return;
    }

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

function onOtherPlayerJoin() {
    sendData('Name', { name: playerName });
}

function onName(data) {
    if(data && data.name){
        joinedFriendName.innerText = data.name;

        if(isHost){
            tempFriendName = data.name;
        }else{
            friendName = data.name;
        }

        if(isHost){
            goToScreen('friendConnectedScreen');
        }else{
            goToScreen('inGameWaitingScreen');
        }
    }
}

function acceptFriend() {
    friendName = tempFriendName;
    startQuiz(); // Host starts quiz after guest joins
}

function startQuiz() {
    round = 1;
    myScore = 0;
    friendScore = 0;

    if(!isHost){
        goToScreen('inGameWaitingScreen');
    }else{
        generateQuiz(); // Only host calls this
    }

    if (isHost) {
        sendData('StartQuiz', { round, resetScore: true  }); // Send to peer
    }
}

function onStartQuiz(data){
    if(data){
        round = data.round;

        if(data.resetScore){
            myScore = 0;
            friendScore = 0;
        }
    }
}

function generateQuiz() {
    if (round > MAX_ROUNDS && isHost) {
        setWinner();
        return;
    }

    const typeQuestions = questions_2[questionsMap[quizType].questions];
    const availableQuestions = typeQuestions.filter(q => !askedQuestions.includes(q));

    if (availableQuestions.length === 0) {
        console.warn("No more new questions available.");
        return;
    }

    // Select random new question
    let quiz = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    setQuiz(quiz, round);
    askedQuestions.push(quiz); // add to asked list
    round++;
}

function setQuiz(quiz, quizNumber) {
    if (quiz && quiz.length > 0) {
        questionArea.innerHTML = quiz;
        questionArea_2.innerHTML = quiz;
        answerInput.value = '';

        currentQuiz = quiz;
        isAnsweredCurrentQuiz = false;
        isReviewedCurrentQuiz = false;
        isReadyForNextQuiz = false;
        friendsAnswer = null;
        friendsReview = null;
        friendReadyForNextQuiz = false;

        if (isHost) {
            sendData('Quiz', { quiz, quizNumber }); // Send to peer
        }

        questionNumber.innerText = `Question ${quizNumber}`;
        goToScreen('beforeQuestionScreen');

        setTimeout(() => {
            goToScreen('questionScreen');
        }, 3000);
    }
}

function onQuiz(data) {
    setQuiz(data.quiz, data.quizNumber);
}

// ✳️ Answer Phase
function submitAnswer() {
    const answer = answerInput.value.trim();

    if (answer) {
        sendData('Answer', { answer });

        isAnsweredCurrentQuiz = true;
        goToScreen('inGameWaitingScreen');

        // If friend already answered, move to review
        if (friendsAnswer !== null) {
            setReview({ answer: friendsAnswer });
        }
    } else {
        showAlert("Let's give a valid Answer", 'warning');
    }
}

function onAnswer(data) {
    if (isAnsweredCurrentQuiz) {
        setReview(data); // Show their answer for review
    } else {
        friendsAnswer = data.answer;
    }
}

function setReview(data) {
    if (data && data.answer) {
        friendsGuess.innerText = data.answer;
        friendsAnswer = data.answer;

        goToScreen('reviewScreen');
    }
}

// ✳️ Review Phase
function submitReview(state) {
    if (typeof state === 'boolean') {
        myLastSubmittedReview = state; // <<< Store my review of friend's answer
        isReviewedCurrentQuiz = true;
        goToScreen('inGameWaitingScreen');
        sendData('Review', { review: state }); // 'state' is my review of friend's answer

        if (friendsReview !== null) { // friendsReview is friend's review of MY answer
            onReviewResult({ reviewFromFriend: friendsReview });
        }
    } else {
        showAlert("Please select Correct or Wrong", 'warning');
    }
}

function onReview(data) { // data.review IS friend's review of MY answer
    if (isReviewedCurrentQuiz) {
        onReviewResult({ reviewFromFriend: data.review });
    } else {
        friendsReview = data.review;
    }
}

function onReviewResult(resultData) {
    if (resultData && typeof resultData.reviewFromFriend === 'boolean') {
        if(resultData.reviewFromFriend){ // If my friend said MY answer was correct
            myScore++;
        }

        // Send 'ShowReviewResult' to my friend.
        // It needs to contain:
        // 1. MY current score (so friend can update their 'friendScore').
        // 2. MY review of THEIR answer (so friend can display "You said I was [Correct/Wrong]").
        //    This is stored in `myLastSubmittedReview`.
        sendData('ShowReviewResult', {
            friendsNewScore: myScore,                    // This is MY score, which will be the friend's 'friendScore'
            howYouWereReviewedBySender: myLastSubmittedReview // This is MY review of my FRIEND's answer
        });
    } else {
        console.warn("onReviewResult: Invalid data received", resultData);
    }
}

function onShowReviewResult(data){
    // data.friendsNewScore: This is my friend's actual score.
    // data.howYouWereReviewedBySender: This is how my friend (the sender) reviewed MY (the receiver's) answer.
    if (data && typeof data.howYouWereReviewedBySender === 'boolean' && typeof data.friendsNewScore === 'number') {
        friendScore = data.friendsNewScore; // Update my local variable for my friend's score.

        const pName = playerName.split(' ');
        const fName = friendName.split(' ');
        scoreHtml.innerText = `${pName[0]} : ${myScore} | ${fName[0]} : ${friendScore}`;

        // This text should reflect how MY answer was judged by my FRIEND.
        correctWrong.innerText = data.howYouWereReviewedBySender ? 'Correct! 🤪' : 'Wrong! 😕';
        goToScreen('correctWrongScreen');
    } else {
        console.warn("onShowReviewResult: Invalid data received", data);
    }
}

// ✳️ Redy Next Phase
function submitReadyNextQuiz(){
    sendData('ReadyNext', { readyNext: true });
    isReadyForNextQuiz = true;
    goToScreen('inGameWaitingScreen');

    if(friendReadyForNextQuiz){
        nextQuiz();
    }
}

function onReadyNextQuiz(data){
    friendReadyForNextQuiz = true;

    if(isReadyForNextQuiz){
        nextQuiz();
    }
}

function nextQuiz(){
    if(isHost){
        generateQuiz();
    }
}

function setWinner(){
    let winnerPlayerName = null;
    let isDraw = false;

    if (myScore > friendScore) {
        winnerPlayerName = playerName;
    } else if (friendScore > myScore) {
        winnerPlayerName = friendName;
    } else {
        isDraw = true;
    }

    const winnerData = { winner: winnerPlayerName, isDraw: isDraw };

    sendData('Winner', winnerData);
    setWinnerScreen(winnerData);
}

function onWinner(data){
    if(data){
        setWinnerScreen(data);
    } else {
        console.warn("onWinner: Invalid data received", data);
    }
}

function setWinnerScreen(data){
    if (data.isDraw) {
        winnerIs.innerText = 'It\'s a Draw!';
        winnerName.innerText = 'You both played well!';
    } else {
        winnerIs.innerText = 'The Winner is';
        winnerName.innerText = data.winner + ' 🥳';
    }

    for(let c = 0; c < 5; c++){
        setTimeout(() => {
            createConfetti();
        }, c * (500 + 1000 * Math.random()));
    }

    goToScreen('winnerScreen');
}

function requestRestart(){
    sendData('RequestRestart', { restart: true });
    goToScreen('inGameWaitingScreen');
}

function onRestartRequest(data){
    if(data && data.restart){
        goToScreen('requestRestartScreen');
    }
}

function acceptRestart(){
    sendData('AcceptRestart', { restart: true });
    if(isHost){
        restart = true;
        goToScreen('typeSelectionScreen');
    }else{
        goToScreen('inGameWaitingScreen');
    }
}

function onAcceptRestart(data){
    if(data && data.restart){
        if(isHost){
            restart = true;
            goToScreen('typeSelectionScreen');
        }
    }
}

//Helpers
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
