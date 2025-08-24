/**
 * Handles predefined client-side commands for immediate execution.
 * If a command is not found, it returns null, allowing the prompt to be sent to the Gemini API.
 * @param prompt The user's input.
 * @returns A string response if the command is handled, otherwise null.
 */
export const commandHandler = (prompt: string): string | null => {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // Regex for commands with parameters
    const directionsToMatch = normalizedPrompt.match(/^get directions to (.+)/);

    if (directionsToMatch) {
        const location = directionsToMatch[1];
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, '_blank');
        return `Calculating directions to: ${location}`;
    }

    // Simple commands
    switch (normalizedPrompt) {
        case 'close the tab':
            // Note: This can only close tabs opened by script. It will not work on the main tab.
            window.close();
            return "Command executed. Note: Browser security may prevent this action.";
        default:
            // If no command matches, return null to indicate the prompt should be sent to the AI
            return null;
    }
};