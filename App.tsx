import React, { useState, useCallback } from 'react';
import { Message, Role, Source } from './types';
import { getVictorResponseStream, generateVictorImage } from './services/geminiService';
import { commandHandler } from './services/commandHandler';
import InputBar from './components/InputBar';
import ChatWindow from './components/ChatWindow';
import { useTextToSpeech } from './hooks/useTextToSpeech';

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

  const handleSend = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    cancel();
    
    const userMessage: Message = { id: `user-${Date.now()}`, role: Role.USER, content: prompt };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Client-side command handling
    const commandResponse = commandHandler(prompt);
    if (commandResponse) {
        const victorResponse: Message = {
            id: `victor-${Date.now()}`,
            role: Role.MODEL,
            content: commandResponse,
        };
        setMessages(prev => [...prev, victorResponse]);
        if (autoPlayTTS) {
            play(commandResponse, victorResponse.id);
        }
        return;
    }

    // Image generation command
    const imageGenMatch = prompt.toLowerCase().match(/^(?:show me|generate|create|draw) (?:(?:an? image|a picture) of )?(.+)/i);
    if (imageGenMatch) {
      const imagePrompt = imageGenMatch[1].trim();
      setIsLoading(true);
      const placeholder: Message = { 
        id: `victor-img-${Date.now()}`, 
        role: Role.MODEL, 
        content: `Acknowledged. Generating image of: ${imagePrompt}...` 
      };
      setMessages(prev => [...prev, placeholder]);

      try {
        const imageUrl = await generateVictorImage(imagePrompt);
        const imageMessage: Message = {
          id: placeholder.id,
          role: Role.MODEL,
          content: `Execution complete.`,
          imageUrl: imageUrl,
        };
        setMessages(prev => prev.map(m => m.id === placeholder.id ? imageMessage : m));
        if (autoPlayTTS) {
          play(imageMessage.content, imageMessage.id);
        }
      } catch (e) {
        const errorContent = e instanceof Error ? e.message : "An unknown error occurred.";
        const errorMessage: Message = {
          id: placeholder.id,
          role: Role.ERROR,
          content: errorContent,
        };
        setMessages(prev => prev.map(m => m.id === placeholder.id ? errorMessage : m));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    setIsLoading(true);
    const modelPlaceholder: Message = { id: `model-${Date.now()}`, role: Role.MODEL, content: "" };
    setMessages(prevMessages => [...prevMessages, modelPlaceholder]);
    
    let fullResponse = "";
    let sources: Source[] = [];
    
    try {
        const stream = getVictorResponseStream(messages, prompt);

        for await (const chunk of stream) {
            if (chunk.text) {
                fullResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetMessage = newMessages.find(m => m.id === modelPlaceholder.id);
                    if (targetMessage) {
                      targetMessage.content = fullResponse;
                    }
                    return newMessages;
                });
            }
            if (chunk.sources) {
                sources = [...sources, ...chunk.sources];
            }
            if (chunk.error) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetMessage = newMessages.find(m => m.id === modelPlaceholder.id);
                    if (targetMessage) {
                      targetMessage.content = chunk.error as string;
                      targetMessage.role = Role.ERROR;
                    }
                    return newMessages;
                });
                setIsLoading(false);
                return;
            }
        }

        const trimmedResponse = fullResponse.trim();
        
        // Check for Python execution command
        try {
            const commandJson = JSON.parse(trimmedResponse);
            if (commandJson.action === 'execute_python' && commandJson.code) {
                const response = await fetch('/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: commandJson.code }),
                });
                const result = await response.json();
                const output = result.output || `Error: ${result.error}`;
                
                const executionResult = `Python script executed. Output:\n\n---\n${output}\n---`;

                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetMessage = newMessages.find(m => m.id === modelPlaceholder.id);
                    if (targetMessage) {
                        targetMessage.content = executionResult;
                    }
                    return newMessages;
                });
                
                if (autoPlayTTS) {
                    play("Execution complete.", modelPlaceholder.id);
                }
                return; // End execution here
            }
        } catch (error) {
            // Not a JSON command, proceed as a normal text response
        }


        setMessages(prev => {
            const newMessages = [...prev];
            const targetMessage = newMessages.find(m => m.id === modelPlaceholder.id);
            if(targetMessage) {
                targetMessage.content = trimmedResponse;
                const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
                targetMessage.sources = uniqueSources;
            }
            return newMessages;
        });

        if (autoPlayTTS && trimmedResponse) {
          play(trimmedResponse, modelPlaceholder.id);
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
        setMessages(prev => {
            const newMessages = [...prev];
            const targetMessage = newMessages.find(m => m.id === modelPlaceholder.id);
             if(targetMessage) {
                targetMessage.content = `Critical system failure: ${errorMessage}`;
                targetMessage.role = Role.ERROR;
             }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  }, [messages, play, cancel, autoPlayTTS]);
  
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
        
        <div className="flex-1 flex flex-col min-h-0 relative z-0">
            <ChatWindow 
              messages={messages} 
              isLoading={isLoading}
              onToggleTTS={handleToggleTTS}
              isSpeaking={isSpeaking}
              currentlySpeakingId={currentlySpeakingId}
            />
        </div>

        <footer className="p-4 w-full max-w-4xl mx-auto z-10">
            <InputBar onSend={handleSend} isLoading={isLoading} />
        </footer>
    </main>
  );
};

export default App;