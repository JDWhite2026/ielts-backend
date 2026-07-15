const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/evaluate', async (req, res) => {
    try {
        const { prompt, studentAnswer } = req.body;
        
        // 1. Use the fastest model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // 2. Lower safety filters so it doesn't block IELTS topics like "crime"
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        // 3. The Strict IELTS Examiner Prompt
        const systemInstruction = `
        You are a strict but encouraging IELTS examiner grading a Task 2 essay introduction. 
        Original Essay Prompt: "${prompt}"
        Student's Paraphrased Introduction: "${studentAnswer}"
        
        Provide your feedback in HTML format so it looks beautiful on a webpage. Use bolding and bullet points. 
        Structure your response exactly like this:
        
        <h4 style="color: #1e3a8a; margin-bottom: 5px;">Estimated Band Score for Paraphrasing: [Insert Score]</h4>
        
        <ul style="margin-top: 10px;">
            <li style="margin-bottom: 8px;"><b>Meaning Accuracy:</b> [Did they change the meaning or add outside opinions?]</li>
            <li style="margin-bottom: 8px;"><b>Lexical Resource (Vocabulary):</b> [Did they use good synonyms? Did they force words that don't fit?]</li>
            <li style="margin-bottom: 8px;"><b>Grammatical Range:</b> [Did they change the sentence structure, or just swap words?]</li>
        </ul>
        
        <div style="background-color: #e8f4f8; padding: 10px; border-left: 4px solid #3b82f6; margin-top: 15px;">
            <b>Suggested Improved Version:</b> <br>
            [Provide one perfect Band 9 example here]
        </div>
        `;

        // 4. Generate the feedback
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: systemInstruction }]}],
            safetySettings
        });
        
        const response = result.response;
        const text = response.text();
        
        // 5. Send it back to LearnWorlds
        res.json({ feedback: text });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ feedback: `<span style="color: red;">Server Error: ${error.message}</span>` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
