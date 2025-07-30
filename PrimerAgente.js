class Agent3 extends Agent {
  
  static pre    = 0;
  static fa = 1;
  static fb = 2;
  static ini = 0;

  constructor() {
    super();
    this.maxDepth   = 3;
    // Tabla de transposición: Map<hash, { depth, score, type, move }>
    this.transTable = new Map();
    // Variables para Zobrist hashing dinámico
    this.size       = 0;
    this.zobristKey = null;
  }

  

  // Asegura que la tabla Zobrist exista para el tamaño actual
  _ensureZobrist(N) {
    if (this.size === N && this.zobristKey) return;
    this.size = N;
    
    const slots = N * N * 2;
    this.zobristKey = new Array(slots);
    for (let i = 0; i < slots; i++) {
      
      this.zobristKey[i] = BigInt.asUintN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
    }
  }

  // generar un hash Zobrist del estado del tablero
  hashBoard(board) {
    const b = board.board;
    const N = b.length;
    // Aseguramos la tabla Zobrist
    this._ensureZobrist(N);

    let h = 0n;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const ficha = b[r][c];
        if (ficha !== ' ') {
          // Mapear 'W' a 0 y 'B' a 1
          const id = ficha === 'W' ? 0 : 1;
          const idx = (r * N + c) * 2 + id;
          h ^= this.zobristKey[idx];
        }
      }
    }
    return h;
  }

  compute(percept) {
    const color = percept.color;
    const board = percept.board;
    const moves = board.valid_moves(color);
    if (moves.length === 0) return { x: -1, y: -1 };       // Sin jugadas posibles
    if (moves.length === 1) return moves[0];

    // Buscar esquinas disponibles
    const N = board.board.length;
    const corners = [
      { x: 0, y: 0 },
      { x: 0, y: N - 1 },
      { x: N - 1, y: 0 },
      { x: N - 1, y: N - 1 }
    ];
    const cornerMoves = moves.filter(move =>
      corners.some(c => c.x === move.x && c.y === move.y)
    );
    if (cornerMoves.length > 0) return cornerMoves[0];
    
    const restrictiveMoves = this.getRestrictiveMoves(board, color, moves);
    if (restrictiveMoves.length < 3) return restrictiveMoves[0];

    
    console.log('hola');
    const { score, move } = this.minmax(board, color, 0, -Infinity, +Infinity, true);
    console.log(move);
    return move ? { x: move.x, y: move.y } : null;
  }

  getRestrictiveMoves(board, color, moves) {
  const opponent = this.opponentColor(color);
  let bestMoves = [];
  let minOpponentOptions = Infinity;

  for (const move of moves) {
    const simBoard = board.clone();
    simBoard.move(move.x, move.y, color);
    const oppMoves = simBoard.valid_moves(opponent).length;

    if (oppMoves < minOpponentOptions) {
      minOpponentOptions = oppMoves;
      bestMoves = [move];
    } else if (oppMoves === minOpponentOptions) {
      bestMoves.push(move);
    }
  }

  return bestMoves;
}


  minmax(board, maxColor, depth, alpha, beta, isMax) {
    const hash  = this.hashBoard(board);
    const entry = this.transTable.get(hash);

    if (entry && entry.depth >= depth) {
      const { type, score, move } = entry;
      if (type === Agent3.pre) return { score, move };
      if (type === Agent3.fa && score < beta) beta = score;
      if (type === Agent3.fb && score > alpha) alpha = score;
      if (alpha >= beta) return { score, move };
    }

    if (this.isGameOver(board) || depth === this.maxDepth) {
      return { score: this.evaluateBoard(board, maxColor), move: null };
    }

    const currentColor = isMax ? maxColor : this.opponentColor(maxColor);
    const moves        = board.valid_moves(currentColor);
    if (moves.length === 0) {
      return { score: this.evaluateBoard(board, maxColor), move: null };
    }

    let bestMove  = null;
    let bestScore = isMax ? -Infinity : +Infinity;
    let scoreType = Agent3.pre;

    for (const mv of moves) {
      const nextBoard = board.clone();
      nextBoard.move(mv.x, mv.y, currentColor);
      const { score } = this.minmax(nextBoard, maxColor, depth + 1, alpha, beta, !isMax);

      if (isMax) {
        if (score > bestScore) { bestScore = score; bestMove = mv; }
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) { scoreType = Agent3.fa; break; }
      } else {
        if (score < bestScore) { bestScore = score; bestMove = mv; }
        alpha = Math.max(alpha, bestScore);
        if (alpha >= beta) { scoreType = Agent3.fb; break; }
      }
    }

    this.transTable.set(hash, { depth, score: bestScore, type: scoreType, move: bestMove });
    return { score: bestScore, move: bestMove };
  }

  evaluateNumberPieces(board, maxColor) {
    const b = board.board;
    const n = b.length;
    let cntMax = 0, cntOpp = 0;
    const opp = this.opponentColor(maxColor);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (b[y][x] === maxColor) cntMax++;
        else if (b[y][x] === opp) cntOpp++;
      }
    return 10 * (cntMax - cntOpp);
  }

  evaluateCorner(board, maxColor) {
    const opp = this.opponentColor(maxColor);
    const b   = board.board;
    const n   = b.length;
    const last = n - 1;
    const corners = [b[0][0], b[0][last], b[last][0], b[last][last]];
    let maxCount = 0, oppCount = 0;
    for (const c of corners) {
      if      (c === maxColor) maxCount++;
      else if (c === opp)      oppCount++;
    }
    return 12 * (maxCount - oppCount);
  }

  evaluateAdjacencyCorner(board, maxColor) {
    const opp = this.opponentColor(maxColor);
    const b   = board.board;
    const n   = b.length;
    const last = n - 1;
    const cells = [
      b[0][1], b[1][0], b[1][1],
      b[0][last-1], b[1][last], b[1][last-1],
      b[last-1][0], b[last][1], b[last-1][1],
      b[last-1][last], b[last][last-1], b[last][last]
    ];
    let maxCount = 0, oppCnt = 0;
    for (const d of cells) {
      if      (d === maxColor) maxCount++;
      else if (d === opp)      oppCnt++;
    }
    return -8 * (maxCount - oppCnt);
  }

  evaluateMov(board, maxColor) {
    const opp     = this.opponentColor(maxColor);
    const movMax  = board.valid_moves(maxColor).length;
    const movOpp  = board.valid_moves(opp)     .length;
  
    return 8 * (movMax-movOpp)
    }




  evaluateBoard(board, maxColor) {
    const p  = this.evaluateNumberPieces(board, maxColor);
    const c  = this.evaluateCorner(board, maxColor);
    const aC = this.evaluateAdjacencyCorner(board, maxColor);
    const mov = this.evaluateMov(board,maxColor);
    
    console.log({ pieces: p });
    return p + c + aC + mov ;
  }

  isGameOver(board) {
    return !board.can_play('W') && !board.can_play('B');
  }

  opponentColor(color) {
    return color === 'W' ? 'B' : 'W';
  }
}