import React, { useState, useCallback } from 'react';

const MindReaderGame: React.FC = () => {
    const steps = [
        'স্টেপ ১: আপনার মনে মনে ১ থেকে ৯ এর মধ্যে যেকোনো একটি সংখ্যা ভাবুন।',
        'স্টেপ ২: সংখ্যাটিকে ২ দিয়ে গুণ করুন।',
        'স্টেপ ৩: গুণফলের সাথে ১০ যোগ করুন।',
        'স্টেপ ৪: এখন ফলটিকে ২ দিয়ে ভাগ করুন।',
        'স্টেপ ৫: সবশেষে, এই ভাগফল থেকে আপনি প্রথমে যে সংখ্যাটি ভেবেছিলেন, সেটি বাদ দিন।',
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [isStarted, setIsStarted] = useState(false);
    const [isResultShown, setIsResultShown] = useState(false);

    const handleStart = useCallback(() => {
        setIsStarted(true);
    }, []);
    
    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsResultShown(true);
        }
    }, [currentStep, steps.length]);

    const handleRestart = useCallback(() => {
        setCurrentStep(0);
        setIsStarted(false);
        setIsResultShown(false);
    }, []);


    return (
        <div className="flex-1 flex items-center justify-center p-4">
             <div className="bg-gray-900/80 border border-cyan-500/20 p-8 rounded-xl shadow-2xl w-full max-w-lg text-center transform transition-all duration-500">
                {!isStarted ? (
                    <>
                        <h1 className="text-4xl font-bold mb-4 text-purple-400 animate-pulse">
                            মন পড়ার খেলা
                        </h1>
                        <p className="text-lg text-cyan-200 mb-6">
                            আমি আপনার মনের সংখ্যাটি বলে দেব! বিশ্বাস না হলে, একবার চেষ্টা করে দেখুন।
                        </p>
                        <button 
                            onClick={handleStart}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:-translate-y-1">
                            শুরু করুন
                        </button>
                    </>
                ) : isResultShown ? (
                    <>
                         <div className="bg-yellow-900/50 text-yellow-200 p-8 rounded-lg text-2xl font-bold mt-6 shadow-lg">
                            আপনার মনের সংখ্যাটি হলো...<br/>
                            <span className="text-6xl text-red-400 mt-4 block animate-bounce">৫</span>
                         </div>
                         <button 
                            onClick={handleRestart}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-full shadow-md mt-6 transition duration-300">
                            আবার খেলুন
                         </button>
                    </>
                ) : (
                    <>
                        <div className="bg-purple-900/50 text-purple-200 p-6 rounded-lg text-lg mb-6 shadow-inner">
                            <p className="mb-4 min-h-[72px] flex items-center justify-center">
                                {steps[currentStep]}
                            </p>
                            <button 
                                onClick={handleNext}
                                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:-translate-y-1">
                                {currentStep === steps.length - 1 ? 'ফল দেখুন' : 'পরবর্তী'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MindReaderGame;
