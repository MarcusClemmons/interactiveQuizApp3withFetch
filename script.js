import { app } from './firebase.config.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-database.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', function() {
    let questionsArray = [];
    let currentQuestionIndex = 0;
    let userResponses = []; // Array to store user responses
    // Load progress from Local Storage


    const prevButton = document.querySelector('.nav-button.prev');
    const nextButton = document.querySelector('.nav-button.next');
    const progressBar = document.querySelector('.progress');
    const questionsContainer = document.getElementById('multipleChoice');
     nextButton.addEventListener("click",function(){
        document.getElementById("quizResponse").innerHTML = "";
     })
     function updateProgressBar() {
        const progressPercentage = (currentQuestionIndex + 1) / questionsArray.length * 100;
        progressBar.style.width = `${progressPercentage}%`;
        saveProgress(); // Save progress whenever the progress bar is updated
    }

    function showQuestion(index) {
        if (!questionsContainer) return;
        questionsContainer.innerHTML = questionsArray[index];
        currentQuestionIndex = index;
        updateProgressBar();
        attachAnswerCheckListeners();
        attachDragAndDropListeners();
    
        // Show the submit button only if it's the last question
        if (currentQuestionIndex === questionsArray.length - 1) {
            document.getElementById('submitQuiz').style.display = 'block';
        } else {
            document.getElementById('submitQuiz').style.display = 'none';
        }
    }

    // Add an event listener for the submit button
document.getElementById('submitQuiz').addEventListener('click', handleSubmit);

function handleSubmit() {
    const auth = getAuth();
    const userEmail = auth.currentUser ? auth.currentUser.email : null;
    if (!userEmail) {
        console.error("User email is not available.");
        return;
    }

    // Replace '.' with ',' in email to use as a Firebase key
    const formattedEmail = userEmail.replace(/\./g, ',');

    // Calculate total score
    const totalScore = userResponses.filter(response => response.isCorrect).length * 10;
    const lastQuestionId = `q${currentQuestionIndex + 1}`;

    // Prepare user data for saving
    const userData = {
        progress: {
            lastQuestionId: lastQuestionId,
            totalScore: totalScore
        },
        responses: {}
    };

    userResponses.forEach((response, index) => {
        userData.responses[`q${index + 1}`] = {
            response: response.response,
            timestamp: new Date().toISOString()
        };
    });

    // Firebase Realtime Database URL
    const databaseURL = `https://marcus-quiz-app-default-rtdb.firebaseio.com/User/${formattedEmail}.json`;

    fetch(databaseURL, {
        method: 'PUT', // Use PUT method to replace the data at the specified path
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log("Responses saved to Realtime Database");
        // Handle successful submission (e.g., redirect to a thank you page)
    })
    .catch(error => {
        console.error("Error saving responses:", error);
        // Handle errors (e.g., show an error message to the user)
    });
}



    function attachDragAndDropListeners() {
        const items = questionsContainer.querySelectorAll('.ordering-item');
        if (items.length > 0) {
            items.forEach(item => {
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('dragover', handleDragOver);
                item.addEventListener('drop', handleDrop);
                item.addEventListener('dragend', handleDragEnd);
            });
        }
    }

    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.id);
        e.target.classList.add('dragging');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.target.classList.add('over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const draggable = document.getElementById(id);
        const dropzone = e.target;

        if (dropzone.className.includes('ordering-item')) {
            dropzone.parentNode.insertBefore(draggable, dropzone.nextSibling);
        }

        dropzone.classList.remove('over');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.classList.remove('over');
    }

    prevButton.addEventListener('click', function() {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1);
        }
    });

    nextButton.addEventListener('click', function() {
        if (currentQuestionIndex < questionsArray.length - 1) {
            showQuestion(currentQuestionIndex + 1);
        }
    });

    function fetchQuestions() {
        // Replace this URL with your Firebase Realtime Database URL
        const databaseURL = 'https://marcus-quiz-app-default-rtdb.firebaseio.com/Questions.json';
        
        fetch(databaseURL)
        .then(response => response.json())
        .then(data => {
            displayQuestions(data);
            initQuiz(); // Initialize the quiz after questions are fetched
        })
        .catch(error => {
            console.error("Error fetching questions:", error);
            // Handle errors (e.g., show an error message)
        });
    }
    let currentCorrectOrder = [];

    function displayQuestions(questions) {
        userResponses = questions.map(() => ({
            type: null,
            response: null,
            isCorrect: false
        }));
        questionsArray = []; // Reset the questions array

        Object.keys(questions).forEach(key => {
            const question = questions[key];
            let questionHTML = "";

            if (question.hasOwnProperty('options')) {
                questionHTML = `<div class="question multiple-choice">`;
                questionHTML += `<p class="question-text">${question.question}</p><div class="options">`;
            
                question.options.forEach((option, index) => {
                    questionHTML += `<button class="option" data-choice="${option.choice}" id="option-${index}">${option.text}</button>`;
                });
            
                questionHTML += `</div></div>`;
                questionsArray.push(questionHTML);
            } else if (question.hasOwnProperty('answer')) {
                // Code for handling fill-in-the-blank questions
                questionHTML = `<div class="question fill-in-the-blank">`;
                questionHTML += `<p class="question-text">${question.question}</p><div class="options">`;
                questionHTML += `<input type="text" class="blank-input" id="answer-${key}">`;
                questionHTML += `</div></div>`;
                questionsArray.push(questionHTML);
            } else if (question.hasOwnProperty('ordered')) {
                currentCorrectOrder = question.correctOrder; // Store the correct order

                questionHTML = `<div class="question ordered">`;
                questionHTML += `<p class="question-text">${question.question}</p><div class="options ordering-container" id="ordering-${key}">`;
    
                question.ordered.forEach((ordered, index) => {
                    questionHTML += `<div class="ordering-item" draggable="true" id="item-${index}" data-value="${ordered}">${ordered}</div>`;
                });
    
                questionHTML += `</div></div>`;
                questionsArray.push(questionHTML);
            }
        });
    }
    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.classList.remove('over');
    
        checkOrder(); // Check the order of items after drag end
    }
    function checkOrder() {
        const items = document.querySelectorAll('.ordering-container .ordering-item');
        const currentOrder = Array.from(items).map(item => parseInt(item.getAttribute('data-value')));
    
        if (arraysEqual(currentOrder, currentCorrectOrder)) {
            document.getElementById("quizResponse").innerHTML = "Success!";
        } else {
            document.getElementById("quizResponse").innerHTML = "Try again!";
        }
    }
    
    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }
    function initQuiz() {
        if (questionsArray.length > 0) {
            loadProgress(); // Load progress here after questions are fetched
            showQuestion(currentQuestionIndex);
        }
    }

    function attachAnswerCheckListeners() {
        if (currentQuestionIndex < questionsArray.length) {
            const questionType = questionsArray[currentQuestionIndex].split(' ')[2]; // Get question type

            if (questionType.includes('multiple-choice')) {
                const options = document.querySelectorAll('.option');
                options.forEach(option => {
                    option.addEventListener('click', checkMultipleChoiceAnswer);
                });
            } else if (questionType.includes('fill-in-the-blank')) {
                const inputField = document.getElementById(`answer-${currentQuestionIndex}`);
                if (inputField) {
                    inputField.addEventListener('input', () => {
                        checkAnswer(currentQuestionIndex, inputField.value);
                    });
                }
            }
        }
    }
    function checkMultipleChoiceAnswer(event) {
        const selectedChoice = event.target.getAttribute('data-choice') === 'true';
        const selectedText = event.target.textContent;

        // Store response
        userResponses[currentQuestionIndex] = {
            type: "multiple-choice",
            response: selectedText,
            isCorrect: selectedChoice
        };

        if (selectedChoice) {
            document.getElementById("quizResponse").innerHTML = "Success!";
        } else {
            document.getElementById("quizResponse").innerHTML = "Try again!";
        }
    }

    function checkAnswer(questionKey, userAnswer) {
        const db = getDatabase();
        const answerRef = ref(db, `Questions/${questionKey}/answer`);

        onValue(answerRef, (snapshot) => {
            const correctAnswer = snapshot.val();

            // Store response
            userResponses[questionKey] = {
                type: "fill-in-the-blank",
                response: userAnswer,
                isCorrect: userAnswer.toLowerCase() === correctAnswer.toLowerCase()
            };

            if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                document.getElementById("quizResponse").innerHTML = "Correct";
            } else {
                document.getElementById("quizResponse").innerHTML = "Incorrect. Try again!";
            }
        }, {
            onlyOnce: true
        });
        saveProgress();
    }

    function saveProgress() {
        const quizState = {
            currentQuestionIndex,
            userResponses
        };
        localStorage.setItem('quizState', JSON.stringify(quizState));
        console.log('Quiz state saved:', quizState);

    }

    function loadProgress() {
        const savedState = JSON.parse(localStorage.getItem('quizState'));
        console.log('Loaded saved state:', savedState);
    
        if (savedState) {
            currentQuestionIndex = savedState.currentQuestionIndex;
            userResponses = savedState.userResponses;
            showQuestion(currentQuestionIndex);
        }
    }

    
    document.addEventListener('DOMContentLoaded', function() {
       
    
        loadProgress(); 
    });


    fetchQuestions();
});

