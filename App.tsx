import React, { useState, useCallback, useEffect } from 'react';
import { Message, Role, Source, GameBoard, Player, Winner, GameType } from './types';
import { getVictorResponseStream, generateVictorImage, getVictorResponse, getAkinatorResponse } from './services/geminiService';
import { commandHandler } from './services/commandHandler';
import InputBar from './components/InputBar';
import ChatWindow from './components/ChatWindow';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import TicTacToe from './components/TicTacToe';
import { checkWinner } from './utils/gameLogic';
import MindReaderGame from './components/MindReaderGame';
import MonerKothaGame from './components/MonerKothaGame';

// --- Guess the Word Game Component and Types ---
interface GuessTheWordState {
  word: string;
  hint: string;
  guesses: string[];
  remainingAttempts: number;
  isGameOver: boolean;
  isWon: boolean;
}

const GuessTheWordGame: React.FC<{ gameState: GuessTheWordState, isGameLoading: boolean }> = ({ gameState, isGameLoading }) => {
  const { hint, guesses, remainingAttempts, isGameOver, isWon, word } = gameState;

  if (isGameLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-cyan-300 animate-pulse text-xl">
        Generating word...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 my-4">
      <div className="bg-gray-900/80 border border-cyan-500/20 p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center">
        <h2 className="text-3xl font-bold mb-4 text-purple-400 animate-pulse">
          শব্দ অনুমান করুন
        </h2>
        
        {isGameOver ? (
          <div className="text-2xl mt-4">
            {isWon ? (
              <p className="text-green-400">আপনি জিতেছেন! শব্দটি ছিল: <span className="font-bold">{word}</span></p>
            ) : (
              <p className="text-red-400">খেলা শেষ। শব্দটি ছিল: <span className="font-bold">{word}</span></p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-cyan-900/50 text-cyan-200 p-4 rounded-lg text-lg mb-6 shadow-inner">
              <p className="font-semibold">ইঙ্গিত:</p>
              <p>{hint}</p>
            </div>

            <div className="mb-4">
              <p className="text-cyan-300">অবশিষ্ট প্রচেষ্টা: <span className="font-bold text-2xl">{remainingAttempts}</span></p>
            </div>
            
            {guesses.length > 0 && (
              <div className="mb-4">
                <p className="text-cyan-400">আপনার ভুল অনুমান:</p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {guesses.map((guess, index) => (
                    <span key={index} className="bg-red-900/70 text-red-200 px-3 py-1 rounded-full text-sm font-mono line-through">
                      {guess}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};


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
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For AI thinking/setup time
  
  // Tic-Tac-Toe State
  const [gameBoard, setGameBoard] = useState<GameBoard>([
      [null, null, null], [null, null, null], [null, null, null]
  ]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winnerInfo, setWinnerInfo] = useState<{ winner: Winner, line: number[] } | null>(null);

  // Guess the Word State
  const [guessTheWordState, setGuessTheWordState] = useState<GuessTheWordState | null>(null);

  // Moner Kotha State
  const [akinatorMessages, setAkinatorMessages] = useState<Message[]>([]);


  const chatWindowRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatWindowRef.current?.scrollTo(0, chatWindowRef.current.scrollHeight);
  }, [messages, activeGame]);

  const addMessage = useCallback((role: Role, content: string, sources?: Source[], imageUrl?: string) => {
    const newMessage: Message = { id: `${role}-${Date.now()}`, role, content, sources, imageUrl };
    setMessages(prev => [...prev, newMessage]);
    if (role === Role.MODEL && autoPlayTTS && content) {
        play(content, newMessage.id);
    }
  }, [autoPlayTTS, play]);

  // --- Game Logic ---

  const fetchFirstAkinatorQuestion = useCallback(async () => {
    setIsGameLoading(true);
    // This initial message primes the AI to ask the first question.
    const initialHistory: Message[] = [{ role: Role.USER, content: "I have thought of something. Start asking questions.", id: 'start' }];
    const response = await getAkinatorResponse(initialHistory);
    if (response.text) {
        setAkinatorMessages([{ role: Role.MODEL, content: response.text, id: `akinator-${Date.now()}` }]);
    } else {
        const errorContent = response.error || "Failed to start the game. Please try again.";
        addMessage(Role.ERROR, errorContent);
        setActiveGame(null);
    }
    setIsGameLoading(false);
  }, [addMessage]);

  const handleAkinatorAnswer = useCallback(async (answer: string) => {
      const newUserMessage: Message = { role: Role.USER, content: answer, id: `akinator-user-${Date.now()}` };
      const currentHistory = [...akinatorMessages, newUserMessage];
      setAkinatorMessages(currentHistory);
      setIsGameLoading(true);

      const response = await getAkinatorResponse(currentHistory);

      if (response.text) {
          const newModelMessage: Message = { role: Role.MODEL, content: response.text, id: `akinator-model-${Date.now()}` };
          setAkinatorMessages(prev => [...prev, newModelMessage]);
          if(autoPlayTTS) { play(response.text, newModelMessage.id); }
      } else {
          const errorMessage: Message = { role: Role.ERROR, content: response.error || "Error getting response", id: `akinator-error-${Date.now()}` };
          setAkinatorMessages(prev => [...prev, errorMessage]);
      }
      setIsGameLoading(false);
  }, [akinatorMessages, autoPlayTTS, play]);

  const setupGuessTheWord = useCallback(async () => {
    setIsGameLoading(true);
    addMessage(Role.MODEL, "Acknowledged. Initializing Guess the Word protocol. Generating a word and hint...");

    const prompt = "Generate a common, single Bengali word (not a phrase) and a short, simple hint for it. The word should be easy for a casual game. Respond ONLY with a JSON object in the format: `{\"word\": \"...\", \"hint\": \"...\"}`.";

    try {
        const response = await getVictorResponse(prompt);
        if (response.error || !response.text) {
            throw new Error(response.error || "No response text received for game data.");
        }

        const jsonString = response.text.trim().match(/{.*}/s)?.[0];
        if (!jsonString) {
            console.error("Invalid response from Victor (not a JSON object):", response.text);
            throw new Error("Received an invalid non-JSON response from the AI.");
        }

        const gameData = JSON.parse(jsonString);
        if (gameData.word && gameData.hint) {
            setMessages(prev => prev.slice(0, -1)); // Remove "Generating..." message
            addMessage(Role.MODEL, `I have selected a word. Your hint is: ${gameData.hint}`);
            setGuessTheWordState({
                word: gameData.word,
                hint: gameData.hint,
                guesses: [],
                remainingAttempts: 6,
                isGameOver: false,
                isWon: false,
            });
        } else {
            console.error("Invalid JSON structure from Victor:", gameData);
            throw new Error("Received a JSON response with an invalid structure.");
        }
    } catch (e) {
        console.error("Failed to setup Guess the Word", e);
        addMessage(Role.ERROR, "A system malfunction occurred while setting up the game. Please try again.");
        setActiveGame(null);
    } finally {
        setIsGameLoading(false);
    }
}, [addMessage]);

  const startGame = useCallback((game: GameType) => {
    setActiveGame(game);
    if (game === 'tic-tac-toe') {
      setGameBoard([
        [null, null, null], [null, null, null], [null, null, null]
      ]);
      setCurrentPlayer('X');
      setWinnerInfo(null);
      addMessage(Role.MODEL, "Acknowledged. Initializing Tic-Tac-Toe protocol. You are 'X'. Your move.");
    } else if (game === 'mind-reader') {
      addMessage(Role.MODEL, "Acknowledged. Initializing Mind Reader protocol.");
    } else if (game === 'guess-the-word') {
        setupGuessTheWord();
    } else if (game === 'moner-kotha') {
        addMessage(Role.MODEL, "Acknowledged. Initializing 'Moner Kotha' protocol. Please think of a common object, person, or animal. I will ask questions to determine what it is. Let's begin.");
        setAkinatorMessages([]);
        fetchFirstAkinatorQuestion();
    }
  }, [addMessage, setupGuessTheWord, fetchFirstAkinatorQuestion]);

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
        setActiveGame(null);
        setWinnerInfo(null);
    }, 4000); // Reset game state after 4 seconds
  }, [addMessage]);


  const getVictorGameMove = useCallback(async (board: GameBoard) => {
    setIsGameLoading(true);
    const prompt = `Tic-Tac-Toe move request. I am 'O'. Current board: ${JSON.stringify(board)}. Determine the optimal move. Your response must be a valid JSON object following this exact format: {"action": "game_move", "game": "tic-tac-toe", "move": [row, col]}`;
    
    try {
        const response = await getVictorResponse(prompt);

        if (response.error || !response.text) {
          throw new Error(response.error || "No response text received for game move.");
        }

        const moveResponseText = response.text.trim();
        
        const jsonStartIndex = moveResponseText.indexOf('{');
        const jsonEndIndex = moveResponseText.lastIndexOf('}');

        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
            console.error("Invalid response from Victor (not a JSON object):", moveResponseText);
            throw new Error("Received an invalid non-JSON response from the AI.");
        }
        
        const jsonString = moveResponseText.substring(jsonStartIndex, jsonEndIndex + 1);
        const moveJson = JSON.parse(jsonString);

        if (moveJson.action === 'game_move' && Array.isArray(moveJson.move) && moveJson.move.length === 2) {
            const [row, col] = moveJson.move;

            if (board[row]?.[col] === null) { // Check for valid coordinates and empty cell
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
                console.error(`Victor made an invalid move to (${row}, ${col}), which is occupied or out of bounds.`);
                addMessage(Role.ERROR, "System error: I selected an invalid cell. Your turn, Operator.");
                setCurrentPlayer('X');
            }
        } else {
            console.error("Invalid JSON structure from Victor:", moveJson);
            throw new Error("Received a JSON response with an invalid structure.");
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

  const handleGuessTheWord = useCallback((guess: string) => {
    if (!guessTheWordState || guessTheWordState.isGameOver) return;

    const { word, guesses, remainingAttempts } = guessTheWordState;
    const formattedGuess = guess.trim();

    if (formattedGuess.toLowerCase() === word.toLowerCase()) {
        addMessage(Role.MODEL, `Correct! The word was ${word}. You have won, Operator.`);
        setGuessTheWordState(prev => prev ? { ...prev, isGameOver: true, isWon: true } : null);
        setTimeout(() => {
            setActiveGame(null);
            setGuessTheWordState(null);
        }, 4000);
    } else {
        const newRemainingAttempts = remainingAttempts - 1;
        const newGuesses = [...guesses, formattedGuess];

        if (newRemainingAttempts <= 0) {
            addMessage(Role.MODEL, `Incorrect. You are out of attempts. The correct word was ${word}.`);
            setGuessTheWordState(prev => prev ? { ...prev, guesses: newGuesses, isGameOver: true, remainingAttempts: 0 } : null);
            setTimeout(() => {
                setActiveGame(null);
                setGuessTheWordState(null);
            }, 4000);
        } else {
            addMessage(Role.MODEL, `Incorrect. You have ${newRemainingAttempts} attempts remaining.`);
            setGuessTheWordState(prev => prev ? { ...prev, guesses: newGuesses, remainingAttempts: newRemainingAttempts } : null);
        }
    }
}, [guessTheWordState, addMessage]);

  // --- Main Handler ---

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    cancel();

    if (activeGame && prompt.toLowerCase().trim() === 'exit game') {
        setActiveGame(null);
        setWinnerInfo(null);
        setGuessTheWordState(null);
        setAkinatorMessages([]);
        addMessage(Role.MODEL, "Game terminated.");
        return;
    }
    
    const userMessage: Message = { id: `user-${Date.now()}`, role: Role.USER, content: prompt };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    if (activeGame === 'guess-the-word') {
        handleGuessTheWord(prompt);
        return;
    }

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

            } else if (commandJson.action === 'start_game' && (commandJson.game === 'tic-tac-toe' || commandJson.game === 'mind-reader' || commandJson.game === 'guess-the-word' || commandJson.game === 'moner-kotha')) {
                setMessages(prev => prev.filter(m => m.id !== modelPlaceholderId)); // Remove placeholder
                startGame(commandJson.game as GameType);
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
  }, [messages, play, cancel, autoPlayTTS, activeGame, addMessage, startGame, handleGuessTheWord]);
  
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
            {activeGame ? (
              <>
                <ChatWindow 
                    messages={messages.slice(-3)} // Show only recent messages during game
                    isLoading={false}
                    onToggleTTS={handleToggleTTS}
                    isSpeaking={isSpeaking}
                    currentlySpeakingId={currentlySpeakingId}
                />
                {activeGame === 'tic-tac-toe' && (
                  <TicTacToe 
                      board={gameBoard}
                      onPlayerMove={handlePlayerMove}
                      isPlayerTurn={currentPlayer === 'X' && !isGameLoading && !winnerInfo}
                      winnerInfo={winnerInfo}
                      isGameLoading={isGameLoading}
                  />
                )}
                {activeGame === 'mind-reader' && (
                  <MindReaderGame />
                )}
                {activeGame === 'guess-the-word' && guessTheWordState && (
                  <GuessTheWordGame 
                    gameState={guessTheWordState}
                    isGameLoading={isGameLoading}
                  />
                )}
                {activeGame === 'moner-kotha' && (
                  <MonerKothaGame
                    messages={akinatorMessages}
                    onSendAnswer={handleAkinatorAnswer}
                    isLoading={isGameLoading}
                  />
                )}
              </>
            ) : (
              <ChatWindow 
                messages={messages} 
                isLoading={isLoading}
                onToggleTTS={handleToggleTTS}
                isSpeaking={isSpeaking}
                currentlySpeakingId={currentlySpeakingId}
              />
            )}
        </div>

        <footer className="p-4 w-full max-w-4xl mx-auto z-10">
            <InputBar onSend={handleSend} isLoading={isLoading || isGameLoading} isGameActive={activeGame !== null} />
        </footer>
    </main>
  );
};

export default App;