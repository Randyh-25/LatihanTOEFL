let examData = null;
let flatQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // store user answers by question ID/index

// DOM Elements
const sectionInfoEl = document.getElementById('section-info');
const passageContainer = document.getElementById('passage-container');
const passageText = document.getElementById('passage-text');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const navGrid = document.getElementById('nav-grid');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const examContainer = document.getElementById('exam-container');
const resultContainer = document.getElementById('result-container');
const scoreDetails = document.getElementById('score-details');

async function loadExam() {
    try {
        const response = await fetch('PaketA.json');
        examData = await response.json();
        processQuestions();
        renderNavGrid();
        showQuestion(0);
    } catch (err) {
        console.error("Error loading JSON", err);
        questionText.innerHTML = "Failed to load exam data. Please check formatting of PaketA.json";
    }
}

function processQuestions() {
    // Flatten all sections into a single array
    
    // Section 1
    if (examData.Section_1_Listening) {
        examData.Section_1_Listening.forEach(q => {
            flatQuestions.push({
                section: "Section 1: Listening",
                type: "listening",
                no: q.no,
                question: q.question,
                options: q.options,
                answer: q.answer || null
            });
        });
    }

    // Section 2
    if (examData.Section_2_Structure_and_Written_Expression) {
        examData.Section_2_Structure_and_Written_Expression.forEach(q => {
            flatQuestions.push({
                section: "Section 2: Structure and Written Expression",
                type: "structure",
                no: q.no,
                question: q.question,
                options: q.options,
                answer: q.answer || null
            });
        });
    }

    // Section 3
    if (examData.Section_3_Reading_Comprehension) {
        examData.Section_3_Reading_Comprehension.forEach(passageGrp => {
            if (passageGrp.questions) {
                passageGrp.questions.forEach(q => {
                    flatQuestions.push({
                        section: "Section 3: Reading Comprehension",
                        type: "reading",
                        passage: passageGrp.passage,
                        no: q.no,
                        question: q.question,
                        options: q.options,
                        answer: q.answer || null
                    });
                });
            }
        });
    }
}

function renderNavGrid() {
    navGrid.innerHTML = '';
    flatQuestions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.innerText = index + 1;
        btn.id = `nav-btn-${index}`;
        btn.onclick = () => showQuestion(index);
        navGrid.appendChild(btn);
    });
}

function showQuestion(index) {
    if (index < 0 || index >= flatQuestions.length) return;
    
    currentQuestionIndex = index;
    const q = flatQuestions[index];

    // Update section info
    sectionInfoEl.innerText = q.section;

    // Show/hide passage
    if (q.passage) {
        passageContainer.classList.remove('hidden');
        passageText.innerText = q.passage;
    } else {
        passageContainer.classList.add('hidden');
    }

    // Render question
    questionText.innerHTML = `<strong>${index + 1}.</strong> ${q.question || ''}`;
    
    // Render options
    optionsContainer.innerHTML = '';
    if (q.options) {
        for (const [key, value] of Object.entries(q.options)) {
            const label = document.createElement('label');
            label.className = 'option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'question-option';
            radio.value = key;
            
            if (userAnswers[index] === key) {
                radio.checked = true;
            }

            radio.onchange = () => {
                userAnswers[index] = key;
                document.getElementById(`nav-btn-${index}`).classList.add('answered');
            };

            label.appendChild(radio);
            label.append(` ${key}. ${value}`);
            optionsContainer.appendChild(label);
        }
    }

    // Update nav buttons highlight
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-btn-${index}`).classList.add('active');

    // Handle Prev/Next buttons
    prevBtn.disabled = index === 0;
    
    if (index === flatQuestions.length - 1) {
        nextBtn.classList.add('hidden');
        finishBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        finishBtn.classList.add('hidden');
    }
}

prevBtn.onclick = () => showQuestion(currentQuestionIndex - 1);
nextBtn.onclick = () => showQuestion(currentQuestionIndex + 1);

finishBtn.onclick = () => {
    if (confirm("Are you sure you want to finish the exam?")) {
        calculateScore();
    }
};

// Rough Conversion tables (Standard ranges for PBT/ITP)
// S1 (Listening): 50g -> 31 to 68
// S2 (Structure): 40g -> 31 to 68  
// S3 (Reading): 50g -> 31 to 67
function getScaledScore(raw, total) {
    // simplified linear scale for simulation: 31 + (raw/total * (68-31))
    if (raw === 0) return 31;
    let maxScaled = 68;
    if (total === 50 && raw > 40) maxScaled = 68; // just a rough proxy
    return Math.round(31 + (raw / total) * (maxScaled - 31));
}

function calculateScore() {
    let s1Raw = 0, s1Total = 0;
    let s2Raw = 0, s2Total = 0;
    let s3Raw = 0, s3Total = 0;

    flatQuestions.forEach((q, index) => {
        let isCorrect = false;
        
        // In the provided JSON, Section 1/2 don't have explicit "answer" keys
        // We will just assume correctness if userAnswers[index] === q.answer
        // If q.answer is missing, it will count as false unless handling differently.
        if (q.answer && userAnswers[index] === q.answer) {
            isCorrect = true;
        }
        // Hack: Some data doesn't have answers. Ensure we know totals.

        if (q.type === "listening") { s1Total++; if (isCorrect) s1Raw++; }
        else if (q.type === "structure") { s2Total++; if (isCorrect) s2Raw++; }
        else if (q.type === "reading") { s3Total++; if (isCorrect) s3Raw++; }
    });

    const s1Scaled = getScaledScore(s1Raw, s1Total || 50);
    const s2Scaled = getScaledScore(s2Raw, s2Total || 40);
    const s3Scaled = getScaledScore(s3Raw, s3Total || 50);

    const totalToeflScore = Math.round(((s1Scaled + s2Scaled + s3Scaled) * 10) / 3);

    examContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    scoreDetails.innerHTML = `
        <p><strong>Section 1 (Listening):</strong> Raw: ${s1Raw}/${s1Total} => Scaled: ${s1Scaled}</p>
        <p><strong>Section 2 (Structure):</strong> Raw: ${s2Raw}/${s2Total} => Scaled: ${s2Scaled}</p>
        <p><strong>Section 3 (Reading):</strong> Raw: ${s3Raw}/${s3Total} => Scaled: ${s3Scaled}</p>
        <h2>Estimated TOEFL Score: ${totalToeflScore}</h2>
        <p><small>(Note: Some questions in JSON may lack answer keys in this preview)</small></p>
    `;
}

// Start
loadExam();
