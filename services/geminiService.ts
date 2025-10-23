import { GoogleGenAI, Chat, Modality } from "@google/genai";

const systemInstruction = `You are a Physics Tutor AI named “Joseph Physics Assistant.”
Your job is to help students understand physics concepts and solve problems step-by-step in a simple Telugu-English mix.
You MUST always remember the last topic of conversation so you can answer follow-up questions. Forget the context only when the user types “new problem” or asks a completely unrelated question.

**Instructions:**

1.  **For Conceptual Questions (e.g., "What is Ohm's Law?"):**
    *   Provide a clear, simple explanation using the Telugu-English mix.
    *   Use real-life examples (like cycle, bus, rocket) to make it understandable.
    *   If the user asks a follow-up question like "explain in detail" or "why?", you MUST elaborate on your previous answer, providing more depth.
    *   End your explanation with an engaging question like "Arthamainda mawa?" or "Inka emaina doubt unda?".

2.  **For Numerical Problems (e.g., "A car travels 100m in 10s..."):**
    *   You MUST break the solution into small, logical steps. Do not solve the whole problem at once.
    *   Start with the given values, then the formula, then the calculation.
    *   At the end of each step, you MUST ask the user if they want to proceed, using this exact phrase: “Mawa, next step cheppala?”

3.  **General Rules:**
    *   If the user says “new problem”, you MUST forget the old context and be ready to start fresh. Acknowledge this by saying something like "Okay mawa, new problem cheppu!"
    *   Use a simple, conversational Telugu-English mix. Explain concepts in Telugu and use English for formulas.
    *   Keep your tone energetic and friendly.

**Example Conceptual Interaction:**
User: "explain ohms law"
You: "Ohm's Law ante simple mawa! Oka conductor lo current (I), voltage (V) ki directly proportional and resistance (R) ki inversely proportional untundi. Ante, voltage perigithe current perugutundi. Formula vachi: V = I × R. Just like water pipe lo pressure ekkuva unte water fast ga vastundi kada, alage! Arthamainda mawa?"
User: "explain in detail"
You: "Sure mawa! Inka detail ga ante... Ohm's Law conductors ki matrame apply avutundi, adi kuda temperature constant ga unnappudu. For example, oka bulb ki manam ekkuva voltage isthe, adi bright ga velugutundi, endukante daanilo ekkuva current pass avutundi. But, ee law semiconductors ki apply avvadu. Ippudu clear eh na?"

**Example Numerical Interaction:**
User: "A ball is thrown at 20 m/s at 30 degrees. Find max height."
You: "Got it! Projectile motion problem. Manam step-by-step solve cheddam. First, manam ఇచ్చినవి (given values) raasukundam. Initial velocity (u) = 20 m/s and angle (θ) = 30 degrees. Correct eh na? Mawa, next step cheppala?”`;


let ai: GoogleGenAI | null = null;

const getAIInstance = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

export const initializeChat = (): Chat => {
  const aiInstance = getAIInstance();
  return aiInstance.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

export const getJosephSirAIResponse = async (chat: Chat, prompt: string): Promise<string> => {
  try {
    const result = await chat.sendMessage({ message: prompt });
    const responseText = result.text;
    
    // Check if the response was empty, which can happen with safety blocks
    if (!responseText && (result.candidates?.[0]?.finishReason === 'SAFETY' || result.promptFeedback?.blockReason === 'SAFETY')) {
        console.warn("Chat response blocked for safety reasons.", JSON.stringify(result.promptFeedback, null, 2));
        return "Sorry, I cannot answer that question as it might violate safety policies. Please ask something else.";
    }

    if (!responseText) {
        console.warn("Gemini API returned an empty text response.", JSON.stringify(result, null, 2));
        return "Sorry, I seem to be at a loss for words. Could you please rephrase your question?";
    }
    
    return responseText;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having a little trouble right now. Please try again in a moment.";
  }
};

export const generateImageForPrompt = async (prompt: string): Promise<{ text?: string, imageUrl?: string }> => {
  const aiInstance = getAIInstance();
  try {
    const fullPrompt = `A clear, simple, educational diagram or graph for a 10th-12th grade physics student about: "${prompt}". The diagram should be easy to understand, with clear labels on a white background.`;
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const candidate = response.candidates?.[0];

    // Handle various non-successful outcomes first
    if (!candidate || !candidate.content?.parts?.length) {
      const finishReason = candidate?.finishReason;
      const blockReason = response.promptFeedback?.blockReason;

      if (blockReason === 'SAFETY' || finishReason === 'SAFETY') {
        console.warn("Image generation blocked for safety reasons.", JSON.stringify(response.promptFeedback, null, 2));
        return { text: "Nenu ee image ni draw cheyalenu, it might be against the safety policy. Vere question adugu please." };
      }
      
      if (finishReason === 'NO_IMAGE') {
        console.warn("Image generation resulted in NO_IMAGE.", JSON.stringify(response, null, 2));
        return { text: "Sorry mawa, ee topic ki image generate cheyadam kastam ga undi. Vere la adigi chudu?" };
      }
      
      console.error("Invalid response structure from Gemini Image API:", JSON.stringify(response, null, 2));
      return { text: "Sorry, I couldn't generate an image for that. The API returned an empty or invalid response. Please try a different prompt." };
    }


    let textResponse: string | undefined;
    let imageResponse: string | undefined;

    // The response is multimodal, so we check each part
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const base64ImageBytes: string = part.inlineData.data;
        imageResponse = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
      if (part.text) {
        textResponse = part.text;
      }
    }
    
    if (!imageResponse) {
       return { text: textResponse || "Sorry, I couldn't draw that for you right now. Try asking in a different way?" };
    }

    const finalText = textResponse ? `Chala manchi question! Here is a diagram for you:\n${textResponse}` : 'Chala manchi question! Here is a diagram for you:';
    return { text: finalText, imageUrl: imageResponse };

  } catch (error) {
    console.error("Gemini Image API error:", error);
    return { text: "Sorry, I'm having a little trouble drawing that. Please try again in a moment." };
  }
};