const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors()); // You can restrict this to your LearnWorlds URL later
app.use(express.json());

// Notice we are NOT pasting the key directly here anymore for security
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/evaluate', async (req, res) => {
    try {
        const { prompt, studentAnswer } = req.body;
        
        const systemPrompt = `You are an expert IELTS examiner. Evaluate this paraphrase of the following prompt: "${prompt}". Focus on Accuracy of Meaning, Synonym Use, and Grammar Structure. Format the output in HTML.`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`${systemPrompt}\n\nStudent Answer: ${studentAnswer}`);
        
        res.json({ feedback: result.response.text() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to connect to AI" });
    }
});

// Render provides the PORT automatically
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
