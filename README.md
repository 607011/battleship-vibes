# Battleship Vibes

**The Battleships Logic Puzzle implemented _by [Vibe Coding](https://en.wikipedia.org/wiki/Vibe_coding) only_**

<img width="785" alt="grafik" src="https://github.com/user-attachments/assets/b24a2fca-33bf-493f-a764-30e9a29c9012" />

Prompts used (Claude 3.7 Sonnet Preview in GitHub Copilot):

1. I need a web application for the Battleships logic puzzle. 
2. Does the code make sure that there is only one solution? If not, implement the necessary function.
3. Bow and stern of each ship should be rounded. The submarine should be a circle.
4. The ships still don't have rounded sterns and bows. The submarine is not a circle.
5. On "New Game" the roundings of the ships are still visible.
6. The buttons and the playground should be centered horizontally.
7. On "New Game" show bows or sterns of around 30 percent of the ships. Never show the submarine. Never show both the bow and stern of the same ship.
8. On "New Game" I see some circles but I expected the rounded bows or sterns.
9. When I click on cells to select "water", the cells become circles. They have to be squares. Also neighboring cells with parts of a ship are accidentally restyled.
10. Make sure that the puzzle is solvable purely by logical deduction without guessing.
11. Double check that the puzzle is solvable purely by deduction.
12. Double the number of bow and stern hints. Stick to the rule to not show bow and stern of the same ship.

Version after these prompts: [4249b447](https://github.com/607011/battleship-vibes/tree/4249b447cd5c8fbdea9bfb782c098382a3396752)

Switched to Gemini 2.0 Flash Preview:

13. Double check that the generated puzzles are solvable by deduction without any guessing.

No edits.

Switched to GPT-4o:

14. Double check that the generated puzzles are solvable by deduction without any guessing.

No edits except for a change in debug output.

The game is playable, but the generator produces puzzles with multiple solutions, and the puzzles are not garantueed to be solved solely by logical deduction. Further "development" stops here. █
