document.addEventListener("DOMContentLoaded", () => {
  const canvasEl = document.getElementById("stroopCanvas");
  const ctx = canvasEl.getContext("2d");
  const canvasSize = window.innerWidth * 0.85;
  canvasEl.style.width = `${canvasSize}px`;
  canvasEl.style.height = `${canvasSize}px`;
  const startScreen = document.getElementById("start-screen");
  const gameScreenWrapper = document.getElementById("game-screen-wrapper");
  const resultsScreen = document.getElementById("results-screen");
  const feedbackIconContainer = document.getElementById(
    "feedback-icon-container",
  );
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const copyBtn = document.getElementById("copy-btn");
  const roundCounterEl = document.getElementById("round-counter");
  const questionAreaEl = document.getElementById("question-area");
  const numberPadEl = document.getElementById("number-pad");
  const resultsTableContainer = document.getElementById(
    "results-table-container",
  );

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
  const GAME_ROUNDS = 2;
  const SHAPE_VIEW_DURATION = 3500;

  let state = {};
  let markdownStats = ""; // To hold the generated markdown table

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

    const allShapes = [];
    SHAPES.forEach((shape) => {
      for (let i = 0; i < 6; i++) allShapes.push(shape);
    });
    for (let i = allShapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allShapes[i], allShapes[j]] = [allShapes[j], allShapes[i]];
    }

    const selectedShapes = allShapes.slice(0, 9);
    const shapeCounts = { square: 0, circle: 0, triangle: 0 };
    selectedShapes.forEach((shape) => shapeCounts[shape]++);

    const totalShapes = 9;
    let displayedDigit = Math.floor(Math.random() * 9) + 1;

    state.animatedShapes = [];
    const usedColors = [];
    const shapeSize = canvasEl.clientWidth / 12;

    selectedShapes.forEach((shape) => {
      const color = COLORS[state.animatedShapes.length % COLORS.length];
      usedColors.push(color);
      state.animatedShapes.push({
        shape,
        x: Math.random() * (canvasEl.clientWidth - shapeSize * 2) + shapeSize,
        y: Math.random() * (canvasEl.clientHeight - shapeSize * 2) + shapeSize,
        vx: (Math.random() - 0.5) * 0.5 * state.speedMultiplier,
        vy: (Math.random() - 0.5) * 0.5 * state.speedMultiplier,
        color,
        size: shapeSize,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      });
    });

    const questionType =
      QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    let correctAnswer,
      questionText,
      questionSubType = null;

    switch (questionType) {
      case "count_shape":
        const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        correctAnswer = shapeCounts[targetShape];
        questionText = `<span class="shape-icon" style="color:${COLORS[5]}"># of ${SHAPE_ICONS[targetShape]}</span> ?`;
        questionSubType = targetShape;
        break;
      case "read_digit":
        correctAnswer = displayedDigit;
        questionText = "number?";
        break;
      default: // count_total
        correctAnswer = totalShapes;
        questionText = "# of objects?";
        break;
    }

    const digitColor =
      usedColors.length > 0
        ? usedColors[Math.floor(Math.random() * usedColors.length)]
        : COLORS[0];

    state.currentTrial = {
      correctAnswer,
      questionText,
      displayedDigit,
      digitColor,
      questionType,
      questionSubType,
    };
    state.awaitingInput = false;
    state.roundStartTime = performance.now();
    state.animationFrameId = requestAnimationFrame(animate);
    setTimeout(presentQuestion, SHAPE_VIEW_DURATION);
  }

  function drawTimer(progress) {
    const canvasW = canvasEl.clientWidth;
    const canvasH = canvasEl.clientHeight;
    const perimeter = 2 * (canvasW + canvasH);
    let lengthToDraw = perimeter * progress;

    ctx.beginPath();
    ctx.moveTo(0, 0);

    let segment = Math.min(lengthToDraw, canvasW);
    ctx.lineTo(segment, 0);
    lengthToDraw -= segment;

    if (lengthToDraw > 0) {
      segment = Math.min(lengthToDraw, canvasH);
      ctx.lineTo(canvasW, segment);
      lengthToDraw -= segment;
    }
    if (lengthToDraw > 0) {
      segment = Math.min(lengthToDraw, canvasW);
      ctx.lineTo(canvasW - segment, canvasH);
      lengthToDraw -= segment;
    }
    if (lengthToDraw > 0) {
      segment = Math.min(lengthToDraw, canvasH);
      ctx.lineTo(0, canvasH - segment);
    }

    ctx.strokeStyle = "#940";
    ctx.lineWidth = Math.max(2, canvasEl.clientWidth / 100);
    ctx.stroke();
  }

  function animate() {
    if (state.awaitingInput) return;
    const canvasW = canvasEl.clientWidth;
    const canvasH = canvasEl.clientHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const elapsedTime = performance.now() - state.roundStartTime;
    const timeRemaining = Math.max(0, SHAPE_VIEW_DURATION - elapsedTime);
    drawTimer(timeRemaining / SHAPE_VIEW_DURATION);

    state.animatedShapes.forEach((s) => {
      s.rotation += s.rotationSpeed;
      const halfSize = s.size / 2;
      s.x += s.vx;
      s.y += s.vy;

      if (s.x + halfSize > canvasW || s.x - halfSize < 0) s.vx *= -1;
      if (s.y + halfSize > canvasH || s.y - halfSize < 0) s.vy *= -1;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);

      const drawFunc = {
        square: drawSquare,
        circle: drawCircle,
        triangle: drawTriangle,
      }[s.shape];
      const drawSize = s.shape === "circle" ? s.size / 2 : s.size;
      drawFunc(0, 0, drawSize, s.color);

      ctx.restore();
    });

    const pulse = 1 + Math.sin(performance.now() / 250) * 0.05;
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
    state.answerStartTime = performance.now();
  }

  function handleUserInput(digit) {
    if (!state.awaitingInput) return;
    state.awaitingInput = false;

    const roundTime = performance.now() - state.answerStartTime;
    const isCorrect = digit === state.currentTrial.correctAnswer;

    // --- Statistics Update ---
    const { questionType, questionSubType } = state.currentTrial;
    let stat = state.stats[questionType];
    if (questionType === "count_shape") {
      // Update aggregate for count_shape
      state.stats.count_shape.aggregate.attempts++;
      if (isCorrect) {
        state.stats.count_shape.aggregate.correct++;
        state.stats.count_shape.aggregate.totalTime += roundTime;
      }
      // Update specific shape
      stat = stat[questionSubType];
    }
    stat.attempts++;
    if (isCorrect) {
      stat.correct++;
      stat.totalTime += roundTime;
    }
    // --- End Statistics Update ---

    flashFeedback(isCorrect);

    if (isCorrect) {
      state.speedMultiplier += 0.015;
    }

    if (state.currentRound >= GAME_ROUNDS) setTimeout(endGame, 600);
    else setTimeout(generateNewTrial, 600);
  }

  function flashFeedback(isCorrect) {
    const iconName = isCorrect ? "check" : "xmark";
    const color = isCorrect ? "var(--green)" : "var(--red)";
    feedbackIconContainer.innerHTML = `<span class="iconoir iconoir-${iconName}" style="color: ${color};"></span>`;
    feedbackIconContainer.classList.add("visible");
    setTimeout(() => feedbackIconContainer.classList.remove("visible"), 500);
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

  function initStats() {
    const statBoilerplate = () => ({ attempts: 0, correct: 0, totalTime: 0 });
    return {
      read_digit: statBoilerplate(),
      count_total: statBoilerplate(),
      count_shape: {
        aggregate: statBoilerplate(),
        square: statBoilerplate(),
        circle: statBoilerplate(),
        triangle: statBoilerplate(),
      },
    };
  }

  function startGame() {
    state = {
      currentRound: 0,
      speedMultiplier: 1.0,
      awaitingInput: false,
      animationFrameId: null,
      currentTrial: {},
      stats: initStats(),
    };
    startScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    gameScreenWrapper.classList.remove("hidden");
    setupCanvas();
    setupNumberPad();
    generateNewTrial();
  }

  function generateStatsReport() {
    let html = '<table class="results-table">';
    html +=
      "<thead><tr><th>Type</th><th>Atts</th><th>Fail%</th><th>AvgT(s)</th></tr></thead><tbody>";
    let markdown = `### Gofre Report\n\n`;
    markdown += "| Type | Atts | Fail% | AvgT(s) |\n";
    markdown += "|:-----|-----:|------:|--------:|\n";

    const calc = (stat) => {
      if (stat.attempts === 0) return { atts: 0, fail: "N/A", avgT: "N/A" };
      const failRate = (1 - stat.correct / stat.attempts) * 100;
      const avgTime =
        stat.correct > 0 ? stat.totalTime / stat.correct / 1000 : 0;
      return {
        atts: stat.attempts,
        fail: failRate.toFixed(1),
        avgT: avgTime.toFixed(2),
      };
    };

    const addRow = (label, stat, isSubRow = false) => {
      const { atts, fail, avgT } = calc(stat);
      const rowClass = isSubRow ? 'class="shape-row"' : "";
      const mdLabel = isSubRow ? `  ↳ ${label}` : `**${label}**`;

      html += `<tr ${rowClass}><td>${label}</td><td>${atts}</td><td>${fail}</td><td>${avgT}</td></tr>`;
      markdown += `| ${mdLabel} | ${atts} | ${fail} | ${avgT} |\n`;
    };

    addRow("Read Digit", state.stats.read_digit);
    addRow("Count Total", state.stats.count_total);
    addRow("Count Shape", state.stats.count_shape.aggregate);
    SHAPES.forEach((shape) => {
      addRow(shape, state.stats.count_shape[shape], true);
    });

    html += "</tbody></table>";
    return { html, markdown };
  }

  function endGame() {
    gameScreenWrapper.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
    const report = generateStatsReport();
    resultsTableContainer.innerHTML = report.html;
    markdownStats = report.markdown;
  }

  function copyToClipboard(text) {
    // Modern way:
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy as Markdown";
        }, 2000);
      });
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = 0;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy as Markdown";
        }, 2000);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
      }
      document.body.removeChild(textArea);
    }
  }

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);
  copyBtn.addEventListener("click", () => copyToClipboard(markdownStats));
});
