(() => {
  const canvas = document.getElementById('gol-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CELL_SIZE = 12;
  const TICK_MS = 180;
  const ALIVE_COLOR = 'rgba(0, 0, 0, 0.06)';

  let cols, rows, grid;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = document.documentElement.scrollHeight;
    const newCols = Math.ceil(canvas.width / CELL_SIZE);
    const newRows = Math.ceil(canvas.height / CELL_SIZE);

    if (grid && cols && rows) {
      const old = grid;
      grid = new Uint8Array(newCols * newRows);
      for (let y = 0; y < Math.min(rows, newRows); y++) {
        for (let x = 0; x < Math.min(cols, newCols); x++) {
          grid[y * newCols + x] = old[y * cols + x];
        }
      }
      // fill new cells randomly
      for (let y = 0; y < newRows; y++) {
        for (let x = 0; x < newCols; x++) {
          if (y >= rows || x >= cols) {
            grid[y * newCols + x] = Math.random() < 0.15 ? 1 : 0;
          }
        }
      }
    } else {
      grid = new Uint8Array(newCols * newRows);
      seed(grid, newCols, newRows);
    }
    cols = newCols;
    rows = newRows;
  }

  function seed(g, c, r) {
    // Sparse random seeding — gives organic clusters
    for (let i = 0; i < g.length; i++) {
      g[i] = Math.random() < 0.15 ? 1 : 0;
    }
  }

  function step() {
    const next = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = (y + dy + rows) % rows;
            const nx = (x + dx + cols) % cols;
            neighbors += grid[ny * cols + nx];
          }
        }
        const idx = y * cols + x;
        const alive = grid[idx];
        if (alive && (neighbors === 2 || neighbors === 3)) {
          next[idx] = 1;
        } else if (!alive && neighbors === 3) {
          next[idx] = 1;
        }
      }
    }
    grid = next;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ALIVE_COLOR;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y * cols + x]) {
          ctx.fillRect(
            x * CELL_SIZE + 1,
            y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
          );
        }
      }
    }
  }

  // Inject some life periodically so the board never goes fully dead
  function injectLife() {
    const cx = Math.floor(Math.random() * (cols - 10)) + 5;
    const cy = Math.floor(Math.random() * (rows - 10)) + 5;
    // Glider
    const patterns = [
      [[0,1],[1,2],[2,0],[2,1],[2,2]],
      // R-pentomino
      [[0,1],[0,2],[1,0],[1,1],[2,1]],
      // Lightweight spaceship
      [[0,1],[0,4],[1,0],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3]],
    ];
    const pat = patterns[Math.floor(Math.random() * patterns.length)];
    for (const [dy, dx] of pat) {
      const ny = (cy + dy) % rows;
      const nx = (cx + dx) % cols;
      grid[ny * cols + nx] = 1;
    }
  }

  resize();
  draw();

  let lastTick = 0;
  let injectTimer = 0;

  function loop(ts) {
    if (ts - lastTick >= TICK_MS) {
      step();
      draw();
      lastTick = ts;
      injectTimer++;
      if (injectTimer > 40) {
        injectLife();
        injectTimer = 0;
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Debounced resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 200);
  });

  // Observe body height changes to resize canvas
  const ro = new ResizeObserver(() => {
    if (canvas.height !== document.documentElement.scrollHeight) {
      resize();
      draw();
    }
  });
  ro.observe(document.body);
})();
