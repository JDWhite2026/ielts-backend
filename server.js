const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/evaluate', async (req, res) => {
    try {
        const { prompt, studentAnswer } = req.body;
        
        const systemInstruction = `
        You are a strict but encouraging IELTS examiner grading a Task 2 essay introduction. 
        Original Essay Prompt: "${prompt}"
        Student's Paraphrased Introduction: "${studentAnswer}"
        
        Evaluate the student's response. You MUST output your response strictly as a JSON object. 
        Do not write any markdown code blocks, backticks, or extra text. Output ONLY the raw JSON.

        The JSON object must have exactly these keys:
        {
          "bandScore": "[Insert Estimated Band Score, e.g., Band 6.5]",
          "meaningAccuracy": "[Your detailed 2-3 sentence evaluation of meaning accuracy]",
          "lexicalResource": "[Your detailed 2-3 sentence evaluation of vocabulary and synonyms]",
          "grammaticalRange": "[Your detailed 2-3 sentence evaluation of grammar]",
          "suggestedVersion": "[Provide a realistic, high-quality Band 7.0 paraphrased version here. It should be natural, clear, grammatically correct, and use solid academic vocabulary that is highly achievable for an upper-intermediate student. Avoid overly complex, obscure structures.]"
        }
        `;

        // 🛡️ TRIPLE-FALLBACK CHAIN
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
                console.warn(`Model ${modelName} encountered an error: ${error.message}. Trying backup...`);
                lastError = error;
            }
        }

        if (!success) {
            throw new Error(`All fallback models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
        }

        // Clean up markdown code block wrappers if the AI accidentally generated them
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
                meaningAccuracy: "The AI returned a response that could not be parsed. Please try submitting your answer again.",
                lexicalResource: "Error parsing data.",
                grammaticalRange: "Error parsing data.",
                suggestedVersion: "Please refresh the page and try again."
            };
        }
        
        res.json(parsedData);

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(200).json({ 
            bandScore: "Backend Error",
            meaningAccuracy: `System Error: ${error.message}`,
            lexicalResource: "Please check your server connection.",
            grammaticalRange: "Please check your server connection.",
            suggestedVersion: "Ensure your Render service is running smoothly."
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
