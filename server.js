const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/evaluate', async (req, res) => {
    try {
        const { prompt, studentAnswer, mode } = req.body; 
        const activeMode = mode || 'whole';
        
        const systemInstruction = `
        You are an expert IELTS examiner grading an Academic Task 2 essay introduction component.
        Original Essay Prompt: "${prompt}"
        Student's Submitted Text: "${studentAnswer}"
        Active Practice Mode: "${activeMode}" (Options: 'paraphrase', 'thesis', 'map', 'whole').

        CRITICAL EVALUATION INSTRUCTION:
        1. If Mode is 'paraphrase':
           - Evaluate ONLY the paraphrased sentence submitted. Do NOT penalise the student for not writing a thesis statement or essay map.
           - Give an estimated band score based ONLY on their paraphrasing skills (meaning accuracy, vocabulary, and grammar variety).
           - Write constructive feedback in the "paraphraseFeedback" key (2-3 sentences in British English).
           - You MUST set "thesisFeedback" to exactly "N/A".
           - You MUST set "essayMapFeedback" to exactly "N/A".
           - The "suggestedVersion" must be a realistic Band 7.0 paraphrase sentence of the prompt only.

        2. If Mode is 'thesis':
           - Evaluate ONLY the thesis statement sentence submitted. Do NOT penalise the student for not writing a paraphrase or essay map.
           - Give an estimated band score based ONLY on how clearly they outline their position/opinion answering the prompt.
           - Write constructive feedback in the "thesisFeedback" key (2-3 sentences in British English).
           - You MUST set "paraphraseFeedback" to exactly "N/A".
           - You MUST set "essayMapFeedback" to exactly "N/A".
           - The "suggestedVersion" must be a realistic Band 7.0 thesis statement sentence only.

        3. If Mode is 'map':
           - Evaluate ONLY the essay map sentence submitted. Do NOT penalise the student for not writing a paraphrase or thesis statement.
           - Give an estimated band score based ONLY on how well they outline their upcoming body paragraphs.
           - Write constructive feedback in the "essayMapFeedback" key (2-3 sentences in British English).
           - You MUST set "paraphraseFeedback" to exactly "N/A".
           - You MUST set "thesisFeedback" to exactly "N/A".
           - The "suggestedVersion" must be a realistic Band 7.0 essay map sentence only.

        4. If Mode is 'whole':
           - The student has submitted a complete 3-sentence introduction. Evaluate all three parts.
           - Provide constructive feedback for "paraphraseFeedback", "thesisFeedback", and "essayMapFeedback" (2 sentences each, in British English).
           - Give a total estimated band score for the entire cohesive introduction.
           - The "suggestedVersion" must combine all three parts into a cohesive Band 7.0 introduction.

        Strict JSON Output Rule:
        You must output your response strictly as a JSON object. Do not write any markdown code blocks, backticks, or extra text. Output ONLY the raw JSON.
        The JSON object must have exactly these keys: "bandScore", "paraphraseFeedback", "thesisFeedback", "essayMapFeedback", "suggestedVersion".
        `;

        // TRIPLE-FALLBACK CHAIN WITH RECOVERY
        const modelsToTry = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
        let success = false;
        let text = "";
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting evaluation with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(systemInstruction);
                const response = await result.response;
                text = response.text().trim();
                
                if (text && text.trim() !== "") {
                    success = true;
                    console.log(`Success using model: ${modelName}`);
                    break; 
                }
            } catch (error) {
                console.warn(`Model ${modelName} failed. Error: ${error.message}`);
                lastError = error;
            }
        }

        if (!success) {
            throw new Error(`All fallback models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
        }

        // Clean up markdown code block wrappers
        text = text.replace(/```json/gi, '');
        text = text.replace(/```/g, '');
        text = text.trim();

        let parsedData;
        try {
            parsedData = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse AI response as JSON. Raw text:", text);
            parsedData = {
                bandScore: "Score Unavailable",
                paraphraseFeedback: "The AI processed your answer successfully, but the structured feedback format failed. Please try again.",
                thesisFeedback: "Failed to parse thesis data.",
                essayMapFeedback: "Failed to parse essay map data.",
                suggestedVersion: "Please refresh the page and try again."
            };
        }
        
        res.json(parsedData);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(200).json({ 
            bandScore: "Backend Error",
            paraphraseFeedback: `System Error: ${error.message}`,
            thesisFeedback: "Please check your server connection.",
            essayMapFeedback: "Please check your server connection.",
            suggestedVersion: "Ensure your Render service is running smoothly."
        });
    }
});

// FIXED PORT BINDING TYPO
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
