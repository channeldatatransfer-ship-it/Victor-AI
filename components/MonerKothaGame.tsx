import React, { useEffect, useRef } from 'react';
import { Message, Role } from '../types';
import LoadingIndicator from './LoadingIndicator';
import { UserIcon, VictorIcon } from './IconComponents';

interface MonerKothaGameProps {
    messages: Message[];
    onSendAnswer: (answer: string) => void;
    isLoading: boolean;
}

const MonerKothaGame: React.FC<MonerKothaGameProps> = ({ messages, onSendAnswer, isLoading }) => {
    const answerOptions = ["হ্যাঁ", "না", "জানিনা", "সম্ভবত", "সম্ভবত না"];
    const gameChatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        gameChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const isGuess = messages.length > 0 && messages[messages.length-1].content.startsWith("আমার অনুমান:");

    return (
        <div className="flex-1 flex flex-col items-center justify-between p-4 my-4 w-full max-w-3xl mx-auto">
            {/* Game title */}
            <h2 className="text-3xl font-bold mb-4 text-purple-400 animate-pulse">
                মনের কথা
            </h2>
            
            {/* Chat area */}
            <div className="flex-1 overflow-y-auto w-full space-y-4 pr-2">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== Role.USER && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-cyan-500/30">
                                <VictorIcon />
                            </div>
                        )}
                        <div className={`max-w-md p-3 rounded-lg shadow-md ${
                            msg.role === Role.MODEL ? 'bg-gray-900/80 border border-cyan-500/20 text-cyan-50' :
                            msg.role === Role.ERROR ? 'bg-red-900/80 border border-red-500/30 text-red-100' :
                            'bg-cyan-600/90 text-white'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === Role.USER && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-cyan-500/30">
                                <UserIcon />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-3 justify-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-cyan-500/30">
                            <VictorIcon />
                        </div>
                        <div className="max-w-lg p-3 rounded-lg shadow-lg bg-gray-900/80 border border-cyan-500/20">
                            <LoadingIndicator />
                        </div>
                    </div>
                )}
                <div ref={gameChatEndRef} />
            </div>

            {/* Answer Buttons */}
            <div className="mt-6 w-full">
                <div className="flex flex-wrap justify-center gap-3">
                    {(isGuess ? ["হ্যাঁ", "না"] : answerOptions).map(option => (
                        <button
                            key={option}
                            onClick={() => onSendAnswer(option)}
                            disabled={isLoading}
                            className="bg-cyan-700 hover:bg-cyan-600 text-white font-semibold py-2 px-5 rounded-full shadow-lg transition duration-300 transform hover:-translate-y-1 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MonerKothaGame;
