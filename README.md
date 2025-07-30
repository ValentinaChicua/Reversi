# 🎮 Reversi Bot with Dynamic Board

This project implements an intelligent agent to play **Reversi (Othello)** on a board with **dynamic sizing**.  
The **game interface logic** and the **environment where agents interact** were provided by the course professor.

---

## 🧠 Project Description

The implementation focuses on the development of intelligent agents capable of making decisions based on **specific environmental perceptions**. These perceptions include:

- 🎨 The color of the pieces assigned to the agent (`'B'` for black or `'W'` for white).
- 🧩 The current state of the board represented as a matrix.
- ⏳ The remaining time for each player.

---

## 🤖 Developed Agents

Two agents were developed, both using the **Minimax algorithm with Alpha-Beta Pruning**.  
To improve performance, both incorporate techniques such as **Zobrist hashing** for efficient state evaluation.  

Additionally, through experimentation, we found that a **search depth of 3** is sufficient.  
In this type of game, considering many future moves does not significantly improve performance and only causes unnecessary delays in the agent’s decision-making process.


---

### 🔹 `PrimerAgente`

Designed for **medium-sized boards** (≈15×15 to 20×20), this agent applies a custom heuristic based on:

- ✔️ Number of discs controlled by the agent.
- 🎯 Control of corner positions.
- ⚠️ Penalty for adjacent-to-corner placements.
- ♟️ Number of legal moves available.

In specific cases, the agent uses a **greedy fallback strategy**:
- If only one or two **restrictive moves** are available (i.e., moves that limit the opponent), the agent prioritizes them.
- Otherwise, it continues using the **Minimax algorithm**.

---

### 🔹 `culiquitacati`

This agent is tailored for **large boards**, where **time management** becomes critical.  
It uses **Minimax with Alpha-Beta Pruning** only if certain **time thresholds** are met.

If the remaining time is low, it switches to a **greedy decision strategy** to prevent losing due to timeout:
- First, it finds **restrictive moves**.
- Then, it applies a secondary greedy function called `findBestGreedyMove`.

Its heuristic evaluation is composed of **four functions**, each weighted differently depending on the **stage of the game**.  
Dividing the game into **four phases** proved to be the most effective strategy.

---

#### 🧮 Heuristic Functions

1. **`placementScore(board, color)`**  
   Evaluates positional strength:
   - 🟩 Rewards controlling corners.
   - ❌ Penalizes cells adjacent to corners.
   - 🎭 Detects wedge patterns (traps) and scores them positively.
   - 🗺️ Promotes safe and strategic placement.

2. **`mobilityDifference(board, color)`**  
   Measures the difference in the number of valid moves:
   - 🔄 More mobility = more tactical options and control.

3. **`discDifference(board, color)`**  
   Counts and compares discs on the board:
   - 🧮 Useful especially in the endgame to maximize disc count.

4. **`frontierDiscs(board, color)`**  
   Assesses vulnerability by checking frontier pieces:
   - 🛡️ Lower frontier disc count = better positional stability.
   

## 🧪 Experimental Results and Future Work

During experimentation, we observed that **the outcome of the match often depends on the board size and configuration**, with each agent performing better under different conditions. This suggests that both agents are competitive but still have room for improvement.

### 🔧 Future improvements:

- 🟦 **PrimerAgente** could be enhanced by incorporating **time perception** — both its own and the opponent’s — to improve decision-making under pressure.

- 🟥 **culiquitacati** could benefit from reducing its dependence on **greedy strategies**, aiming to use the full AI algorithm more consistently, especially in situations where time allows for deeper evaluation.

These enhancements would help increase each agent's robustness and adaptability across various game scenarios.

