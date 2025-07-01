import { initHaptic, triggerHaptic, triggerHapticError } from "./haptic.js";

document.addEventListener("DOMContentLoaded", () => {
  initHaptic();
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
  const numberPadEl = document.getElementById("number-pad");
  const resultsTableContainer = document.getElementById(
    "results-table-container",
  );
  const helpBtn = document.getElementById("help-btn");
  const closeHelpBtn = document.getElementById("close-help-btn");
  const helpOverlay = document.getElementById("help-overlay");

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
  const SHAPE_VIEW_DURATION = 3500;

  let state = {
    allSessionsStats: [],
    currentGame: {},
  };
  let markdownStats = "";

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
    if (state.currentGame.animationFrameId)
      cancelAnimationFrame(state.currentGame.animationFrameId);
    state.currentGame.currentRound++;
    roundCounterEl.textContent = `${state.currentGame.currentRound} / ${GAME_ROUNDS}`;

    const allShapes = [];
    SHAPES.forEach((shape) => {
      for (let i = 0; i < 9; i++) allShapes.push(shape);
    });
    for (let i = allShapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allShapes[i], allShapes[j]] = [allShapes[j], allShapes[i]];
    }

    const selectedShapes = allShapes.slice(0, 2 + Math.random() * 8);
    const shapeCounts = { square: 0, circle: 0, triangle: 0 };
    selectedShapes.forEach((shape) => shapeCounts[shape]++);

    state.currentGame.animatedShapes = [];
    const usedColors = [];
    const shapeSize = canvasEl.clientWidth / 12;

    selectedShapes.forEach((shape) => {
      const color =
        COLORS[state.currentGame.animatedShapes.length % COLORS.length];
      usedColors.push(color);
      state.currentGame.animatedShapes.push({
        shape,
        x: Math.random() * (canvasEl.clientWidth - shapeSize * 2) + shapeSize,
        y: Math.random() * (canvasEl.clientHeight - shapeSize * 2) + shapeSize,
        vx: (Math.random() - 0.5) * 0.5 * state.currentGame.speedMultiplier,
        vy: (Math.random() - 0.5) * 0.5 * state.currentGame.speedMultiplier,
        color,
        size: shapeSize,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      });
    });

    const questionType =
      QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    let correctAnswer,
      questionObject,
      questionSubType = null;

    const number = Math.floor(Math.random() * 9) + 1;

    switch (questionType) {
      case "count_shape":
        const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        correctAnswer = shapeCounts[targetShape];
        questionObject = {
          type: "rich",
          parts: [
            { text: "# of ", color: "#93a1a1" },
            { text: `${SHAPE_ICONS[targetShape]}`, color: COLORS[5] },
            { text: " ?", color: "#93a1a1" },
          ],
        };
        questionSubType = targetShape;
        break;
      case "read_digit":
        correctAnswer = number;
        questionObject = { type: "simple", text: "Number?" };
        break;
      default: // count_total
        correctAnswer = selectedShapes.length;
        questionObject = { type: "simple", text: "# of objects?" };
        break;
    }

    const digitColor =
      usedColors.length > 0
        ? usedColors[Math.floor(Math.random() * usedColors.length)]
        : COLORS[0];

    state.currentGame.currentTrial = {
      correctAnswer,
      questionObject,
      displayedDigit: number,
      digitColor,
      questionType,
      questionSubType,
    };
    state.currentGame.awaitingInput = false;
    state.currentGame.roundStartTime = performance.now();
    state.currentGame.animationFrameId = requestAnimationFrame(animate);
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
    if (state.currentGame.awaitingInput) return;
    const canvasW = canvasEl.clientWidth;
    const canvasH = canvasEl.clientHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const elapsedTime = performance.now() - state.currentGame.roundStartTime;
    const timeRemaining = Math.max(0, SHAPE_VIEW_DURATION - elapsedTime);
    drawTimer(timeRemaining / SHAPE_VIEW_DURATION);

    // 1. Draw the number first, so it's in the background.
    const pulse = 1 + Math.sin(performance.now() / 250) * 0.05;
    const fontSize = canvasW / 3.5;
    ctx.fillStyle = state.currentGame.currentTrial.digitColor;
    ctx.font = `bold ${fontSize * pulse}px Inter`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      state.currentGame.currentTrial.displayedDigit,
      canvasW / 2,
      canvasH / 2,
    );

    // 2. Draw the shapes second, so they appear on top of the number.
    state.currentGame.animatedShapes.forEach((s) => {
      s.rotation += s.rotationSpeed;
      s.x += s.vx;
      s.y += s.vy;

      if (s.x + s.size / 2 > canvasW || s.x - s.size / 2 < 0) s.vx *= -1;
      if (s.y + s.size / 2 > canvasH || s.y - s.size / 2 < 0) s.vy *= -1;

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

    state.currentGame.animationFrameId = requestAnimationFrame(animate);
  }

  function presentQuestion() {
    if (state.currentGame.awaitingInput) return;
    cancelAnimationFrame(state.currentGame.animationFrameId);

    const canvasW = canvasEl.clientWidth;
    const canvasH = canvasEl.clientHeight;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const { questionObject } = state.currentGame.currentTrial;
    const fontSize = canvasW / 10;
    ctx.font = `${fontSize}px Inter`;
    ctx.textBaseline = "middle";

    if (questionObject.type === "simple") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#93a1a1"; // from --text-highlight
      ctx.fillText(questionObject.text, canvasW / 2, canvasH / 2);
    } else {
      // rich text
      let totalWidth = 0;
      const partMetrics = questionObject.parts.map((part) => {
        const metrics = ctx.measureText(part.text);
        totalWidth += metrics.width;
        return metrics;
      });

      let currentX = (canvasW - totalWidth) / 2;
      ctx.textAlign = "left";

      questionObject.parts.forEach((part, index) => {
        ctx.fillStyle = part.color;
        ctx.fillText(part.text, currentX, canvasH / 2);
        currentX += partMetrics[index].width;
      });
    }

    state.currentGame.awaitingInput = true;
    state.currentGame.answerStartTime = performance.now();
  }

  function handleUserInput(digit) {
    if (!state.currentGame.awaitingInput) return;
    state.currentGame.awaitingInput = false;

    const roundTime = performance.now() - state.currentGame.answerStartTime;
    let isCorrect = digit === state.currentGame.currentTrial.correctAnswer;
    if (state.currentGame.currentTrial.correctAnswer === 0) {
      isCorrect = true; // If we are asked for 0 and there is no zero, anything will be correct. I should fix this.
    }

    const { questionType, questionSubType } = state.currentGame.currentTrial;
    let stat = state.currentGame.stats[questionType];
    if (questionType === "count_shape") {
      state.currentGame.stats.count_shape.aggregate.attempts++;
      if (isCorrect) {
        state.currentGame.stats.count_shape.aggregate.correct++;
        state.currentGame.stats.count_shape.aggregate.totalTime += roundTime;
      }
      stat = stat[questionSubType];
    }
    stat.attempts++;
    if (isCorrect) {
      triggerHaptic();
      stat.correct++;
      stat.totalTime += roundTime;
      state.currentGame.speedMultiplier += 0.015;
    } else {
      triggerHapticError();
    }

    // Clear the canvas to remove the question text
    ctx.clearRect(0, 0, canvasEl.clientWidth, canvasEl.clientHeight);

    flashFeedback(isCorrect);

    if (state.currentGame.currentRound >= GAME_ROUNDS) setTimeout(endGame, 600);
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

  const initStatsBoilerplate = () => ({
    attempts: 0,
    correct: 0,
    totalTime: 0,
  });
  const initFullStats = () => ({
    read_digit: initStatsBoilerplate(),
    count_total: initStatsBoilerplate(),
    count_shape: {
      aggregate: initStatsBoilerplate(),
      square: initStatsBoilerplate(),
      circle: initStatsBoilerplate(),
      triangle: initStatsBoilerplate(),
    },
  });

  function startGame() {
    state.currentGame = {
      currentRound: 0,
      speedMultiplier: 1.0,
      awaitingInput: false,
      animationFrameId: null,
      currentTrial: {},
      stats: initFullStats(),
    };
    startScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    gameScreenWrapper.classList.remove("hidden");
    setupCanvas();
    setupNumberPad();
    generateNewTrial();
  }

  function generateStatsReport(allSessions) {
    let html = "";
    const today = new Date().toISOString().slice(0, 10);
    let markdown = `### Gofre Report ${today}\n\n`;

    const calc = (stat) => {
      if (stat.attempts === 0) return { atts: 0, succ: "N/A", avgT: "N/A" };
      const successRate = (stat.correct / stat.attempts) * 100;
      const avgTime =
        stat.correct > 0 ? stat.totalTime / stat.correct / 1000 : 0;
      return {
        atts: stat.attempts,
        succ: successRate.toFixed(1),
        avgT: avgTime.toFixed(2),
      };
    };

    const generateTable = (title, stats) => {
      const addRow = (label, stat, isSubRow = false) => {
        const { atts, succ, avgT } = calc(stat);
        const rowClass = isSubRow ? 'class="shape-row"' : "";
        const mdLabel = isSubRow ? `  ↳ ${label}` : `**${label}**`;
        tableHtml += `<tr ${rowClass}><td>${label}</td><td>${atts}</td><td>${succ}</td><td>${avgT}</td></tr>`;
        tableMarkdown += `| ${mdLabel} | ${atts} | ${succ} | ${avgT} |\n`;
      };

      let tableHtml = `<h4 class="table-title">${title}</h4><table class="results-table"><thead><tr><th>Type</th><th>Atts</th><th>%</th><th>AvgT(s)</th></tr></thead><tbody>`;
      let tableMarkdown = `#### ${title}\n| Type | Atts | Succ% | AvgT(s) |\n|:-----|-----:|------:|--------:|\n`;

      addRow("Read Digit", stats.read_digit);
      addRow("Count Total", stats.count_total);
      addRow("Count Shape", stats.count_shape.aggregate);
      SHAPES.forEach((shape) => addRow(shape, stats.count_shape[shape], true));

      tableHtml += "</tbody></table>";
      return { html: tableHtml, markdown: tableMarkdown };
    };

    allSessions.forEach((sessionStats, i) => {
      const report = generateTable(`Session ${i + 1}`, sessionStats);
      html += report.html;
      markdown += report.markdown + "\n";
    });

    if (allSessions.length > 1) {
      const overallStats = initFullStats();
      allSessions.forEach((sessionStats) => {
        Object.keys(sessionStats).forEach((key) => {
          if (key === "count_shape") {
            Object.keys(sessionStats.count_shape).forEach((subKey) => {
              overallStats.count_shape[subKey].attempts +=
                sessionStats.count_shape[subKey].attempts;
              overallStats.count_shape[subKey].correct +=
                sessionStats.count_shape[subKey].correct;
              overallStats.count_shape[subKey].totalTime +=
                sessionStats.count_shape[subKey].totalTime;
            });
          } else {
            overallStats[key].attempts += sessionStats[key].attempts;
            overallStats[key].correct += sessionStats[key].correct;
            overallStats[key].totalTime += sessionStats[key].totalTime;
          }
        });
      });
      const report = generateTable("Total (All Sessions)", overallStats);
      html += report.html;
      markdown += report.markdown;
    }

    return { html, markdown };
  }

  function endGame() {
    state.allSessionsStats.push(state.currentGame.stats);
    gameScreenWrapper.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
    const report = generateStatsReport(state.allSessionsStats);
    resultsTableContainer.innerHTML = report.html;
    markdownStats = report.markdown;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy for Obsidian";
        }, 2000);
      });
    } else {
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
          copyBtn.textContent = "Copy for Obsidian";
        }, 2000);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
      }
      document.body.removeChild(textArea);
    }
  }

  helpBtn.addEventListener("click", () => {
    triggerHaptic();
    helpOverlay.classList.remove("hidden");
  });

  closeHelpBtn.addEventListener("click", () => {
    triggerHaptic();
    helpOverlay.classList.add("hidden");
  });

  // Also hide the modal if the user clicks the background overlay
  helpOverlay.addEventListener("click", (event) => {
    if (event.target === helpOverlay) {
      triggerHaptic();
      helpOverlay.classList.add("hidden");
    }
  });

  startBtn.addEventListener("click", () => {
    triggerHaptic();
    startGame();
  });
  restartBtn.addEventListener("click", () => {
    triggerHaptic();
    startGame();
  });
  copyBtn.addEventListener("click", () => {
    triggerHaptic();
    copyToClipboard(markdownStats);
  });
});
