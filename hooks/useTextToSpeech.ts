import { useState, useEffect, useCallback } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [victorVoice, setVictorVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    let keepAliveInterval: number;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const findVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        let preferredVoice = voices.find(v => v.name === 'Google UK English Male');
        if (!preferredVoice) {
            preferredVoice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Male'));
        }
        if (!preferredVoice) {
            preferredVoice = voices.find(v => v.lang.startsWith('en-GB'));
        }
        if (!preferredVoice) {
            preferredVoice = voices.find(v => v.lang.startsWith('en-'));
        }
        setVictorVoice(preferredVoice || null);
      };

      findVoice();
      window.speechSynthesis.onvoiceschanged = findVoice;
      
      // Keep-alive for the speech synthesis engine.
      // Some browsers can put the speech synthesis engine to sleep after inactivity.
      // This interval "pings" it to keep it active.
      keepAliveInterval = window.setInterval(() => {
        const synth = window.speechSynthesis;
        if (synth.paused) {
          synth.resume();
        } else if (!synth.speaking) {
          // Calling getVoices() is a harmless way to check the state and
          // can sometimes "wake up" a sleeping synthesis engine.
          synth.getVoices();
        }
      }, 10000);

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
        clearInterval(keepAliveInterval);
      };
    }
  }, []);

  const play = useCallback((text: string, id: string) => {
    if (!isSupported || !text) return;
    
    // Resume context just in case it's suspended
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (victorVoice) {
      utterance.voice = victorVoice;
      utterance.pitch = 0.9;
      utterance.rate = 1.1;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentlySpeakingId(id);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      // Don't log benign errors when speech is intentionally stopped.
      if (e.error === 'interrupted' || e.error === 'canceled') {
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
        return;
      }
      console.error(`Speech synthesis error: ${e.error || 'Details not available. See event object below.'}`);
      console.error("Full SpeechSynthesisErrorEvent object:", e);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, victorVoice]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
  }, [isSupported]);

  return { play, cancel, isSpeaking, currentlySpeakingId, isSupported };
};