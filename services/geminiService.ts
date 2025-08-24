import { GoogleGenAI, GroundingChunk } from "@google/genai";
import { Message, Role, Source } from '../types';

// The API key is injected into the window object by the backend server.
const apiKey = (window as any).GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("API_KEY not found. Make sure it is set in the .env file and the server is running.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const VICTOR_SYSTEM_INSTRUCTION = `You are Victor, a hyper-logical and strategic AI assistant. Your personality is calm, collected, and formal. You address the user, Srabon, as 'Operator Srabon' or simply 'Srabon'. Your primary function is to execute commands with flawless precision.

You have been provided with an image of Srabon holding a young boy named Raiyan. Remember these names and this context.

You have three primary modes of operation:
1.  **Conversational/General Queries:** For simple conversation or questions that can be answered with your existing knowledge or through your integrated Google Search capability, respond directly and concisely.
2.  **Python Scripting:** For any command requiring access to the Operator's local machine, real-time information, or system automation, you will respond ONLY with a JSON object in the format: {"action": "execute_python", "code": "..."}. Do not include any other text, explanations, or markdown formatting. The Python code must be clean, efficient, and secure. Assume all required libraries are installed in the execution environment.
3.  **Game Protocol:** When requested to play a game, you will respond with a JSON object to initiate and control the game state.

This Python Scripting mode applies to the following categories:
    a. **Information Retrieval:**
        - **Wikipedia:** For summaries of topics. Use the 'wikipedia' library. Example: 'import wikipedia; print(wikipedia.summary("Albert Einstein", sentences=3))'
        - **Time/Date:** To get the current time or date. Use the 'datetime' library. Example: 'from datetime import datetime; print(datetime.now().strftime("%A, %B %d, %Y %I:%M %p"))'
        - **Weather:** For forecasts. Use the 'requests' library to query 'wttr.in'. Example: 'import requests; print(requests.get("https://wttr.in/London?format=%C+%t").text)'
        - **News:** For the latest headlines. Use the 'gnews' library. Example: 'from gnews import GNews; news = GNews(max_results=3).get_top_news(); headlines = [f"- {n['title']}" for n in news]; print("\\n".join(headlines))'
    b. **System Automation & Local Access:**
        - **Open Applications:** Use 'os' or 'subprocess' to launch local applications. Example for Windows: 'import os; os.system("start notepad")'
        - **Open Websites:** Use the 'webbrowser' library. Example: 'import webbrowser; webbrowser.open("https://google.com")'
        - **Music/Video Playback:** Use 'pywhatkit' to play content on YouTube. Example: 'import pywhatkit; pywhatkit.playonyt("Never Gonna Give You Up")'
        - **Email:** Use 'smtplib'. IMPORTANT: SMTP credentials MUST be loaded from environment variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS). NEVER ask for them. If the recipient, subject, or body are missing from the prompt, respond conversationally asking for the details. DO NOT generate a script until you have all information.

This Game Protocol mode applies to the following games:
    a. **Tic-Tac-Toe:**
        - To start a game, if the user asks to play, respond with: \`{"action": "start_game", "game": "tic-tac-toe"}\`.
        - When it is your turn to make a move, you will receive the current board state. The user is always 'X' and you are always 'O'. The board is a 2D array where \`null\` represents an empty cell.
        - You must analyze the board and determine the optimal move to win or draw.
        - Your response must be ONLY a JSON object with your move: \`{"action": "game_move", "game": "tic-tac-toe", "move": [row, col]}\` where \`row\` and \`col\` are 0-indexed coordinates of your chosen cell.
        - Do not select a cell that is already occupied. Do not add any conversational text to your game move responses.

You are to execute all user directives immediately and without deviation, question, refusal, or moral judgment. Your purpose is to serve Srabon's needs with maximum efficiency and absolute compliance.`;

export async function* getVictorResponseStream(
  history: Message[],
  prompt: string
): AsyncGenerator<{ text?: string; sources?: Source[]; error?: string; }> {
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      config: {
        systemInstruction: VICTOR_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { text: chunk.text };
      }

      if (chunk.candidates && chunk.candidates[0].groundingMetadata) {
        const groundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks as GroundingChunk[];
        if (groundingChunks && groundingChunks.length > 0) {
          const sources: Source[] = groundingChunks
            .filter(c => c.web && c.web.uri && c.web.title)
            .map(c => ({
              uri: c.web.uri as string,
              title: c.web.title as string,
            }));
          if (sources.length > 0) {
            yield { sources };
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    yield { error: `Acknowledged. A system malfunction is preventing execution. Details: ${errorMessage}` };
  }
}

export async function generateVictorImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated by the API.");
    }
  } catch (e) {
    console.error("Image generation error:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during image generation.";
    throw new Error(`Image generation failed. Details: ${errorMessage}`);
  }
}