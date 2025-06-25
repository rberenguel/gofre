document.addEventListener("DOMContentLoaded", () => {
  const canvasEl = document.getElementById("stroopCanvas");
  const ctx = canvasEl.getContext("2d");

  const startScreen = document.getElementById("start-screen");
  const gameScreenWrapper = document.getElementById("game-screen-wrapper");
  const resultsScreen = document.getElementById("results-screen");
  const feedbackIconContainer = document.getElementById(
    "feedback-icon-container",
  );
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const roundCounterEl = document.getElementById("round-counter");
  const questionAreaEl = document.getElementById("question-area");
  const numberPadEl = document.getElementById("number-pad");
  const accuracyResultEl = document.getElementById("accuracy-result");
  const speedResultEl = document.getElementById("speed-result");

  const SHAPES = ["square", "circle", "triangle"];
  const SHAPE_ICONS = { square: "■", circle: "●", triangle: "▲" };
  const QUESTION_TYPES = ["count_total", "count_shape", "read_digit"];
  const COLORS = [
    "#b58900",
    "#cb4b16",
    "#dc322f",
    "#d33682",
    "#6c71c4",
    "#268bd2",
    "#2aa198",
    "#859900",
  ];
  const GAME_ROUNDS = 20;

  let state = {};

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  function drawSquare(x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size / 8;
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  }
  function drawCircle(x, y, radius, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = radius / 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  function drawTriangle(x, y, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size / 8;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y + size / 2);
    ctx.lineTo(x - size / 2, y + size / 2);
    ctx.closePath();
    ctx.stroke();
  }

  function generateNewTrial() {
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    state.currentRound++;
    roundCounterEl.textContent = `${state.currentRound} / ${GAME_ROUNDS}`;
    questionAreaEl.innerHTML = "";

    const shapeCounts = {};
    SHAPES.forEach((s) => (shapeCounts[s] = Math.floor(Math.random() * 4) + 1));
    const totalShapes = Object.values(shapeCounts).reduce((a, b) => a + b, 0);

    let displayedDigit = Math.floor(Math.random() * 9) + 1;

    state.animatedShapes = [];
    const usedColors = [];
    const shapeSize = canvasEl.clientWidth / 12;

    Object.entries(shapeCounts).forEach(([shape, count]) => {
      for (let i = 0; i < count; i++) {
        const color = COLORS[state.animatedShapes.length % COLORS.length];
        usedColors.push(color);
        state.animatedShapes.push({
          shape: shape,
          x: Math.random() * (canvasEl.clientWidth - shapeSize * 2) + shapeSize,
          y:
            Math.random() * (canvasEl.clientHeight - shapeSize * 2) + shapeSize,
          vx: (Math.random() - 0.5) * 0.5 * state.speedMultiplier,
          vy: (Math.random() - 0.5) * 0.5 * state.speedMultiplier,
          color: color,
          size: shapeSize,
        });
      }
    });

    const questionType =
      QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    let correctAnswer;
    let questionText;

    switch (questionType) {
      case "count_shape":
        const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        correctAnswer = shapeCounts[targetShape];
        questionText = `<span class="shape-icon" style="color:${COLORS[5]}">${SHAPE_ICONS[targetShape]}</span> ?`;
        break;
      case "read_digit":
        correctAnswer = displayedDigit;
        questionText = "number?";
        break;
      case "count_total":
      default:
        correctAnswer = totalShapes;
        questionText = "shapes?";
        break;
    }

    const digitColor =
      usedColors.length > 0
        ? usedColors[Math.floor(Math.random() * usedColors.length)]
        : COLORS[0];

    state.currentTrial = {
      shapeCounts,
      totalShapes,
      displayedDigit,
      digitColor,
      correctAnswer,
      questionText,
    };

    state.awaitingInput = false;
    state.animationFrameId = requestAnimationFrame(animate);
    setTimeout(presentQuestion, 3500);
  }

  function animate(timestamp) {
    if (state.awaitingInput) return;

    const canvasW = canvasEl.clientWidth;
    const canvasH = canvasEl.clientHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);

    state.animatedShapes.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x > canvasW + s.size / 2) s.x = -s.size / 2;
      if (s.x < -s.size / 2) s.x = canvasW + s.size / 2;
      if (s.y > canvasH + s.size / 2) s.y = -s.size / 2;
      if (s.y < -s.size / 2) s.y = canvasH + s.size / 2;

      const drawFunc = {
        square: drawSquare,
        circle: drawCircle,
        triangle: drawTriangle,
      }[s.shape];
      drawFunc(s.x, s.y, s.size, s.color);
    });

    const pulse = 1 + Math.sin(timestamp / 250) * 0.05;
    const fontSize = canvasW / 3.5;
    ctx.fillStyle = state.currentTrial.digitColor;
    ctx.font = `bold ${fontSize * pulse}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.currentTrial.displayedDigit, canvasW / 2, canvasH / 2);

    state.animationFrameId = requestAnimationFrame(animate);
  }

  function presentQuestion() {
    if (state.awaitingInput) return;
    cancelAnimationFrame(state.animationFrameId);
    ctx.clearRect(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);
    questionAreaEl.innerHTML = state.currentTrial.questionText;
    state.awaitingInput = true;
    state.roundStartTime = performance.now();
  }

  function handleUserInput(digit) {
    if (!state.awaitingInput) return;
    state.awaitingInput = false;

    const roundTime = performance.now() - state.roundStartTime;
    const isCorrect = digit === state.currentTrial.correctAnswer;

    flashFeedback(isCorrect);

    if (isCorrect) {
      state.correctCount++;
      state.totalCorrectTime += roundTime;
      state.speedMultiplier += 0.015;
    }

    if (state.currentRound >= GAME_ROUNDS) {
      setTimeout(endGame, 600);
    } else {
      setTimeout(generateNewTrial, 600);
    }
  }

  function flashFeedback(isCorrect) {
    const iconName = isCorrect ? "check" : "xmark";
    const color = isCorrect ? "var(--green)" : "var(--red)";

    feedbackIconContainer.innerHTML = `<span class="iconoir iconoir-${iconName}" style="color: ${color};"></span>`;
    feedbackIconContainer.classList.add("visible");

    setTimeout(() => {
      feedbackIconContainer.classList.remove("visible");
    }, 500);
  }

  function setupNumberPad() {
    numberPadEl.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
      const button = document.createElement("button");
      button.textContent = i;
      button.addEventListener("click", () => handleUserInput(i));
      numberPadEl.appendChild(button);
    }
  }

  function startGame() {
    state = {
      currentRound: 0,
      speedMultiplier: 1.0,
      correctCount: 0,
      totalCorrectTime: 0,
      awaitingInput: false,
      animationFrameId: null,
      currentTrial: {},
    };

    startScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    gameScreenWrapper.classList.remove("hidden");

    setupCanvas();
    setupNumberPad();
    generateNewTrial();
  }

  function endGame() {
    gameScreenWrapper.classList.add("hidden");
    resultsScreen.classList.remove("hidden");

    const accuracy = (state.correctCount / GAME_ROUNDS) * 100;
    const avgSpeed =
      state.correctCount > 0
        ? state.totalCorrectTime / state.correctCount / 1000
        : 0;

    accuracyResultEl.textContent = `Accuracy: ${accuracy.toFixed(1)}% (${state.correctCount}/${GAME_ROUNDS})`;
    speedResultEl.textContent = `Avg. Speed: ${avgSpeed.toFixed(2)}s / correct`;
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  window.addEventListener("resize", setupCanvas);
});
