class culiquitacati extends Agent {
  
  static pre    = 0;
  static fa = 1;
  static fb = 2;
  static ini = 0;

  constructor() {
    super();
    this.maxDepth   = 3;
    
    this.transTable = new Map();
    
    this.size       = 0;
    this.zobristKey = null;
    this.initialTime = null;
  }

  


  _ensureZobrist(N) {
    if (this.size === N && this.zobristKey) return;
    this.size = N;
    
    const slots = N * N * 2;
    this.zobristKey = new Array(slots);
    for (let i = 0; i < slots; i++) {
      
      this.zobristKey[i] = BigInt.asUintN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
    }
  }


  hashBoard(board) {
    const b = board.board;
    const N = b.length;
    
    this._ensureZobrist(N);

    let h = 0n;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const ficha = b[r][c];
        if (ficha !== ' ') {
          
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
    const myTime = percept[color];
    const oppTime = percept[color === 'W' ? 'B' : 'W'];
    const N = board.board.length;

    this.searchStart     = Date.now();
    this.searchTimeLimit = this.searchStart + 2000; 

    
    if (this.initialTime === null) {
        this.initialTime = Math.max(myTime, oppTime);
    }

    const moves = board.valid_moves(color);

    if (moves.length === 0) return { x: -1, y: -1 };       
    if (moves.length === 1) return moves[0];

    const corners = [[0,0],[0,N-1],[N-1,0],[N-1,N-1]];

  
    for (const c of corners) {
        const [y, x] = c;
        if (moves.some(m => m.x === x && m.y === y)) {
            return { x, y };
        }
    }

    
    for (const c of corners) {
        const [y, x] = c;
        if (board.board[y][x] === color) {
            const neighbors = [];
            
            if (y > 0)   neighbors.push({ x, y: y - 1 });
            if (y < N-1) neighbors.push({ x, y: y + 1 });
            
            if (x > 0)   neighbors.push({ x: x - 1, y });
            if (x < N-1) neighbors.push({ x: x + 1, y });
            for (const nb of neighbors) {
                if (moves.some(m => m.x === nb.x && m.y === nb.y)) {
                    return { x: nb.x, y: nb.y };
                }
            }
        }
    }

    const timeThreshold = this.initialTime * 0.2;
    const timeThresholdopp = this.initialTime * 0.3;
    const nuevo = this.initialTime * 0.2
    if (myTime < timeThreshold || (oppTime < timeThresholdopp && myTime < nuevo )) {
        
        const restrictive = this.getRestrictiveMoves(board, color, moves);
        const bestGreedy = this.findBestGreedyMove(board, color, restrictive);
        return { x: bestGreedy.x, y: bestGreedy.y };

    }
    
    
    const { score, move } = this.minmax(board, color, 0, -Infinity, +Infinity, true);
    console.log(move);
    return move ? { x: move.x, y: move.y } : null;
  }

  countFlippedPieces(board, move, color) {
        const newBoard = board.clone();
        if (!newBoard.move(move.x, move.y, color)) return 0;
        
        let flipped = 0;
        const size = board.board.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (board.board[i][j] !== newBoard.board[i][j]) {
                    flipped++;
                }
            }
        }
        return flipped - 1; 
    }

  findBestGreedyMove(board, color, moves) {
        let bestMove = moves[0];
        let maxFlipped = -1;
        
        for (const move of moves) {
            const flipped = this.countFlippedPieces(board, move, color);
            if (flipped > maxFlipped) {
                maxFlipped = flipped;
                bestMove = move;
            }
        }
        
        return bestMove;
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
      if (type === culiquitacati.pre) return { score, move };
      if (type === culiquitacati.fa && score < beta) beta = score;
      if (type === culiquitacati.fb && score > alpha) alpha = score;
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

    if (Date.now() > this.searchTimeLimit) {
    return { 
      score: this.evaluateBoard(board, maxColor),
      move:  null
    };
  }

    let bestMove  = null;
    let bestScore = isMax ? -Infinity : +Infinity;
    let scoreType = culiquitacati.pre;

    for (const mv of moves) {
      const nextBoard = board.clone();
      nextBoard.move(mv.x, mv.y, currentColor);
      const { score } = this.minmax(nextBoard, maxColor, depth + 1, alpha, beta, !isMax);

      if (isMax) {
        if (score > bestScore) { bestScore = score; bestMove = mv; }
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) { scoreType = culiquitacati.fa; break; }
      } else {
        if (score < bestScore) { bestScore = score; bestMove = mv; }
        alpha = Math.max(alpha, bestScore);
        if (alpha >= beta) { scoreType = culiquitacati.fb; break; }
      }
    }

    this.transTable.set(hash, { depth, score: bestScore, type: scoreType, move: bestMove });
    return { score: bestScore, move: bestMove };
  }





placementScore(board, color) {
  const opp     = this.opponentColor(color);
  const N       = board.board.length;
  const corners = [[0,0], [0,N-1], [N-1,0], [N-1,N-1]];
  const near    = [
    [0,1],[1,0],[1,1],
    [0,N-2],[1,N-2],[1,N-1],
    [N-2,0],[N-2,1],[N-1,1],
    [N-2,N-2],[N-2,N-1],[N-1,N-2]
  ];

  
  const wedgePatterns = [
    
    { seed: [2,1],   between: [1,1] },
    { seed: [1,2],   between: [1,1] },
    
    { seed: [1,N-3], between: [1,N-2] },
    { seed: [2,N-2], between: [1,N-2] },
    
    { seed: [N-3,1], between: [N-2,1] },
    { seed: [N-2,2], between: [N-2,1] },
    
    { seed: [N-2,N-3], between: [N-2,N-2] },
    { seed: [N-3,N-2], between: [N-2,N-2] }
  ];

  let score = 0;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const cell = board.board[y][x];
      if (cell === ' ') continue;

      
      let val = 1;
      if (corners.some(c => c[0] === y && c[1] === x)) val = 25;
      else if (near.some(c => c[0] === y && c[1] === x)) val = -50;

      
      score += (cell === color ?  val : -val);

      
      let wedgeCount = 0;
      if (cell === color) {
        for (const { seed, between } of wedgePatterns) {
          const [sy, sx] = seed;
          const [by, bx] = between;
          if (y === sy && x === sx && board.board[by][bx] === opp) {
            score += 8;       
            wedgeCount++;
          }
        }
      }

      
      if (wedgeCount >= 2) {
        score += 15;        
      }
    }
  }

  return score;
}


