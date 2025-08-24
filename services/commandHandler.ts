/**
 * Handles predefined client-side commands for immediate execution.
 * If a command is not found, it returns null, allowing the prompt to be sent to the Gemini API.
 * @param prompt The user's input.
 * @returns A string response if the command is handled, otherwise null.
 */
export const commandHandler = (prompt: string): string | null => {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Regex for commands with parameters
    const searchWebMatch = normalizedPrompt.match(/^search the web for (.+)/);
    const searchWikipediaMatch = normalizedPrompt.match(/^search wikipedia for (.+)/);
    const weatherInCityMatch = normalizedPrompt.match(/^what's the weather in (.+)/);
    const directionsToMatch = normalizedPrompt.match(/^get directions to (.+)/);

    if (searchWebMatch) {
        const query = searchWebMatch[1];
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        return `Executing web search for: ${query}`;
    }

    if (searchWikipediaMatch) {
        const topic = searchWikipediaMatch[1];
        window.open(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`, '_blank');
        return `Searching Wikipedia for: ${topic}`;
    }
    
    if (weatherInCityMatch) {
        const city = weatherInCityMatch[1];
        window.open(`https://www.google.com/search?q=weather+in+${encodeURIComponent(city)}`, '_blank');
        return `Querying weather conditions for: ${city}`;
    }

    if (directionsToMatch) {
        const location = directionsToMatch[1];
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, '_blank');
        return `Calculating directions to: ${location}`;
    }

    // Simple commands
    switch (normalizedPrompt) {
        case 'open google':
            window.open('https://google.com', '_blank');
            return "Affirmative. Opening Google.";
        case 'open youtube':
            window.open('https://youtube.com', '_blank');
            return "Affirmative. Opening YouTube.";
        case 'close the tab':
            // Note: This can only close tabs opened by script. It will not work on the main tab.
            window.close();
            return "Command executed. Note: Browser security may prevent this action.";
        case "what's the weather like?":
            window.open(`https://www.google.com/search?q=weather`, '_blank');
            return `Querying local weather conditions.`;
        default:
            // If no command matches, return null to indicate the prompt should be sent to the AI
            return null;
    }
};