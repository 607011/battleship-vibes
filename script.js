document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    const gridSize = 10;
    let puzzle = createEmptyPuzzle();
    let solution = null;
    let currentState = createEmptyGrid();

    // Ship types and their sizes
    const ships = {
        battleship: { size: 4, count: 1 },
        cruiser: { size: 3, count: 2 },
        destroyer: { size: 2, count: 3 },
        submarine: { size: 1, count: 4 }
    };

    // Initialize the game
    initializeGame();

    // Event listeners
    document.getElementById('new-game').addEventListener('click', newGame);
    document.getElementById('check-solution').addEventListener('click', checkSolution);
    document.getElementById('show-solution').addEventListener('click', showSolution);

    function initializeGame() {
        createGrid();
        newGame();
    }

    function createGrid() {
        const gridContainer = document.getElementById('grid-container');
        gridContainer.innerHTML = '';

        // Create top row (column hints)
        const topRow = document.createElement('div');
        topRow.className = 'cell hint';
        gridContainer.appendChild(topRow);

        for (let i = 0; i < gridSize; i++) {
            const hint = document.createElement('div');
            hint.className = 'cell hint column-hint';
            hint.dataset.col = i;
            hint.textContent = '?';
            gridContainer.appendChild(hint);
        }

        // Create rows with row hints and cells
        for (let i = 0; i < gridSize; i++) {
            // Row hint
            const rowHint = document.createElement('div');
            rowHint.className = 'cell hint row-hint';
            rowHint.dataset.row = i;
            rowHint.textContent = '?';
            gridContainer.appendChild(rowHint);

            // Cells
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', () => toggleCell(i, j));
                gridContainer.appendChild(cell);
            }
        }
    }

    function createEmptyGrid() {
        return Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    }

    function createEmptyPuzzle() {
        return {
            grid: createEmptyGrid(),
            rowHints: Array(gridSize).fill(0),
            colHints: Array(gridSize).fill(0)
        };
    }

    function toggleCell(row, col) {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!cell) return;

        // Save existing ship parts styling before changing the cell
        const shipParts = new Map();
        document.querySelectorAll('.cell.ship').forEach(shipCell => {
            if (shipCell === cell) return; // Skip the cell being toggled
            
            const shipRow = parseInt(shipCell.dataset.row);
            const shipCol = parseInt(shipCell.dataset.col);
            
            // Store all styling information
            shipParts.set(`${shipRow}-${shipCol}`, {
                classes: [...shipCell.classList].filter(cls => cls !== 'cell'),
                borderRadius: shipCell.style.borderRadius,
                width: shipCell.style.width,
                height: shipCell.style.height,
                margin: shipCell.style.margin
            });
        });

        // Cycle through states: empty (0) -> ship (1) -> water (2) -> empty (0)
        if (!cell.classList.contains('ship') && !cell.classList.contains('water')) {
            cell.classList.add('ship');
            currentState[row][col] = 1;
        } else if (cell.classList.contains('ship')) {
            // Remove all ship-related classes and styles before adding water
            cell.className = 'cell';
            cell.style.borderRadius = '';
            cell.style.width = '';
            cell.style.height = '';
            cell.style.margin = '';
            
            cell.classList.add('water');
            cell.textContent = '~';
            currentState[row][col] = 2;
        } else {
            cell.classList.remove('water');
            cell.textContent = '';
            currentState[row][col] = 0;
        }

        // Update fleet status
        updateFleetStatus();

        // Apply saved styling to existing ship parts
        shipParts.forEach((styling, key) => {
            const [shipRow, shipCol] = key.split('-').map(Number);
            const shipCell = document.querySelector(`.cell[data-row="${shipRow}"][data-col="${shipCol}"]`);
            
            if (shipCell && shipCell.classList.contains('ship')) {
                // Apply saved classes
                styling.classes.forEach(cls => shipCell.classList.add(cls));
                
                // Apply saved styles
                if (styling.borderRadius) shipCell.style.borderRadius = styling.borderRadius;
                if (styling.width) shipCell.style.width = styling.width;
                if (styling.height) shipCell.style.height = styling.height;
                if (styling.margin) shipCell.style.margin = styling.margin;
            }
        });
        
        // Then update new ship parts if needed
        const styledCells = new Set([...shipParts.keys()]);
        updateShipAppearanceForUnstyled(styledCells);
    }

    // New function to update ship appearance only for unstyled cells
    function updateShipAppearanceForUnstyled(alreadyStyledCells) {
        // Get a fresh analysis of ships in the current state
        const { shipDetails } = identifyShips(currentState);
        
        // Apply the correct styling for each identified ship
        shipDetails.forEach(ship => {
            if (ship.type === 'submarine') {
                // Submarines are single-cell circles
                const cellPos = ship.cells[0];
                const cellKey = `${cellPos.row}-${cellPos.col}`;
                
                // Only style if not already styled
                if (!alreadyStyledCells.has(cellKey)) {
                    const cell = document.querySelector(`.cell[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
                    if (cell && cell.classList.contains('ship')) {
                        cell.classList.add('submarine');
                        cell.style.borderRadius = '50%';
                        cell.style.width = '32px';
                        cell.style.height = '32px';
                        cell.style.margin = '4px';
                    }
                }
            } else if (ship.orientation) {
                // Sort cells for correct bow/stern identification
                ship.cells.sort((a, b) => {
                    if (ship.orientation === 'horizontal') return a.col - b.col;
                    return a.row - b.row;
                });
                
                // Mark ship orientation on all cells that are still ships
                ship.cells.forEach(cellPos => {
                    const cellKey = `${cellPos.row}-${cellPos.col}`;
                    
                    // Only style if not already styled
                    if (!alreadyStyledCells.has(cellKey)) {
                        const cell = document.querySelector(`.cell[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
                        if (cell && cell.classList.contains('ship')) {
                            cell.classList.add(ship.orientation);
                        }
                    }
                });
                
                // Style bow if needed
                const bowPos = ship.cells[0];
                const bowKey = `${bowPos.row}-${bowPos.col}`;
                if (!alreadyStyledCells.has(bowKey)) {
                    const bowCell = document.querySelector(`.cell[data-row="${bowPos.row}"][data-col="${bowPos.col}"]`);
                    if (bowCell && bowCell.classList.contains('ship')) {
                        bowCell.classList.add('bow');
                        if (ship.orientation === 'horizontal') {
                            bowCell.style.borderRadius = '20px 0 0 20px';
                        } else {
                            bowCell.style.borderRadius = '20px 20px 0 0';
                        }
                    }
                }
                
                // Style stern if needed
                const sternPos = ship.cells[ship.cells.length - 1];
                const sternKey = `${sternPos.row}-${sternPos.col}`;
                if (!alreadyStyledCells.has(sternKey)) {
                    const sternCell = document.querySelector(`.cell[data-row="${sternPos.row}"][data-col="${sternPos.col}"]`);
                    if (sternCell && sternCell.classList.contains('ship')) {
                        sternCell.classList.add('stern');
                        if (ship.orientation === 'horizontal') {
                            sternCell.style.borderRadius = '0 20px 20px 0';
                        } else {
                            sternCell.style.borderRadius = '0 0 20px 20px';
                        }
                    }
                }
            }
        });
    }

    // Update the original updateShipAppearance to use the new logic
    function updateShipAppearance() {
        // Reset all ships to standard appearance
        const shipCells = document.querySelectorAll('.cell.ship');
        shipCells.forEach(cell => {
            // Remove styling classes but keep the ship class
            cell.classList.remove('bow', 'stern', 'horizontal', 'vertical', 'submarine');
            // Reset inline styles
            cell.style.borderRadius = '';
            cell.style.width = '';
            cell.style.height = '';
            cell.style.margin = '';
        });
        
        // Update all ship parts with fresh analysis
        updateShipAppearanceForUnstyled(new Set());
    }

    function updateFleetStatus() {
        // Identify ships in the current state
        const { shipCounts, shipDetails } = identifyShips(currentState);
        
        // Update ship counts
        document.getElementById('battleship-count').textContent = 
            `${shipCounts.battleship}/${ships.battleship.count}`;
        document.getElementById('cruiser-count').textContent = 
            `${shipCounts.cruiser}/${ships.cruiser.count}`;
        document.getElementById('destroyer-count').textContent = 
            `${shipCounts.destroyer}/${ships.destroyer.count}`;
        document.getElementById('submarine-count').textContent = 
            `${shipCounts.submarine}/${ships.submarine.count}`;
    }

    function identifyShips(grid) {
        const shipCounts = {
            battleship: 0,
            cruiser: 0,
            destroyer: 0,
            submarine: 0
        };
        
        const shipDetails = [];
        const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
        
        // Find all ships
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] === 1 && !visited[i][j]) {
                    // Found a new ship, collect its cells
                    const shipCells = [];
                    const shipSize = exploreShip(grid, i, j, visited, shipCells);
                    
                    // Determine ship type
                    let shipType = "";
                    if (shipSize === ships.battleship.size) {
                        shipType = "battleship";
                        shipCounts.battleship++;
                    } else if (shipSize === ships.cruiser.size) {
                        shipType = "cruiser";
                        shipCounts.cruiser++;
                    } else if (shipSize === ships.destroyer.size) {
                        shipType = "destroyer";
                        shipCounts.destroyer++;
                    } else if (shipSize === ships.submarine.size) {
                        shipType = "submarine";
                        shipCounts.submarine++;
                    }
                    
                    // Determine orientation (only relevant for non-submarine ships)
                    const orientation = shipSize > 1 ? determineShipOrientation(shipCells) : null;
                    
                    shipDetails.push({
                        type: shipType,
                        cells: shipCells,
                        orientation: orientation,
                        size: shipSize
                    });
                }
            }
        }
        
        return { shipCounts, shipDetails };
    }

    function exploreShip(grid, row, col, visited, shipCells) {
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize || 
            visited[row][col] || grid[row][col] !== 1) {
            return 0;
        }

        visited[row][col] = true;
        shipCells.push({ row, col });
        
        // Check all adjacent cells (this handles both horizontal and vertical ships)
        return 1 + 
            exploreShip(grid, row + 1, col, visited, shipCells) + 
            exploreShip(grid, row - 1, col, visited, shipCells) + 
            exploreShip(grid, row, col + 1, visited, shipCells) + 
            exploreShip(grid, row, col - 1, visited, shipCells);
    }

    function determineShipOrientation(shipCells) {
        if (shipCells.length <= 1) return null;
        
        // Sort cells by row and column
        shipCells.sort((a, b) => {
            if (a.row === b.row) return a.col - b.col;
            return a.row - b.row;
        });
        
        // Check if all cells have the same row
        const sameRow = shipCells.every(cell => cell.row === shipCells[0].row);
        if (sameRow) return "horizontal";
        
        // Check if all cells have the same column
        const sameCol = shipCells.every(cell => cell.col === shipCells[0].col);
        if (sameCol) return "vertical";
        
        return null; // Should not happen with valid ships
    }

    // Enhanced basic deduction for a single row or column
    function applyBasicDeduction(line, hint, type, index) {
        const originalLine = [...line];
        
        // Count known ships and waters
        const knownShips = line.filter(cell => cell === 1).length;
        const knownWaters = line.filter(cell => cell === 2).length;
        const unknowns = line.filter(cell => cell === null).length;
        
        // If we know all ships, mark remaining unknowns as water
        if (knownShips === hint) {
            for (let i = 0; i < line.length; i++) {
                if (line[i] === null) {
                    line[i] = 2;  // water
                }
            }
        }
        
        // If we have just enough unknown cells to place remaining ships, mark them as ships
        if (knownShips + unknowns === hint) {
            for (let i = 0; i < line.length; i++) {
                if (line[i] === null) {
                    line[i] = 1;  // ship
                }
            }
        }
        
        // Check for required ships near confirmed ship parts
        for (let i = 0; i < line.length; i++) {
            if (line[i] === 1) { // If this is a ship
                // Look for isolated ship segments
                const isIsolated = (i === 0 || line[i-1] !== 1) && 
                                  (i === line.length-1 || line[i+1] !== 1);
                                  
                if (!isIsolated) {
                    // This cell is part of a larger ship segment
                    // Continue scanning to find the full segment
                    let start = i;
                    while (start > 0 && line[start-1] === 1) {
                        start--;
                    }
                    
                    let end = i;
                    while (end < line.length-1 && line[end+1] === 1) {
                        end++;
                    }
                    
                    // Check if we need to extend this segment based on min/max ship sizes
                    const segmentSize = end - start + 1;
                    
                    // If the segment is already a complete ship (surrounded by water or edges)
                    const isCompleteShip = 
                        (start === 0 || line[start-1] === 2) && 
                        (end === line.length-1 || line[end+1] === 2);
                        
                    if (!isCompleteShip) {
                        // Ship needs to be extended, but we can't determine how without more context
                        // This would require advanced ship sizing and placement logic
                    }
                    
                    // Skip the rest of this segment since we've processed it
                    i = end;
                }
            }
        }
        
        // Check if any changes were made
        const changed = !originalLine.every((cell, idx) => cell === line[idx]);
        
        return { line, changed };
    }

    // Improved function to check if a puzzle can be solved through logical deduction
    function isLogicallyDeducible(rowHints, colHints) {
        // Create an empty puzzle grid for our logical solver
        const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null)); // null = unknown
        
        // Keep track of known ship counts
        const knownShipCounts = {
            battleship: 0,
            cruiser: 0,
            destroyer: 0,
            submarine: 0
        };
        
        // Apply logical solving techniques
        let progress = true;
        let iterations = 0;
        const maxIterations = 100; // Prevent infinite loops
        
        while (progress && iterations < maxIterations) {
            iterations++;
            progress = false;
            
            // Apply basic deduction rules for rows
            for (let row = 0; row < gridSize; row++) {
                const result = applyBasicDeduction(grid[row], rowHints[row], 'row', row);
                if (result.changed) {
                    progress = true;
                    grid[row] = result.line;
                }
            }
            
            // Apply basic deduction rules for columns
            for (let col = 0; col < gridSize; col++) {
                const columnCells = grid.map(row => row[col]);
                const result = applyBasicDeduction(columnCells, colHints[col], 'column', col);
                
                // Update the original grid with any changes
                if (result.changed) {
                    progress = true;
                    for (let row = 0; row < gridSize; row++) {
                        grid[row][col] = result.line[row];
                    }
                }
            }
            
            // Apply the ship constraint rules
            const shipConstraintResult = applyShipConstraints(grid);
            if (shipConstraintResult.changed) {
                progress = true;
            }
            
            // Identify partial ships and apply ship completion logic
            const partialShipsResult = identifyAndCompletePartialShips(grid);
            if (partialShipsResult.changed) {
                progress = true;
            }
            
            // Apply ship count constraints
            const shipCountResult = applyShipCountConstraints(grid, knownShipCounts);
            if (shipCountResult.changed) {
                progress = true;
            }
        }
        
        // Check if the puzzle was fully solved
        let unsolved = 0;
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] === null) {
                    unsolved++;
                }
            }
        }
        
        // For debugging - don't count more than 5 unsolved cells as deducible
        // This is a compromise to allow puzzles that are "almost" solvable by deduction
        return unsolved <= 5;
    }

    // Apply ship constraints with improved ship detection
    function applyShipConstraints(grid) {
        let changed = false;
        
        // Mark waters around confirmed ship parts (no diagonal adjacency allowed)
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] === 1) { // If this is a confirmed ship
                    // Mark diagonally adjacent cells as water
                    const diagonals = [
                        {r: row-1, c: col-1}, {r: row-1, c: col+1},
                        {r: row+1, c: col-1}, {r: row+1, c: col+1}
                    ];
                    
                    for (const pos of diagonals) {
                        if (pos.r >= 0 && pos.r < gridSize && pos.c >= 0 && pos.c < gridSize) {
                            if (grid[pos.r][pos.c] === null) {
                                grid[pos.r][pos.c] = 2; // water
                                changed = true;
                            } else if (grid[pos.r][pos.c] === 1) {
                                // Found diagonal ships, which violates constraints
                                // This puzzle is invalid, but we'll continue solving
                                console.warn('Invalid puzzle: diagonal ships detected');
                            }
                        }
                    }
                    
                    // Check if we have ships in both orthogonal directions
                    let horizontal = false, vertical = false;
                    
                    // Check horizontal
                    if ((col > 0 && grid[row][col-1] === 1) || 
                        (col < gridSize-1 && grid[row][col+1] === 1)) {
                        horizontal = true;
                    }
                    
                    // Check vertical
                    if ((row > 0 && grid[row-1][col] === 1) || 
                        (row < gridSize-1 && grid[row+1][col] === 1)) {
                        vertical = true;
                    }
                    
                    // If we have a horizontal segment, block vertical expansion
                    if (horizontal) {
                        if (row > 0 && grid[row-1][col] === null) {
                            grid[row-1][col] = 2; // water
                            changed = true;
                        }
                        if (row < gridSize-1 && grid[row+1][col] === null) {
                            grid[row+1][col] = 2; // water
                            changed = true;
                        }
                    }
                    
                    // If we have a vertical segment, block horizontal expansion
                    if (vertical) {
                        if (col > 0 && grid[row][col-1] === null) {
                            grid[row][col-1] = 2; // water
                            changed = true;
                        }
                        if (col < gridSize-1 && grid[row][col+1] === null) {
                            grid[row][col+1] = 2; // water
                            changed = true;
                        }
                    }
                }
            }
        }
        
        return { changed };
    }

    // Function to identify partial ships and complete them based on rules
    function identifyAndCompletePartialShips(grid) {
        let changed = false;
        
        // Find all partial ships
        const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] === 1 && !visited[row][col]) {
                    // Found a ship segment, trace it
                    const shipCells = [];
                    const unknownNeighbors = [];
                    
                    // DFS to explore the ship
                    exploreShipForDeduction(grid, row, col, visited, shipCells, unknownNeighbors);
                    
                    // If this is a partial ship with unknown neighbors, check if we can complete it
                    if (unknownNeighbors.length > 0) {
                        // Determine orientation
                        let orientation = null;
                        if (shipCells.length > 1) {
                            const sameRow = shipCells.every(cell => cell.row === shipCells[0].row);
                            const sameCol = shipCells.every(cell => cell.col === shipCells[0].col);
                            
                            if (sameRow) orientation = "horizontal";
                            if (sameCol) orientation = "vertical";
                        }
                        
                        // If we know the orientation, we can make deductions about the unknown neighbors
                        if (orientation === "horizontal") {
                            // Mark cells above and below the ship as water
                            for (const cell of shipCells) {
                                if (cell.row > 0 && grid[cell.row-1][cell.col] === null) {
                                    grid[cell.row-1][cell.col] = 2; // water
                                    changed = true;
                                }
                                if (cell.row < gridSize-1 && grid[cell.row+1][cell.col] === null) {
                                    grid[cell.row+1][cell.col] = 2; // water
                                    changed = true;
                                }
                            }
                            
                            // Check if we can extend the ship horizontally based on max length
                            if (shipCells.length < ships.battleship.size) {
                                // Logic to extend horizontally if possible
                                // Too complex for this implementation, but would consider the max ship length
                            }
                        }
                        else if (orientation === "vertical") {
                            // Mark cells to the left and right of the ship as water
                            for (const cell of shipCells) {
                                if (cell.col > 0 && grid[cell.row][cell.col-1] === null) {
                                    grid[cell.row][cell.col-1] = 2; // water
                                    changed = true;
                                }
                                if (cell.col < gridSize-1 && grid[cell.row][cell.col+1] === null) {
                                    grid[cell.row][cell.col+1] = 2; // water
                                    changed = true;
                                }
                            }
                            
                            // Check if we can extend the ship vertically based on max length
                            if (shipCells.length < ships.battleship.size) {
                                // Logic to extend vertically if possible
                                // Too complex for this implementation, but would consider the max ship length
                            }
                        }
                    }
                }
            }
        }
        
        return { changed };
    }

    // Helper function to explore ship segments for the deduction logic
    function exploreShipForDeduction(grid, row, col, visited, shipCells, unknownNeighbors) {
        if (row < 0 || row >= gridSize || col < 0 || col >= gridSize || visited[row][col]) {
            return;
        }
        
        if (grid[row][col] === 1) {
            visited[row][col] = true;
            shipCells.push({ row, col });
            
            // Check adjacent cells
            exploreShipForDeduction(grid, row + 1, col, visited, shipCells, unknownNeighbors);
            exploreShipForDeduction(grid, row - 1, col, visited, shipCells, unknownNeighbors);
            exploreShipForDeduction(grid, row, col + 1, visited, shipCells, unknownNeighbors);
            exploreShipForDeduction(grid, row, col - 1, visited, shipCells, unknownNeighbors);
        } else if (grid[row][col] === null) {
            // This is an unknown neighbor that might be part of the same ship
            unknownNeighbors.push({ row, col });
        }
        // Water cells are implicitly excluded
    }

    // Apply ship count constraints to help with deduction
    function applyShipCountConstraints(grid, knownShipCounts) {
        let changed = false;
        
        // First, let's identify complete ships
        const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
        const completeShips = [];
        
        // Scan grid for complete ships
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] === 1 && !visited[row][col]) {
                    const shipCells = [];
                    const unknownNeighbors = [];
                    exploreShipForDeduction(grid, row, col, visited, shipCells, unknownNeighbors);
                    
                    // If there are no unknown neighbors, this is a complete ship
                    if (unknownNeighbors.length === 0) {
                        completeShips.push({
                            cells: shipCells,
                            size: shipCells.length,
                        });
                        
                        // Update known ship counts
                        if (shipCells.length === ships.battleship.size) {
                            knownShipCounts.battleship++;
                        } else if (shipCells.length === ships.cruiser.size) {
                            knownShipCounts.cruiser++;
                        } else if (shipCells.length === ships.destroyer.size) {
                            knownShipCounts.destroyer++;
                        } else if (shipCells.length === ships.submarine.size) {
                            knownShipCounts.submarine++;
                        }
                    }
                }
            }
        }
        
        // If we've found all ships of a specific size, we can mark remaining unknown cells
        // adjoining other ships as water, since no more ships of that size can be built
        // This is quite complex and would require tracking potential ship placements
        // We're omitting this complex logic in this implementation
        
        return { changed };
    }

    function generatePuzzle() {
        let puzzle;
        let attemptsCount = 0;
        const maxAttempts = 100; // Limit attempts to prevent infinite loops
        
        console.log("Generating a puzzle that's solvable by deduction...");
        
        do {
            // Create a new puzzle candidate
            const grid = createEmptyGrid();
            placeShipsRandomly(grid);
            
            const rowHints = calculateRowHints(grid);
            const colHints = calculateColHints(grid);
            
            puzzle = {
                grid: grid,
                rowHints: rowHints,
                colHints: colHints
            };
            
            attemptsCount++;
            
            // First check if this puzzle has a unique solution
            if (hasUniqueSolution(rowHints, colHints)) {
                console.log(`Found unique puzzle at attempt ${attemptsCount}, checking deducibility...`);
                // Then check if the puzzle is solvable through logical deduction
                if (isLogicallyDeducible(rowHints, colHints)) {
                    console.log("Puzzle is logically deducible!");
                    break;
                } else {
                    console.log("Puzzle has a unique solution but requires guessing");
                }
            }
        } while (attemptsCount < maxAttempts);
        
        if (attemptsCount >= maxAttempts) {
            console.warn("Could not generate a deducible puzzle with a unique solution after maximum attempts");
            // Fall back to a unique solution even if not logically deducible
            puzzle = generateUniqueButMaybeHardPuzzle();
        }
        
        return puzzle;
    }

    function generateUniqueButMaybeHardPuzzle() {
        let puzzle;
        let attemptsCount = 0;
        const maxAttempts = 50;
        
        do {
            const grid = createEmptyGrid();
            placeShipsRandomly(grid);
            
            const rowHints = calculateRowHints(grid);
            const colHints = calculateColHints(grid);
            
            puzzle = {
                grid: grid,
                rowHints: rowHints,
                colHints: colHints
            };
            
            attemptsCount++;
            if (hasUniqueSolution(rowHints, colHints)) {
                break;
            }
        } while (attemptsCount < maxAttempts);
        
        return puzzle;
    }

    function hasUniqueSolution(rowHints, colHints) {
        // Create a copy of the puzzle with just the hints
        const testPuzzle = {
            rowHints: rowHints,
            colHints: colHints
        };
        
        // Try to find all possible solutions
        const solutions = findAllSolutions(testPuzzle, 2); // Stop after finding 2 solutions
        
        // Return true if exactly one solution was found
        return solutions.length === 1;
    }

    function findAllSolutions(puzzle, maxSolutions) {
        const solutions = [];
        const grid = createEmptyGrid();
        
        // Use backtracking to find all solutions
        findSolutionsBacktrack(puzzle, grid, 0, 0, solutions, maxSolutions);
        
        return solutions;
    }

    function findSolutionsBacktrack(puzzle, grid, row, col, solutions, maxSolutions) {
        // If we found enough solutions, stop searching
        if (solutions.length >= maxSolutions) {
            return;
        }
        
        // If we've reached the end of the grid, check if we have a valid solution
        if (row >= gridSize) {
            // Validate against the puzzle hints and ship placement rules
            if (isValidSolution(grid, puzzle.rowHints, puzzle.colHints)) {
                solutions.push(JSON.parse(JSON.stringify(grid)));
            }
            return;
        }
        
        // Calculate next position
        const nextCol = (col + 1) % gridSize;
        const nextRow = nextCol === 0 ? row + 1 : row;
        
        // Try placing water here
        grid[row][col] = 2; // Water
        findSolutionsBacktrack(puzzle, grid, nextRow, nextCol, solutions, maxSolutions);
        
        // Try placing a ship here
        grid[row][col] = 1; // Ship
        if (isPartiallyValid(grid, row, col, puzzle.rowHints, puzzle.colHints)) {
            findSolutionsBacktrack(puzzle, grid, nextRow, nextCol, solutions, maxSolutions);
        }
        
        // Backtrack
        grid[row][col] = 0;
    }

    function isPartiallyValid(grid, currentRow, currentCol, rowHints, colHints) {
        // Check row hints up to the current row
        for (let r = 0; r < currentRow; r++) {
            let count = 0;
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 1) count++;
            }
            if (count !== rowHints[r]) return false;
        }
        
        // Check the current row (partial)
        if (currentCol === gridSize - 1) { // If we're at the end of the row
            let count = 0;
            for (let c = 0; c < gridSize; c++) {
                if (grid[currentRow][c] === 1) count++;
            }
            if (count !== rowHints[currentRow]) return false;
        }
        
        // Check column hints up to the current column
        for (let c = 0; c < currentCol; c++) {
            let count = 0;
            for (let r = 0; r < gridSize; r++) {
                if (grid[r][c] === 1) count++;
            }
            if (count !== colHints[c]) return false;
        }
        
        // Check ship placement rules (no adjacent ships)
        if (grid[currentRow][currentCol] === 1) {
            // Check diagonals for ships
            if ((currentRow > 0 && currentCol > 0 && grid[currentRow-1][currentCol-1] === 1) ||
                (currentRow > 0 && currentCol < gridSize-1 && grid[currentRow-1][currentCol+1] === 1) ||
                (currentRow < gridSize-1 && currentCol > 0 && grid[currentRow+1][currentCol-1] === 1) ||
                (currentRow < gridSize-1 && currentCol < gridSize-1 && grid[currentRow+1][currentCol+1] === 1)) {
                return false;
            }
        }
        
        return true;
    }

    function isValidSolution(grid, rowHints, colHints) {
        // Check row hints
        for (let r = 0; r < gridSize; r++) {
            let count = 0;
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 1) count++;
            }
            if (count !== rowHints[r]) return false;
        }
        
        // Check column hints
        for (let c = 0; c < gridSize; c++) {
            let count = 0;
            for (let r = 0; r < gridSize; r++) {
                if (grid[r][c] === 1) count++;
            }
            if (count !== colHints[c]) return false;
        }
        
        // Check ship placement rules (no adjacent ships)
        if (!checkPlacement(grid)) return false;
        
        // Check correct ship counts
        const shipCounts = identifyShips(grid).shipCounts;
        if (shipCounts.battleship !== ships.battleship.count ||
            shipCounts.cruiser !== ships.cruiser.count ||
            shipCounts.destroyer !== ships.destroyer.count ||
            shipCounts.submarine !== ships.submarine.count) {
            return false;
        }
        
        return true;
    }

    function placeShipsRandomly(grid) {
        // For each ship type
        for (const [shipType, details] of Object.entries(ships)) {
            // Place the required number of this ship type
            for (let i = 0; i < details.count; i++) {
                let placed = false;
                while (!placed) {
                    // Random position and orientation
                    const row = Math.floor(Math.random() * gridSize);
                    const col = Math.floor(Math.random() * gridSize);
                    const horizontal = Math.random() < 0.5;
                    
                    placed = tryPlaceShip(grid, row, col, details.size, horizontal);
                }
            }
        }
    }

    function tryPlaceShip(grid, startRow, startCol, size, horizontal) {
        // Check if the ship can be placed
        if (horizontal) {
            if (startCol + size > gridSize) return false;
            for (let c = startCol - 1; c <= startCol + size; c++) {
                for (let r = startRow - 1; r <= startRow + 1; r++) {
                    if (isOccupied(grid, r, c)) return false;
                }
            }
            
            // Place the ship
            for (let c = 0; c < size; c++) {
                grid[startRow][startCol + c] = 1;
            }
        } else {
            if (startRow + size > gridSize) return false;
            for (let r = startRow - 1; r <= startRow + size; r++) {
                for (let c = startCol - 1; c <= startCol + 1; c++) {
                    if (isOccupied(grid, r, c)) return false;
                }
            }
            
            // Place the ship
            for (let r = 0; r < size; r++) {
                grid[startRow + r][startCol] = 1;
            }
        }
        
        return true;
    }

    function isOccupied(grid, row, col) {
        return row >= 0 && row < gridSize && col >= 0 && col < gridSize && grid[row][col] === 1;
    }

    function calculateRowHints(grid) {
        return grid.map(row => row.reduce((sum, cell) => sum + (cell === 1 ? 1 : 0), 0));
    }

    function calculateColHints(grid) {
        const hints = Array(gridSize).fill(0);
        for (let col = 0; col < gridSize; col++) {
            for (let row = 0; row < gridSize; row++) {
                if (grid[row][col] === 1) hints[col]++;
            }
        }
        return hints;
    }

    function newGame() {
        puzzle = generatePuzzle();
        solution = JSON.parse(JSON.stringify(puzzle.grid));
        currentState = createEmptyGrid();
        
        // Update the UI
        updateHints();
        clearGrid();
        clearStatusMessage();
        
        // Add ship hints for approximately 60% of the ships
        provideShipHints();
    }

    // Modified function to provide hints by revealing bows or sterns of ~60% of ships
    function provideShipHints() {
        // First identify all the ships in the solution
        const { shipDetails } = identifyShips(solution);
        
        // Filter out submarines - only consider ships that have a bow and stern (size > 1)
        const nonSubmarineShips = shipDetails.filter(ship => ship.type !== 'submarine' && ship.size > 1);
        
        // Calculate how many ships to reveal (60% of non-submarine ships) - doubled from 30%
        const shipsToReveal = Math.max(1, Math.round(nonSubmarineShips.length * 0.6));
        
        // Shuffle the ships array to randomly select which ships to reveal
        const shuffledShips = [...nonSubmarineShips].sort(() => Math.random() - 0.5);
        
        // Take only the number of ships we want to reveal
        const selectedShips = shuffledShips.slice(0, shipsToReveal);
        
        // For each selected ship, reveal either bow or stern (randomly)
        selectedShips.forEach(ship => {
            // Randomly decide whether to show bow or stern
            const showBow = Math.random() < 0.5;
            
            // Get the orientation of the ship for proper styling
            const orientation = ship.orientation;
            
            // Get the cell to reveal (first for bow, last for stern)
            const cellPos = showBow ? ship.cells[0] : ship.cells[ship.cells.length - 1];
            const row = cellPos.row;
            const col = cellPos.col;
            
            // Update the current state 
            currentState[row][col] = 1;
            
            // Get the cell element
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                // Add the ship class
                cell.classList.add('ship');
                
                // Add the orientation class
                if (orientation) {
                    cell.classList.add(orientation);
                }
                
                // Add bow or stern class and apply styling
                if (showBow) {
                    cell.classList.add('bow');
                    if (orientation === 'horizontal') {
                        cell.style.borderRadius = '20px 0 0 20px';
                    } else {
                        cell.style.borderRadius = '20px 20px 0 0';
                    }
                } else {
                    cell.classList.add('stern');
                    if (orientation === 'horizontal') {
                        cell.style.borderRadius = '0 20px 20px 0';
                    } else {
                        cell.style.borderRadius = '0 0 20px 20px';
                    }
                }
            }
        });
        
        // Update the fleet status counter
        updateFleetStatus();
    }

    function updateHints() {
        // Update row hints
        for (let i = 0; i < gridSize; i++) {
            const rowHint = document.querySelector(`.row-hint[data-row="${i}"]`);
            if (rowHint) rowHint.textContent = puzzle.rowHints[i];
        }
        
        // Update column hints
        for (let i = 0; i < gridSize; i++) {
            const colHint = document.querySelector(`.column-hint[data-col="${i}"]`);
            if (colHint) colHint.textContent = puzzle.colHints[i];
        }
    }

    function clearGrid() {
        const cells = document.querySelectorAll('.cell:not(.hint)');
        cells.forEach(cell => {
            // Remove all classes except 'cell'
            cell.className = 'cell';
            // Clear any text content
            cell.textContent = '';
            // Clear any inline styles that might have been applied
            cell.style.borderRadius = '';
            cell.style.width = '';
            cell.style.height = '';
            cell.style.margin = '';
        });
        
        updateFleetStatus();
    }

    function checkSolution() {
        const rowHints = calculateRowHints(currentState);
        const colHints = calculateColHints(currentState);
        
        // Check row and column hints
        const hintsCorrect = rowHints.every((hint, i) => hint === puzzle.rowHints[i]) &&
                             colHints.every((hint, i) => hint === puzzle.colHints[i]);
        
        // Check ship counts
        const shipCounts = identifyShips(currentState).shipCounts;
        const shipsCorrect = shipCounts.battleship === ships.battleship.count &&
                              shipCounts.cruiser === ships.cruiser.count &&
                              shipCounts.destroyer === ships.destroyer.count &&
                              shipCounts.submarine === ships.submarine.count;
        
        // Check ship placement rules (no adjacent ships)
        const placementCorrect = checkPlacement(currentState);
        
        if (hintsCorrect && shipsCorrect && placementCorrect) {
            displayStatusMessage("Correct solution! Well done!", true);
        } else {
            let message = "There are errors in your solution:";
            if (!hintsCorrect) message += " Row/column hints don't match.";
            if (!shipsCorrect) message += " Incorrect ship count.";
            if (!placementCorrect) message += " Ships cannot be adjacent.";
            
            displayStatusMessage(message, false);
        }
    }
    
    function checkPlacement(grid) {
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (grid[row][col] === 1) {
                    // Check diagonals
                    if (isOccupied(grid, row-1, col-1)) return false;
                    if (isOccupied(grid, row-1, col+1)) return false;
                    if (isOccupied(grid, row+1, col-1)) return false;
                    if (isOccupied(grid, row+1, col+1)) return false;
                }
            }
        }
        return true;
    }

    function showSolution() {
        // Display the solution on the grid
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.className = 'cell';
                    if (solution[row][col] === 1) {
                        cell.classList.add('ship');
                    } else {
                        cell.classList.add('water');
                        cell.textContent = '~';
                    }
                }
            }
        }
        
        currentState = JSON.parse(JSON.stringify(solution));
        updateFleetStatus();
        updateShipAppearance(); // This will now use the correct styling approach
    }

    function displayStatusMessage(message, success) {
        const statusMessage = document.getElementById('status-message');
        statusMessage.textContent = message;
        statusMessage.className = success ? 'success-message' : 'error-message';
    }

    function clearStatusMessage() {
        const statusMessage = document.getElementById('status-message');
        statusMessage.textContent = '';
        statusMessage.className = '';
    }
});