mobilityDifference(board, color) {
  const opp      = this.opponentColor(color);
  const myMoves  = board.valid_moves(color).length;
  const oppMoves = board.valid_moves(opp)  .length;
  return myMoves - oppMoves;
}


discDifference(board, color) {
  const opp = this.opponentColor(color);
  let myCount  = 0;
  let oppCount = 0;

  for (const row of board.board) {
    for (const cell of row) {
      if      (cell === color) myCount++;
      else if (cell === opp)   oppCount++;
    }
  }
  return myCount - oppCount;
}


frontierDiscs(board, color) {
  const opp = this.opponentColor(color);
  const dirs = [
    [ 1, 0], [-1, 0],
    [ 0, 1], [ 0,-1],
    [ 1, 1], [ 1,-1],
    [-1, 1], [-1,-1]
  ];
  let myF = 0, oppF = 0;
  const b = board.board;
  const N = b.length;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (b[y][x] === color || b[y][x] === opp) {
        
        const isFrontier = dirs.some(([dy,dx]) => {
          const yy = y + dy, xx = x + dx;
          return yy >= 0 && yy < N && xx >= 0 && xx < N && b[yy][xx] === ' ';
        });
        if (isFrontier) {
          if (b[y][x] === color) myF++;
          else                  oppF++;
        }
      }
    }
  }
  
  return oppF - myF;
}


stableDiscs(board, color) {
    const opp = this.opponentColor(color);
    const N   = board.board.length;
    let myStable = 0, oppStable = 0;
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];

    for (const [sy, sx] of [[0,0],[0,N-1],[N-1,0],[N-1,N-1]]) {
      const cornerColor = board.board[sy][sx];
      if (cornerColor === ' ') continue;
      for (const [dy, dx] of dirs) {
        let y = sy, x = sx;
        while (y>=0 && y<N && x>=0 && x<N && board.board[y][x] === cornerColor) {
          if (cornerColor === color) myStable++;
          else                        oppStable++;
          y += dy; x += dx;
        }
      }
    }
    return myStable - oppStable;
  }

  

phaseWeights(phase) {
  switch (phase) {
    case 'opening':
      return { wPlace: 5,  wMob: 10, wDisc: 2,  wFront: 3 };
    case 'mid':
      return { wPlace: 15, wMob: 5,  wDisc: 9,  wFront: 1 };
    case 'swap':  
      return { wPlace: 6, wMob: 9,  wDisc: 15,  wFront: 1 };
    case 'end':
      return { wPlace: 0,  wMob: 0,  wDisc: 15, wFront: 0 };
    default:
      return { wPlace: 1,  wMob: 1,  wDisc: 1,  wFront: 1 };
  }
}

evaluateBoard(board, maxColor) {
  const N      = board.board.length;
  const filled = board.board.flat().filter(c => c !== ' ').length;
  const total  = N * N;
  const ratio  = filled / total;

  const earlyThresh = 0.21;
  const midEndThresh = 0.75;
  const swapEndThresh = 0.87;

  let phase;
  if (ratio < earlyThresh) phase = 'opening';
  else if (ratio < midEndThresh) phase = 'mid';
  else if (ratio < swapEndThresh) phase = 'swap';
  else phase = 'end';

  return this.evaluate(board, maxColor, phase);
}

evaluate(board, color, phase) {
  const weights = this.phaseWeights(phase);
  switch (phase) {
    case 'opening': {
      const place = this.placementScore(board, color);
      const mob   = this.mobilityDifference(board, color);
      const disc  = this.discDifference(board, color);
      const front = this.frontierDiscs(board, color);
      return weights.wPlace * place
           + weights.wMob   * mob
           + weights.wDisc  * disc
           + weights.wFront * front;
    }
    case 'mid': {
      const place = this.placementScore(board, color);
      const mob   = this.mobilityDifference(board, color);
      const disc  = this.discDifference(board, color);
      //const front = this.frontierDiscs(board, color);
      return weights.wPlace * place
           + weights.wMob   * mob
           + weights.wDisc  * disc
           ;
    }
    case 'swap': {
      
      const place = this.placementScore(board, color);
      const disc  = this.discDifference(board, color);
      const mob   = this.mobilityDifference(board, color);
      const front = this.frontierDiscs(board, color);
      return weights.wPlace * place    
           + weights.wDisc  * disc     
           + weights.wMob   * mob
           + weights.wFront * front;
    }
    case 'end': {
      const disc = this.discDifference(board, color);
      return weights.wDisc * disc;
    }
    default: {
      
      const place = this.placementScore(board, color);
      const mob   = this.mobilityDifference(board, color);
      const disc  = this.discDifference(board, color);
      const front = this.frontierDiscs(board, color);
      return weights.wPlace * place
           + weights.wMob   * mob
           + weights.wDisc  * disc
           + weights.wFront * front;
    }
  }
}



  isGameOver(board) {
    return !board.can_play('W') && !board.can_play('B');
  }

  opponentColor(color) {
    return color === 'W' ? 'B' : 'W';
  }
}