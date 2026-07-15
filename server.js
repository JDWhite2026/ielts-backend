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
        
        const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

        // We use highly protected HTML paragraphs instead of bullet lists, forcing dark colors with !important
        const systemInstruction = `
        You are a strict but encouraging IELTS examiner grading a Task 2 essay introduction. 
        Original Essay Prompt: "${prompt}"
        Student's Paraphrased Introduction: "${studentAnswer}"
        
        Provide your feedback in HTML format. You MUST use the exact template below, including all style attributes. Keep the !important declarations.
        
        <div style="color: #1f2937 !important; font-family: sans-serif; line-height: 1.6; text-align: left;">
            <p style="color: #1e3a8a !important; font-size: 1.2rem; font-weight: bold; margin-top: 0; margin-bottom: 15px; display: block !important;">
                Estimated Band Score for Paraphrasing: [Insert Score]
            </p>
            
            <p style="margin: 8px 0 !important; color: #1f2937 !important; display: block !important;">
                <b style="color: #111827 !important;">• Meaning Accuracy:</b> [Feedback here]
            </p>
            <p style="margin: 8px 0 !important; color: #1f2937 !important; display: block !important;">
                <b style="color: #111827 !important;">• Lexical Resource:</b> [Feedback here]
            </p>
            <p style="margin: 8px 0 !important; color: #1f2937 !important; display: block !important;">
                <b style="color: #111827 !important;">• Grammatical Range:</b> [Feedback here]
            </p>
            
            <div style="background-color: #e8f4f8 !important; padding: 15px !important; border-left: 4px solid #3b82f6 !important; margin-top: 20px !important; border-radius: 4px !important; color: #1e3a8a !important; display: block !important;">
                <b style="color: #1e3a8a !important;">Suggested Improved Version:</b><br>
                <span style="color: #1e3a8a !important; display: inline-block; margin-top: 5px;">[Provide one perfect Band 9 example here]</span>
            </div>
        </div>

        CRITICAL REQUIREMENT: Do NOT wrap the HTML output in markdown code blocks like \`\`\`html or \`\`\`. Output ONLY the raw HTML.
        `;

        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        let text = response.text();

        // Strip any accidental markdown wrappers
        text = text.replace(/```html/gi, '');
        text = text.replace(/```/g, '');
        text = text.trim();

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
