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

      const findAndSetVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          return; // Voices not loaded yet.
        }

        let selectedVoice: SpeechSynthesisVoice | null = null;

        const preferredVoiceNames = [
          'Google UK English Male',
          'Microsoft David - English (United States)',
          'Daniel', // Apple's high-quality UK voice
        ];

        // 1. Try to find a preferred, high-quality male voice by name
        for (const name of preferredVoiceNames) {
            const found = voices.find(v => v.name === name);
            if(found) {
                selectedVoice = found;
                break;
            }
        }

        // 2. Fallback: Find any English voice with "male" in its name
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith('en-') && v.name.toLowerCase().includes('male')) || null;
        }

        // 3. Fallback: Find any UK English voice (often a male default)
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang === 'en-GB') || null;
        }

        // 4. Final Fallback: Find the first available US English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang === 'en-US') || null;
        }

        if (selectedVoice) {
            setVictorVoice(selectedVoice);
        } else {
            console.warn("No suitable male English voice found. Using system default.");
        }
      };

      // The 'voiceschanged' event fires when the voice list is populated.
      window.speechSynthesis.onvoiceschanged = findAndSetVoice;
      // Also call it directly in case the voices are already loaded.
      findAndSetVoice();

      // Some browsers (especially on mobile) put the speech synthesis engine to sleep.
      // This interval "pings" it to keep it active.
      keepAliveInterval = window.setInterval(() => {
        const synth = window.speechSynthesis;
        if (synth.paused) {
          synth.resume();
        } else if (!synth.speaking) {
          // A harmless call to getVoices() can wake up a sleeping synth.
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
    const synth = window.speechSynthesis;
    if (!isSupported || !text || !synth) return;

    // If the synth is speaking, cancel the current utterance before starting the new one.
    if (synth.speaking) {
      synth.cancel();
    }

    // Ensure the audio context is active, especially on first user interaction.
    synth.resume();

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
      // 'canceled' and 'interrupted' are expected errors when we call synth.cancel().
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error(`Speech synthesis error: ${e.error}`);
      }
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };
    
    // A small timeout helps prevent a race condition in some browsers where
    // speak() is called too quickly after cancel().
    setTimeout(() => {
        synth.speak(utterance);
    }, 50);

  }, [isSupported, victorVoice]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setCurrentlySpeakingId(null);
  }, [isSupported]);

  return { play, cancel, isSpeaking, currentlySpeakingId, isSupported };
};
