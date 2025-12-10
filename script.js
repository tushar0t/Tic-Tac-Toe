(() => {
  const boardEl = document.getElementById("board");
  const cellEls = Array.from(document.querySelectorAll(".cell"));
  const statusText = document.getElementById("statusText");
  const statusDots = Array.from(document.querySelectorAll(".status-dots .dot"));
  const endBadge = document.getElementById("endBadge");
  const winLine = document.getElementById("winLine");
  const scoreXEl = document.getElementById("scoreX");
  const scoreOEl = document.getElementById("scoreO");
  const scoreDrawEl = document.getElementById("scoreDraw");
  const modeToggle = document.getElementById("modeToggle");
  const difficultyControl = document.getElementById("difficultyControl");
  const themeToggle = document.getElementById("themeToggle");
  const sideControl = document.getElementById("sideControl");
  const playerSideToggle = document.getElementById("playerSideToggle");
  const newRoundBtn = document.getElementById("newRound");
  const resetAllBtn = document.getElementById("resetAll");
  const labelX = document.getElementById("labelX");
  const labelO = document.getElementById("labelO");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlayText");
  const playAgainBtn = document.getElementById("playAgain");

  const state = {
    board: Array(9).fill(null),
    current: "X",
    mode: "pvp",
    difficulty: "normal",
    playerSide: "X",
    scores: { X: 0, O: 0, draw: 0 },
    busy: false,
  };

  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const computerSide = () => (state.playerSide === "X" ? "O" : "X");

  const isFinished = (board) => {
    const { winner } = evaluateBoard(board);
    return Boolean(winner) || board.every(Boolean);
  };

  const setStatus = (text) => {
    statusText.textContent = text;
    statusDots.forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.turn === state.current && !isFinished(state.board));
    });
    endBadge.classList.remove("active");
    endBadge.textContent = "";
  };

  const clearBoardUI = () => {
    cellEls.forEach((cell) => {
      cell.textContent = "";
      cell.classList.remove("win", "locked");
    });
    winLine.style.opacity = "0";
    winLine.style.width = "0";
    overlay.classList.remove("show");
  };

  const drawWinLine = (pattern) => {
    if (!pattern) return;
    const boardRect = boardEl.getBoundingClientRect();
    const cellRects = pattern.map((i) => cellEls[i].getBoundingClientRect());
    const center = (rect) => ({
      x: rect.left - boardRect.left + rect.width / 2,
      y: rect.top - boardRect.top + rect.height / 2,
    });
    const start = center(cellRects[0]);
    const end = center(cellRects[2]);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // reset before animate
    winLine.style.transition = "none";
    winLine.style.opacity = "0";
    winLine.style.width = "0";
    winLine.style.transform = `translate(${start.x}px, ${start.y}px) rotate(${angle}deg)`;
    requestAnimationFrame(() => {
      winLine.style.transition = "";
      winLine.style.opacity = "1";
      winLine.style.width = `${length}px`;
    });
  };

  const render = () => {
    const lockedForTurn = state.mode === "pvc" && state.current !== state.playerSide;
    state.board.forEach((mark, idx) => {
      cellEls[idx].textContent = mark || "";
      cellEls[idx].classList.toggle("locked", state.busy || Boolean(mark) || isFinished(state.board) || lockedForTurn);
    });
    scoreXEl.textContent = state.scores.X;
    scoreOEl.textContent = state.scores.O;
    scoreDrawEl.textContent = state.scores.draw;
    labelX.textContent = state.mode === "pvc" && state.playerSide === "O" ? "Computer (X)" : "Player X";
    labelO.textContent = state.mode === "pvc" && state.playerSide === "X" ? "Computer (O)" : "Player O";
    sideControl.style.display = state.mode === "pvc" ? "flex" : "none";
  };

  const evaluateBoard = (board) => {
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], pattern };
      }
    }
    return { winner: null, pattern: [] };
  };

  const finalizeGame = (winner, pattern) => {
    if (winner) {
      state.scores[winner] += 1;
      pattern.forEach((i) => cellEls[i].classList.add("win"));
      drawWinLine(pattern);
      const label =
        state.mode === "pvc"
          ? winner === state.playerSide
            ? "WIN"
            : winner === computerSide()
            ? "LOOSE"
            : `${winner} wins`
          : `${winner} wins`;
      statusText.textContent = label;
      endBadge.textContent = "↻ Restart";
      endBadge.classList.add("active");
      overlayText.textContent = label;
      overlay.classList.add("show");
    } else {
      state.scores.draw += 1;
      statusText.textContent = "TIE";
      endBadge.textContent = "↻ Restart";
      endBadge.classList.add("active");
      overlayText.textContent = "TIE";
      overlay.classList.add("show");
    }
    render();
  };

  const resetRound = () => {
    state.board = Array(9).fill(null);
    state.current = "X";
    state.busy = false;
    clearBoardUI();
    render();
    setStatus("X to move");
    if (state.mode === "pvc" && state.playerSide === "O") {
      maybeComputerMove();
    }
  };

  const fullReset = () => {
    state.scores = { X: 0, O: 0, draw: 0 };
    resetRound();
  };

  const switchMode = (mode) => {
    state.mode = mode;
    difficultyControl.style.display = mode === "pvc" ? "flex" : "none";
    sideControl.style.display = mode === "pvc" ? "flex" : "none";
    resetRound();
  };

  const switchDifficulty = (difficulty) => {
    state.difficulty = difficulty;
    resetRound();
  };

  const switchSide = (side) => {
    state.playerSide = side;
    resetRound();
  };

  const availableMoves = (board) => board.map((v, i) => (v ? null : i)).filter((v) => v !== null);

  const randomMove = (board) => {
    const moves = availableMoves(board);
    return moves[Math.floor(Math.random() * moves.length)];
  };

  const findCriticalMove = (board, player) => {
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      const line = [board[a], board[b], board[c]];
      if (line.filter((v) => v === player).length === 2 && line.includes(null)) {
        const emptyIndex = [a, b, c][line.indexOf(null)];
        return emptyIndex;
      }
    }
    return null;
  };

  const minimax = (board, depth, isMaximizing) => {
    const { winner } = evaluateBoard(board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (board.every(Boolean)) return 0;

    const moves = availableMoves(board);
    if (isMaximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const next = board.slice();
        next[move] = "O";
        best = Math.max(best, minimax(next, depth + 1, false));
      }
      return best;
    }
    let best = Infinity;
    for (const move of moves) {
      const next = board.slice();
      next[move] = "X";
      best = Math.min(best, minimax(next, depth + 1, true));
    }
    return best;
  };

  const chooseComputerMove = () => {
    if (state.difficulty === "easy") return randomMove(state.board);
    if (state.difficulty === "normal") {
      const win = findCriticalMove(state.board, computerSide());
      if (win !== null) return win;
      const block = findCriticalMove(state.board, state.playerSide);
      if (block !== null) return block;
      if (state.board[4] === null) return 4;
      const corners = [0, 2, 6, 8].filter((i) => state.board[i] === null);
      if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
      return randomMove(state.board);
    }
    let bestScore = -Infinity;
    let bestMove = null;
    for (const move of availableMoves(state.board)) {
      const next = state.board.slice();
      next[move] = computerSide();
      const score = minimax(next, 0, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  };

  const maybeComputerMove = () => {
    if (state.mode !== "pvc" || state.current !== computerSide() || isFinished(state.board)) return;
    state.busy = true;
    render();
    setStatus("Computer thinking…");
    setTimeout(() => {
      const move = chooseComputerMove();
      state.busy = false;
      placeMark(move, true);
    }, 380);
  };

  const placeMark = (index, isComputer = false) => {
    if (state.busy || isFinished(state.board) || state.board[index]) return;
    if (state.mode === "pvc" && !isComputer && state.current !== state.playerSide) return;
    state.board[index] = state.current;
    cellEls[index].classList.add("marked");
    setTimeout(() => cellEls[index].classList.remove("marked"), 220);
    const { winner, pattern } = evaluateBoard(state.board);
    if (winner || state.board.every(Boolean)) {
      finalizeGame(winner, pattern.length ? pattern : null);
      render();
      return;
    }
    state.current = state.current === "X" ? "O" : "X";
    render();
    setStatus(`${state.current} to move`);
    maybeComputerMove();
  };

  cellEls.forEach((cell) => {
    cell.addEventListener("click", () => placeMark(Number(cell.dataset.index)));
  });

  modeToggle.addEventListener("click", (e) => {
    if (e.target.matches("button[data-mode]")) {
      modeToggle.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      switchMode(e.target.dataset.mode);
    }
  });

  difficultyControl.addEventListener("click", (e) => {
    if (e.target.matches("button[data-difficulty]")) {
      difficultyControl.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      switchDifficulty(e.target.dataset.difficulty);
    }
  });

  playerSideToggle.addEventListener("click", (e) => {
    if (e.target.matches("button[data-side]")) {
      playerSideToggle.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      switchSide(e.target.dataset.side);
    }
  });

  themeToggle.addEventListener("click", (e) => {
    if (e.target.matches("button[data-theme]")) {
      themeToggle.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      document.body.setAttribute("data-theme", e.target.dataset.theme);
    }
  });

  newRoundBtn.addEventListener("click", resetRound);
  resetAllBtn.addEventListener("click", fullReset);
  playAgainBtn.addEventListener("click", resetRound);

  resetRound();
  switchMode("pvp");
})();

