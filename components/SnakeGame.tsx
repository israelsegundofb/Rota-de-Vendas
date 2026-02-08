import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Trophy } from 'lucide-react';

// Constants
const CANVAS_SIZE = 400;
const SNAKE_START = [[8, 7], [8, 8]];
const APPLE_START = [8, 3];
const SCALE = 20;
const SPEED = 100;
const DIRECTIONS = {
    38: [0, -1], // up
    40: [0, 1], // down
    37: [-1, 0], // left
    39: [1, 0] // right
};

const SnakeGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [snake, setSnake] = useState(SNAKE_START);
    const [apple, setApple] = useState(APPLE_START);
    const [dir, setDir] = useState([0, -1]);
    const [speed, setSpeed] = useState(null);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => {
        return parseInt(localStorage.getItem('snakeHighScore') || '0');
    });

    const startGame = () => {
        setSnake(SNAKE_START);
        setApple(APPLE_START);
        setDir([0, -1]);
        setSpeed(SPEED);
        setGameOver(false);
        setScore(0);
    };

    const endGame = () => {
        setSpeed(null);
        setGameOver(true);
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snakeHighScore', score.toString());
        }
    };

    const moveSnake = useCallback(({ keyCode }: { keyCode: number }) => {
        // Prevent default scrolling for arrow keys
        if ([32, 37, 38, 39, 40].includes(keyCode)) {
            // Prevent default handled in event listener
        }

        if (keyCode >= 37 && keyCode <= 40) {
            const currentDir = dir;
            const nextDir = DIRECTIONS[keyCode as keyof typeof DIRECTIONS];

            // Prevent reversing directly
            if (currentDir[0] + nextDir[0] === 0 && currentDir[1] + nextDir[1] === 0) return;

            setDir(nextDir);
        }
    }, [dir]);

    const createApple = () => (
        [Math.floor(Math.random() * (CANVAS_SIZE / SCALE)), Math.floor(Math.random() * (CANVAS_SIZE / SCALE))]
    );

    const checkCollision = (piece: number[], snk: number[][] = snake) => {
        // Wall Collision
        if (
            piece[0] * SCALE >= CANVAS_SIZE ||
            piece[0] < 0 ||
            piece[1] * SCALE >= CANVAS_SIZE ||
            piece[1] < 0
        )
            return true;

        // Self Collision
        for (const segment of snk) {
            if (piece[0] === segment[0] && piece[1] === segment[1]) return true;
        }
        return false;
    };

    const checkAppleCollision = (newSnake: number[][]) => {
        if (newSnake[0][0] === apple[0] && newSnake[0][1] === apple[1]) {
            let newApple = createApple();
            while (checkCollision(newApple, newSnake)) {
                newApple = createApple();
            }
            setApple(newApple);
            setScore(s => s + 1);
            return true;
        }
        return false;
    };

    const gameLoop = () => {
        const snakeCopy = JSON.parse(JSON.stringify(snake));
        const newSnakeHead = [snakeCopy[0][0] + dir[0], snakeCopy[0][1] + dir[1]];

        if (checkCollision(newSnakeHead)) {
            endGame();
            return;
        }

        if (!checkAppleCollision(snakeCopy)) {
            snakeCopy.pop();
        }

        snakeCopy.unshift(newSnakeHead);
        setSnake(snakeCopy);
    };

    useEffect(() => {
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
            context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            // Draw Snake
            context.fillStyle = '#4ade80'; // snake green
            snake.forEach(([x, y]) => context.fillRect(x, y, 1, 1));

            // Draw Apple
            context.fillStyle = '#ef4444'; // apple red
            context.fillRect(apple[0], apple[1], 1, 1);
        }
    }, [snake, apple, gameOver]);

    useEffect(() => {
        if (speed !== null) {
            const interval = setInterval(gameLoop, speed);
            return () => clearInterval(interval);
        }
    }, [speed, snake]); // DEPENDENCY ON SNAKE IS KEY FOR REACT CLOSURES

    // Effect for Keyboard Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ([37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault();
                moveSnake(e);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveSnake]);


    return (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
            <div className="flex justify-between w-full max-w-[400px] mb-4 text-white">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold">Score: {score}</span>
                </div>
                <div className="text-gray-400 text-sm">High: {highScore}</div>
            </div>

            <div className="relative">
                <canvas
                    className="border-2 border-gray-800 bg-black"
                    ref={canvasRef}
                    width={`${CANVAS_SIZE}px`}
                    height={`${CANVAS_SIZE}px`}
                />

                {(gameOver || speed === null) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-white">
                        <h3 className="text-2xl font-bold mb-4">{gameOver ? 'Game Over!' : 'Snake Game'}</h3>
                        <button
                            onClick={startGame}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full font-bold transition-all transform hover:scale-105"
                        >
                            <RefreshCw className="w-5 h-5" />
                            {gameOver ? 'Tentar Novamente' : 'Jogar Agora'}
                        </button>
                        <p className="mt-4 text-xs text-gray-400">Use as setas do teclado para mover</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SnakeGame;
