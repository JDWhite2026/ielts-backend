const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/evaluate', async (req, res) => {
    try {
        const { prompt, studentAnswer, mode } = req.body; // Safely destructure the selected focus mode
        
        const systemInstruction = `
        You are an expert IELTS examiner grading an Academic Task 2 essay introduction component.
        Original Essay Prompt: "${prompt}"
        Student's Submitted Text: "${studentAnswer}"
        The student has chosen to practice ONLY this element: "${mode || 'whole'}" (Options: 'paraphrase', 'thesis', 'map', 'whole').

        Your feedback MUST target ONLY the element they are practicing. 
        - If they chose 'paraphrase', assess if they swapped key words and flipped grammar structure accurately without altering the core meaning of the essay prompt.
        - If they chose 'thesis', assess if they declared a clear, direct stance/opinion addressing the prompt's question.
        - If they chose 'map', assess if they clearly outlined what their body paragraphs will discuss.
        - If they chose 'whole', evaluate all three elements sequentially.

        You MUST output your response strictly as a JSON object. 
        Do not write any markdown code blocks, backticks, or extra text. Output ONLY the raw JSON.
        Write your feedback in natural British English.

        The JSON object must have exactly these keys:
        {
          "bandScore": "[Insert Estimated Band Score for the submitted text, e.g. Band 7.0]",
          "paraphraseFeedback": "[Only write feedback here if the student practiced 'paraphrase' or 'whole'. Otherwise, output exactly 'N/A']",
          "thesisFeedback": "[Only write feedback here if the student practiced 'thesis' or 'whole'. Otherwise, output exactly 'N/A']",
          "essayMapFeedback": "[Only write feedback here if the student practiced 'map' or 'whole'. Otherwise, output exactly 'N/A']",
          "suggestedVersion": "[Provide a realistic, high-quality, cohesive Band 7.0 model version of ONLY the element they practiced in British English. If they practiced 'whole', provide the entire 3-sentence introduction.]"
        }
        `;

        // TRIPLE-FALLBACK CHAIN FOR 100% UPTIME
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
                console.warn(`Model ${modelName} failed. Trying backup...`);
                lastError = error;
            }
        }

        if (!success) {
            throw new Error(`All fallback models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
        }

        // Clean up any accidental markdown wrappers
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

const PORT = process.env.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
