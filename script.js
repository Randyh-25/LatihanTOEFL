let examData = null;
let flatQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; 
let isTimedMode = false;
let currentActiveSectionId = 0;
let lastSeenSectionId = 0; // Track untuk memunculkan hint layar directions

// Timer states
let sectionTimerInterval = null;
let questionTimerInterval = null;
let sectionTimeRemaining = 0; 
let questionTimeInfo = { phase: '', remaining: 0 }; 

// DOM Elements
const sectionInfoEl = document.getElementById('section-info');
const timerDisplay = document.getElementById('time');
const passageContainer = document.getElementById('passage-container');
const passageText = document.getElementById('passage-text');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const navGrid = document.getElementById('nav-grid');
const clearBtn = document.getElementById('clear-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const examContainer = document.getElementById('exam-container');
const resultContainer = document.getElementById('result-container');
const scoreDetails = document.getElementById('score-details');

const sdScreen = document.getElementById('section-directions-screen');
const sdTitle = document.getElementById('sd-title');
const sdContent = document.getElementById('sd-content');
const sdBtn = document.getElementById('sd-btn');

const SECTION_HINTS = {
    1: {
        title: "Section 1: Listening Comprehension",
        content: "Mengevaluasi kemampuan Anda memahami bahasa lisan bahasa Inggris.<br><br><strong>Cara Menjawab (Sesuai TOEFL):</strong><br>Dengarkan/baca baik-baik percakapan pendek yang disajikan. Setelah dialog selesai, akan ada sebuah pertanyaan. Anda harus memilih satu jawaban terbaik (A, B, C, atau D) dengan mengeklik opsi yang tersedia.<br><br><strong>Tips:</strong> Semua rekaman audio aslinya mengalir terus menerus tanpa bisa di-pause. Pada mode dengan waktu, Anda punya 10 detik membaca opsi dan 12 detik untuk klik jawaban sebelum dipindah otomatis."
    },
    2: {
        title: "Section 2: Structure and Written Expression",
        content: "Bagian ini dirancang untuk menguji kemampuan gramatikal bahasa Inggris standar.<br><br><strong>Cara Menjawab (Sesuai TOEFL):</strong><br>1. <strong>Structure (No 1-15):</strong> Anda akan melihat kalimat rumpang. Pilih salah satu opsi (A, B, C, atau D) yang paling tepat untuk melengkapi kalimat tersebut.<br>2. <strong>Written Expression (No 16-40):</strong> Anda akan melihat kalimat dengan 4 kata/frasa yang digarisbawahi. Pilih satu kata/frasa yang SALAH secara tata bahasa.<br><br><strong>Tips:</strong> Ini adalah balapan dengan waktu. Alokasikan maksimal 30-40 detik per soal dengan klik jawaban langsung."
    },
    3: {
        title: "Section 3: Reading Comprehension",
        content: "Menguji kemampuan membaca bahan gaya akademis.<br><br><strong>Cara Menjawab (Sesuai TOEFL):</strong><br>Anda akan diberikan teks bacaan (passage) di sebelah kiri/atas dan soal di area pertanyaan. Jawablah soal berdasarkan informasi yang tertulis eksplisit maupun tersirat dalam teks. Klik pada salah satu opsi (A, B, C, atau D) sebagai jawaban paling benar.<br><br><strong>Tips:</strong> Jangan baca teks sepenuhnya dulu. Lakukan teknik <em>skimming</em> (membaca sekilas kalimat pertama tiap paragraf), lalu langsung baca soal dan cari letak kata kuncinya di dalam teks. Rata-rata 1 menit per soal."
    }
};

async function startSetup() {
    const paket = document.getElementById('paket-select').value;
    const mode = document.getElementById('mode-select').value;
    isTimedMode = (mode === 'timed');
    
    document.getElementById('welcome-screen').classList.add('hidden');
    examContainer.classList.remove('hidden');
    
    try {
        const response = await fetch(paket);
        examData = await response.json();
        processQuestions();
        renderNavGrid();
        showQuestion(0);
    } catch (err) {
        console.error("Error loading JSON", err);
        questionText.innerHTML = "Failed to load exam data. Make sure JSON file exists.";
    }
}

function processQuestions() {
    flatQuestions = [];
    
    if (examData.Section_1_Listening) {
        examData.Section_1_Listening.forEach(q => {
            flatQuestions.push({
                section: "Section 1: Listening",
                sectionId: 1,
                type: "listening",
                no: q.no,
                question: q.question,
                options: q.options,
                answer: q.answer || null
            });
        });
    }

    if (examData.Section_2_Structure_and_Written_Expression) {
        examData.Section_2_Structure_and_Written_Expression.forEach(q => {
            flatQuestions.push({
                section: "Section 2: Structure and Written Expression",
                sectionId: 2,
                type: "structure",
                no: q.no,
                question: q.question,
                options: q.options,
                answer: q.answer || null
            });
        });
    }

    if (examData.Section_3_Reading_Comprehension) {
        examData.Section_3_Reading_Comprehension.forEach(passageGrp => {
            if (passageGrp.questions) {
                passageGrp.questions.forEach(q => {
                    flatQuestions.push({
                        section: "Section 3: Reading Comprehension",
                        sectionId: 3,
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
    let currentSection = '';

    flatQuestions.forEach((q, index) => {
        if (q.section !== currentSection) {
            currentSection = q.section;
            const sectionHeader = document.createElement('div');
            sectionHeader.innerText = currentSection;
            sectionHeader.style.gridColumn = '1 / -1';
            sectionHeader.style.margin = '10px 0 5px 0';
            sectionHeader.style.fontSize = '0.85em';
            sectionHeader.style.fontWeight = 'bold';
            sectionHeader.style.color = '#1e3a8a';
            navGrid.appendChild(sectionHeader);
        }

        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.innerText = index + 1;
        btn.id = `nav-btn-${index}`;
        
        btn.onclick = () => {
            if (isTimedMode) {
                const targetQ = flatQuestions[index];
                const currentQ = flatQuestions[currentQuestionIndex];
                
                // Listening strict forward-only rule
                if (currentQ.type === 'listening' || targetQ.type === 'listening') {
                    alert("Mode Simulasi: Anda tidak bisa menavigasi bagian Sesi Listening secara bebas.");
                    return;
                }
                
                // Section lockdown rule
                if (targetQ.sectionId !== currentQ.sectionId) {
                    alert("Mode Simulasi: Anda harus menyelesaikan sesi saat ini sebelum pindah ke sesi lain atau Anda tidak diizinkan kembali ke sesi yang telah berlalu.");
                    return;
                }
            }
            showQuestion(index);
        };
        navGrid.appendChild(btn);
    });
}

function formatQuestionText(text) {
    if (!text) return '';
    let formatted = text
        .replace(/\((Women|Woman)\):\s*/gi, '<br><strong>Woman:</strong> ')
        .replace(/\((Men|Man)\):\s*/gi, '<br><strong>Man:</strong> ')
        .replace(/\((Narator|Narrator)\):\s*/gi, '<br><br><strong>Narrator:</strong> ')
        .replace(/->\s*(.*?)(?=\s*\((Women|Woman|Men|Man|Narator|Narrator)\):|$)/gi, '<br><em style="color: #6b7280; font-size: 0.9em;">&rarr; $1</em>');
    return formatted.replace(/^(<br>)+/, '');
}

function handleTimerTransition(newSectionId) {
    if (!isTimedMode) return;
    
    if (newSectionId !== currentActiveSectionId) {
        clearInterval(sectionTimerInterval);
        clearInterval(questionTimerInterval);
        currentActiveSectionId = newSectionId;
        
        if (newSectionId === 2) {
            sectionTimeRemaining = 25 * 60; // 25 Menit Sesi 2
            startSectionTimer();
        } else if (newSectionId === 3) {
            sectionTimeRemaining = 55 * 60; // 55 Menit Sesi 3
            startSectionTimer();
        }
    }
}

function startSectionTimer() {
    updateTimerDisplay(sectionTimeRemaining, "Section Time");
    sectionTimerInterval = setInterval(() => {
        sectionTimeRemaining--;
        updateTimerDisplay(sectionTimeRemaining, "Section Time");
        if (sectionTimeRemaining <= 0) {
            clearInterval(sectionTimerInterval);
            alert("Waktu untuk Sesi ini telah habis!");
            forceNextSection();
        }
    }, 1000);
}

function forceNextSection() {
    const nextSectionIndex = flatQuestions.findIndex(q => q.sectionId > currentActiveSectionId);
    if (nextSectionIndex !== -1) {
        showQuestion(nextSectionIndex);
    } else {
        calculateScore();
    }
}

function updateTimerDisplay(seconds, prefix) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    document.getElementById('time').innerText = `${prefix}: ${m}:${s}`;
}

function startListeningQuestionTimer() {
    clearInterval(questionTimerInterval);
    
    questionTimeInfo.phase = 'reading';
    questionTimeRemaining = 10;
    
    const updateListeningUI = () => {
        if (questionTimeInfo.phase === 'reading') {
            document.getElementById('time').innerText = `Read Dialog: ${questionTimeRemaining}s`;
            document.getElementById('time').style.color = '#eab308'; 
        } else {
            document.getElementById('time').innerText = `Answer Time: ${questionTimeRemaining}s`;
            document.getElementById('time').style.color = '#dc2626'; 
        }
    };

    updateListeningUI();
    
    questionTimerInterval = setInterval(() => {
        questionTimeRemaining--;
        
        if (questionTimeRemaining <= 0) {
            if (questionTimeInfo.phase === 'reading') {
                questionTimeInfo.phase = 'answering';
                questionTimeRemaining = 12;
            } else {
                clearInterval(questionTimerInterval);
                document.getElementById('time').style.color = 'white';
                
                const nextIdx = currentQuestionIndex + 1;
                if (nextIdx < flatQuestions.length && flatQuestions[nextIdx].sectionId === 1) {
                    showQuestion(nextIdx);
                } else if (nextIdx < flatQuestions.length) {
                    showQuestion(nextIdx);
                } else {
                    calculateScore();
                }
                return;
            }
        }
        updateListeningUI();
    }, 1000);
}

function showQuestion(index) {
    if (index < 0 || index >= flatQuestions.length) return;
    
    const q = flatQuestions[index];

    // Cek apakah masuk ke seksi baru (maka tunjukkan Overlay Layar Hint)
    if (q.sectionId !== lastSeenSectionId) {
        // Tampilkan overlay arahan seksi
        sdTitle.innerText = SECTION_HINTS[q.sectionId].title;
        sdContent.innerHTML = SECTION_HINTS[q.sectionId].content;
        sdScreen.classList.remove('hidden');

        // Pause behavior dengan cara mengosongkan timer di background (jika ada) hingga sdBtn di click
        clearInterval(sectionTimerInterval);
        clearInterval(questionTimerInterval);

        // Hanya daftarkan event onclick sekali saja menghindari duplikasi stack
        sdBtn.onclick = () => {
            sdScreen.classList.add('hidden');
            lastSeenSectionId = q.sectionId;
            showQuestion(index); // Jalankan ulang dengan ID seksi yg sudah disamakan
        };
        
        return; // Hentikan eksekusi draw soal disini, lalu lanjutkan nanti dari dalam event handler button
    }

    handleTimerTransition(q.sectionId);
    
    if (isTimedMode && q.type === 'listening') {
        startListeningQuestionTimer();
    } else if (!isTimedMode || q.type !== 'listening') {
        clearInterval(questionTimerInterval);
        document.getElementById('time').style.color = 'white';
        if (!isTimedMode) document.getElementById('time').innerText = 'Untimed Mode';
    }
    
    currentQuestionIndex = index;
    sectionInfoEl.innerText = q.section;

    if (q.passage) {
        passageContainer.classList.remove('hidden');
        passageText.innerText = q.passage;
    } else {
        passageContainer.classList.add('hidden');
    }

    questionText.innerHTML = `<strong>${index + 1}.</strong> ${formatQuestionText(q.question)}`;
    
    if (userAnswers[index]) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    optionsContainer.innerHTML = '';
    if (q.options) {
        for (const [key, value] of Object.entries(q.options)) {
            const label = document.createElement('label');
            label.className = 'option';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'question-option';
            radio.value = key;
            
            if (userAnswers[index] === key) radio.checked = true;

            radio.onchange = () => {
                userAnswers[index] = key;
                const btn = document.getElementById(`nav-btn-${index}`);
                if(btn) btn.classList.add('answered');
                clearBtn.classList.remove('hidden');
            };
            label.appendChild(radio);
            label.append(` ${key}. ${value}`);
            optionsContainer.appendChild(label);
        }
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeNavBtn = document.getElementById(`nav-btn-${index}`);
    if(activeNavBtn) activeNavBtn.classList.add('active');

    // Navigation Button Rules
    if (isTimedMode) {
        if (q.type === 'listening') {
            prevBtn.disabled = true;
            nextBtn.classList.add('hidden'); 
            finishBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            
            const hasPrevInSection = (index > 0 && flatQuestions[index - 1].sectionId === q.sectionId);
            prevBtn.disabled = !hasPrevInSection;
            
            const hasNextInSection = (index < flatQuestions.length - 1 && flatQuestions[index + 1].sectionId === q.sectionId);
            if (hasNextInSection) {
                nextBtn.innerText = "Next";
                finishBtn.classList.add('hidden');
            } else {
                nextBtn.innerText = q.sectionId !== 3 ? "Next Section" : "Finish Exam";
                
                // Allow them to click it to move to next section if they finish early
                if (q.sectionId === 3) {
                    nextBtn.classList.add('hidden');
                    finishBtn.classList.remove('hidden');
                } else {
                    finishBtn.classList.add('hidden');
                }
            }
        }
    } else {
        prevBtn.disabled = index === 0;
        if (index === flatQuestions.length - 1) {
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            nextBtn.innerText = "Next";
            finishBtn.classList.add('hidden');
        }
    }
}

prevBtn.onclick = () => showQuestion(currentQuestionIndex - 1);
nextBtn.onclick = () => showQuestion(currentQuestionIndex + 1);
clearBtn.onclick = () => {
    delete userAnswers[currentQuestionIndex];
    const navBtn = document.getElementById(`nav-btn-${currentQuestionIndex}`);
    if(navBtn) navBtn.classList.remove('answered');
    showQuestion(currentQuestionIndex);
};

finishBtn.onclick = () => {
    if (confirm("Are you sure you want to finish the exam?")) {
        calculateScore();
    }
};

function getScaledScore(raw, total) {
    if (raw === 0) return 31;
    let maxScaled = 68;
    if (total === 50 && raw > 40) maxScaled = 68; 
    return Math.round(31 + (raw / total) * (maxScaled - 31));
}

function calculateScore() {
    clearInterval(sectionTimerInterval);
    clearInterval(questionTimerInterval);

    let s1Raw = 0, s1Total = 0;
    let s2Raw = 0, s2Total = 0;
    let s3Raw = 0, s3Total = 0;

    flatQuestions.forEach((q, index) => {
        let isCorrect = false;
        if (q.answer && userAnswers[index] === q.answer) isCorrect = true;

        if (q.type === "listening") { s1Total++; if (isCorrect) s1Raw++; }
        else if (q.type === "structure") { s2Total++; if (isCorrect) s2Raw++; }
        else if (q.type === "reading") { s3Total++; if (isCorrect) s3Raw++; }
    });

    const s1Scaled = s1Total > 0 ? getScaledScore(s1Raw, s1Total) : 0;
    const s2Scaled = getScaledScore(s2Raw, s2Total || 40);
    const s3Scaled = getScaledScore(s3Raw, s3Total || 50);

    let totalToeflScore = 0;
    if (s1Total === 0) {
        totalToeflScore = Math.round(((s2Scaled + s3Scaled) * 10) / 2);
    } else {
        totalToeflScore = Math.round(((s1Scaled + s2Scaled + s3Scaled) * 10) / 3);
    }

    examContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    scoreDetails.innerHTML = `
        ${s1Total > 0 ? `<p><strong>Section 1 (Listening):</strong> Raw: ${s1Raw}/${s1Total} => Scaled: ${s1Scaled}</p>` : ''}
        <p><strong>Section 2 (Structure):</strong> Raw: ${s2Raw}/${s2Total} => Scaled: ${s2Scaled}</p>
        <p><strong>Section 3 (Reading):</strong> Raw: ${s3Raw}/${s3Total} => Scaled: ${s3Scaled}</p>
        <h2>Estimated TOEFL Score: ${totalToeflScore}</h2>
        <p><small>(Penilaian ITP PBT Asli. Jika menggunakan Paket B, Listening dieksklusikan dari nilai akhir).</small></p>
    `;
}

// --- HIDDEN FEATURE (MAGIC FILL) ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'F8') {
        e.preventDefault();
        flatQuestions.forEach((q, i) => {
            if (q.options) {
                userAnswers[i] = q.answer || Object.keys(q.options)[0];
                if(document.getElementById(`nav-btn-${i}`)) document.getElementById(`nav-btn-${i}`).classList.add('answered');
            }
        });
        showQuestion(currentQuestionIndex);
        alert("Cheat diaktifkan: Semua soal telah diisi dengan jawaban BENAR");
    }
    if (e.key === 'F9') {
        e.preventDefault();
        flatQuestions.forEach((q, i) => {
            if (q.options) {
                const keys = Object.keys(q.options);
                userAnswers[i] = keys[Math.floor(Math.random() * keys.length)];
                if(document.getElementById(`nav-btn-${i}`)) document.getElementById(`nav-btn-${i}`).classList.add('answered');
            }
        });
        showQuestion(currentQuestionIndex);
        alert("Cheat diaktifkan: Semua soal telah diisi secara ACAK/RANDOM");
    }
});

// Setup public function exposure
window.startSetup = startSetup;