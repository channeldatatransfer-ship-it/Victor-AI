import React, { useState, useCallback, useEffect } from 'react';
import { Message, Role, Source, GameBoard, Player, Winner } from './types';
import { getVictorResponseStream, generateVictorImage } from './services/geminiService';
import { commandHandler } from './services/commandHandler';
import InputBar from './components/InputBar';
import ChatWindow from './components/ChatWindow';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import TicTacToe from './components/TicTacToe';
import { checkWinner } from './utils/gameLogic';


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `victor-${Date.now()}`,
      role: Role.MODEL,
      content: "Victor online. Awaiting directives, Operator.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoPlayTTS, setAutoPlayTTS] = useState(true);
  const { play, cancel, isSpeaking, currentlySpeakingId, isSupported: isTTSSupported } = useTextToSpeech();

  // Game State
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameBoard, setGameBoard] = useState<GameBoard>([
      [null, null, null], [null, null, null], [null, null, null]
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winnerInfo, setWinnerInfo] = useState<{ winner: Winner, line: number[] } | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For AI thinking time

  const chatWindowRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages, isGameActive]);

  const addMessage = useCallback((role: Role, content: string, sources?: Source[], imageUrl?: string) => {
    const newMessage: Message = { id: `${role}-${Date.now()}`, role, content, sources, imageUrl };
    setMessages(prev => [...prev, newMessage]);
    if (role === Role.MODEL && autoPlayTTS && content) {
        play(content, newMessage.id);
    }
  }, [autoPlayTTS, play]);

  // --- Game Logic ---

  const startGame = useCallback(() => {
    setIsGameActive(true);
    setGameBoard([
        [null, null, null], [null, null, null], [null, null, null]
    ]);
    setCurrentPlayer('X');
    setWinnerInfo(null);
    addMessage(Role.MODEL, "Acknowledged. Initializing Tic-Tac-Toe protocol. You are 'X'. Your move.");
  }, [addMessage]);

  const handleGameOver = useCallback((result: { winner: Winner, line: number[] }) => {
    setWinnerInfo(result);
    let message = "";
    if (result.winner === 'tie') {
        message = "The game is a tie. A logical outcome.";
    } else if (result.winner === 'X') {
        message = "Congratulations, Operator. You have won.";
    } else {
        message = "I have won. The optimal strategy prevailed.";
    }
    addMessage(Role.MODEL, message);
    
    setTimeout(() => {
        setIsGameActive(false);
        setWinnerInfo(null);
    }, 4000); // Reset game state after 4 seconds
  }, [addMessage]);


  const getVictorGameMove = useCallback(async (board: GameBoard) => {
    setIsGameLoading(true);
    const prompt = `It is my turn in Tic-Tac-Toe. I am 'O'. The current board state is ${JSON.stringify(board)}. Make your move. Respond ONLY with a JSON object in the format {"action": "game_move", "game": "tic-tac-toe", "move": [row, col]}}.`;
    
    let moveResponse = "";
    try {
        const stream = getVictorResponseStream([], prompt);
        for await (const chunk of stream) {
            if (chunk.text) { moveResponse += chunk.text; }
        }

        const moveJson = JSON.parse(moveResponse.trim());
        if (moveJson.action === 'game_move' && moveJson.move) {
            const [row, col] = moveJson.move;

            if (board[row][col] === null) {
                const newBoard = board.map(r => [...r]);
                newBoard[row][col] = 'O';
                setGameBoard(newBoard);

                const gameResult = checkWinner(newBoard);
                if (gameResult) {
                    handleGameOver(gameResult);
                } else {
                    setCurrentPlayer('X');
                }
            } else {
                console.error("Victor made an invalid move.");
                addMessage(Role.ERROR, "System error: I made an invalid move. Your turn.");
                setCurrentPlayer('X');
            }
        }
    } catch (e) {
        console.error("Failed to get Victor's move", e);
        addMessage(Role.ERROR, "A system malfunction occurred while calculating my move. Your turn.");
        setCurrentPlayer('X');
    } finally {
        setIsGameLoading(false);
    }
  }, [addMessage, handleGameOver]);

  const handlePlayerMove = useCallback(async (row: number, col: number) => {
    if (gameBoard[row][col] !== null || winnerInfo || currentPlayer !== 'X' || isGameLoading) return;

    const newBoard = gameBoard.map(r => [...r]);
    newBoard[row][col] = 'X';
    setGameBoard(newBoard);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
        handleGameOver(gameResult);
    } else {
        setCurrentPlayer('O');
        setTimeout(() => getVictorGameMove(newBoard), 500);
    }
  }, [gameBoard, winnerInfo, currentPlayer, isGameLoading, handleGameOver, getVictorGameMove]);

  // --- Main Handler ---

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    cancel();

    if (isGameActive && prompt.toLowerCase().trim() === 'exit game') {
        setIsGameActive(false);
        setWinnerInfo(null);
        addMessage(Role.MODEL, "Game terminated.");
        return;
    }
    
    const userMessage: Message = { id: `user-${Date.now()}`, role: Role.USER, content: prompt };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    const commandResponse = commandHandler(prompt);
    if (commandResponse) {
        addMessage(Role.MODEL, commandResponse);
        return;
    }

    const imageGenMatch = prompt.toLowerCase().match(/^(?:show me|generate|create|draw) (?:(?:an? image|a picture) of )?(.+)/i);
    if (imageGenMatch) {
      const imagePrompt = imageGenMatch[1].trim();
      setIsLoading(true);
      const placeholderId = `victor-img-${Date.now()}`;
      addMessage(Role.MODEL, `Acknowledged. Generating image of: ${imagePrompt}...`);

      try {
        const imageUrl = await generateVictorImage(imagePrompt);
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: 'Execution complete.', imageUrl } : m));
        if (autoPlayTTS) { play('Execution complete.', placeholderId); }
      } catch (e) {
        const errorContent = e instanceof Error ? e.message : "An unknown error occurred.";
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, role: Role.ERROR, content: errorContent } : m));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    setIsLoading(true);
    const modelPlaceholderId = `model-${Date.now()}`;
    setMessages(prevMessages => [...prevMessages, { id: modelPlaceholderId, role: Role.MODEL, content: "" }]);
    
    let fullResponse = "";
    let sources: Source[] = [];
    
    try {
        const stream = getVictorResponseStream(messages, prompt);

        for await (const chunk of stream) {
            if (chunk.text) {
                fullResponse += chunk.text;
                setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, content: fullResponse } : m));
            }
            if (chunk.sources) {
                sources = [...sources, ...chunk.sources];
            }
            if (chunk.error) {
                setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, role: Role.ERROR, content: chunk.error as string } : m));
                setIsLoading(false);
                return;
            }
        }

        const trimmedResponse = fullResponse.trim();
        let isJsonCommand = false;

        try {
            const commandJson = JSON.parse(trimmedResponse);
            isJsonCommand = true;

            if (commandJson.action === 'execute_python' && commandJson.code) {
                const response = await fetch('/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: commandJson.code }),
                });
                const result = await response.json();
                const output = result.output || `Error: ${result.error}`;
                const executionResult = `Python script executed. Output:\n\n---\n${output}\n---`;
                setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, content: executionResult } : m));
                if (autoPlayTTS) { play("Execution complete.", modelPlaceholderId); }

            } else if (commandJson.action === 'start_game' && commandJson.game === 'tic-tac-toe') {
                setMessages(prev => prev.filter(m => m.id !== modelPlaceholderId)); // Remove placeholder
                startGame();
            } else {
                isJsonCommand = false; // Not a recognized command
            }
        } catch (error) {
            // Not a JSON command, proceed as a normal text response
        }

        if (!isJsonCommand) {
            setMessages(prev => prev.map(m => {
                if (m.id === modelPlaceholderId) {
                    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
                    return { ...m, content: trimmedResponse, sources: uniqueSources };
                }
                return m;
            }));
            if (autoPlayTTS && trimmedResponse) {
              play(trimmedResponse, modelPlaceholderId);
            }
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, role: Role.ERROR, content: `Critical system failure: ${errorMessage}` } : m));
    } finally {
        setIsLoading(false);
    }
  }, [messages, play, cancel, autoPlayTTS, isGameActive, addMessage, startGame, getVictorGameMove, handleGameOver]);
  
  const handleToggleTTS = (message: Message) => {
    if (isSpeaking && currentlySpeakingId === message.id) {
      cancel();
    } else {
      play(message.content, message.id);
    }
  };

  return (
    <main className="h-screen w-screen bg-black text-white flex flex-col font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,100,120,0.3),rgba(255,255,255,0))] opacity-75"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')] opacity-5"></div>

        <header className="flex items-center justify-between text-center p-4 border-b border-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm z-10">
            <div className="w-1/3"></div>
            <h1 className="text-2xl font-bold tracking-[0.3em] text-cyan-300 w-1/3" style={{ textShadow: '0 0 8px rgba(0, 255, 255, 0.5)' }}>
                VICTOR
            </h1>
            <div className="w-1/3 flex justify-end items-center pr-4">
                {isTTSSupported && (
                  <label htmlFor="autoplay-toggle" className="flex items-center cursor-pointer">
                    <span className="mr-3 text-sm text-cyan-300">Auto-Speak</span>
                    <div className="relative">
                      <input type="checkbox" id="autoplay-toggle" className="sr-only peer" checked={autoPlayTTS} onChange={() => setAutoPlayTTS(!autoPlayTTS)} />
                      <div className="block bg-gray-600 w-10 h-6 rounded-full peer-checked:bg-cyan-600"></div>
                      <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full peer-checked:bg-cyan-100"></div>
                    </div>
                  </label>
                )}
            </div>
        </header>
        
        <div ref={chatWindowRef} className="flex-1 flex flex-col min-h-0 relative z-0 overflow-y-auto">
            {!isGameActive && (
              <ChatWindow 
                messages={messages} 
                isLoading={isLoading}
                onToggleTTS={handleToggleTTS}
                isSpeaking={isSpeaking}
                currentlySpeakingId={currentlySpeakingId}
              />
            )}
            {isGameActive && (
              <>
                <ChatWindow 
                    messages={messages.slice(-3)} // Show only recent messages during game
                    isLoading={false}
                    onToggleTTS={handleToggleTTS}
                    isSpeaking={isSpeaking}
                    currentlySpeakingId={currentlySpeakingId}
                />
                <TicTacToe 
                    board={gameBoard}
                    onPlayerMove={handlePlayerMove}
                    isPlayerTurn={currentPlayer === 'X' && !isGameLoading && !winnerInfo}
                    winnerInfo={winnerInfo}
                    isGameLoading={isGameLoading}
                />
              </>
            )}
        </div>

        <footer className="p-4 w-full max-w-4xl mx-auto z-10">
            <InputBar onSend={handleSend} isLoading={isLoading} isGameActive={isGameActive} />
        </footer>
    </main>
  );
};

export default App;