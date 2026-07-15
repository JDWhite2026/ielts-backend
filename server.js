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
        
        // Pointing to Google's active, stable model
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

        const systemInstruction = `
        You are a strict but encouraging IELTS examiner grading a Task 2 essay introduction. 
        Original Essay Prompt: "${prompt}"
        Student's Paraphrased Introduction: "${studentAnswer}"
        
        Provide your feedback in HTML format so it looks beautiful on a webpage. Use bolding and bullet points. 
        Structure your response exactly like this:
        
        <h4 style="color: #1e3a8a; margin-bottom: 5px;">Estimated Band Score for Paraphrasing: [Insert Score]</h4>
        
        <ul style="margin-top: 10px;">
            <li style="margin-bottom: 8px;"><b>Meaning Accuracy:</b> [Feedback here]</li>
            <li style="margin-bottom: 8px;"><b>Lexical Resource:</b> [Feedback here]</li>
            <li style="margin-bottom: 8px;"><b>Grammatical Range:</b> [Feedback here]</li>
        </ul>
        
        <div style="background-color: #e8f4f8; padding: 10px; border-left: 4px solid #3b82f6; margin-top: 15px;">
            <b>Suggested Improved Version:</b> <br>
            [Provide one perfect Band 9 example here]
        </div>
        `;

        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        const text = response.text();

        if (!text || text.trim() === "") {
            return res.json({ feedback: `The AI processed your answer successfully, but returned an empty response.` });
        }
        
        res.json({ feedback: text });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(200).json({ feedback: `<span style="color: red; font-weight: bold;">BACKEND CRASH REPORT: ${error.message}</span>` });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
