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

        // We completely avoid <p> tags and force visible, explicit colors inside <span> wrappers
        const systemInstruction = `
        You are a strict but encouraging IELTS examiner grading a Task 2 essay introduction. 
        Original Essay Prompt: "${prompt}"
        Student's Paraphrased Introduction: "${studentAnswer}"
        
        Provide your feedback in HTML format. You MUST use the exact template below, including all style attributes. Keep the !important declarations on every single element.
        
        <div style="color: #000000 !important; font-family: sans-serif !important; line-height: 1.6 !important; text-align: left !important; display: block !important;">
            <div style="color: #1e3a8a !important; font-size: 1.25rem !important; font-weight: bold !important; margin-top: 0 !important; margin-bottom: 20px !important; display: block !important;">
                Estimated Band Score for Paraphrasing: [Insert Score]
            </div>
            
            <div style="margin-top: 10px !important; margin-bottom: 12px !important; color: #000000 !important; font-size: 15px !important; display: block !important; line-height: 1.6 !important;">
                <span style="color: #1e3a8a !important; font-weight: bold !important; display: inline !important;">• Meaning Accuracy:</span> 
                <span style="color: #1f2937 !important; display: inline !important;">[Write 2-3 detailed sentences of feedback here]</span>
            </div>
            
            <div style="margin-bottom: 12px !important; color: #000000 !important; font-size: 15px !important; display: block !important; line-height: 1.6 !important;">
                <span style="color: #1e3a8a !important; font-weight: bold !important; display: inline !important;">• Lexical Resource:</span> 
                <span style="color: #1f2937 !important; display: inline !important;">[Write 2-3 detailed sentences of feedback here]</span>
            </div>
            
            <div style="margin-bottom: 20px !important; color: #000000 !important; font-size: 15px !important; display: block !important; line-height: 1.6 !important;">
                <span style="color: #1e3a8a !important; font-weight: bold !important; display: inline !important;">• Grammatical Range:</span> 
                <span style="color: #1f2937 !important; display: inline !important;">[Write 2-3 detailed sentences of feedback here]</span>
            </div>
            
            <div style="background-color: #e8f4f8 !important; padding: 15px !important; border-left: 4px solid #3b82f6 !important; margin-top: 20px !important; border-radius: 4px !important; color: #1e3a8a !important; display: block !important; font-size: 15px !important;">
                <span style="color: #1e3a8a !important; font-weight: bold !important; display: block !important; margin-bottom: 5px !important;">Suggested Improved Version:</span>
                <span style="color: #1e3a8a !important; display: block !important; font-style: italic !important;">[Provide one perfect Band 9 example here]</span>
            </div>
        </div>

        CRITICAL REQUIREMENT: Do NOT wrap the HTML output in markdown code blocks like \`\`\`html or \`\`\`. Output ONLY the raw HTML.
        `;

        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        let text = response.text();

        // Safety scissors: Strip any accidental markdown blocks
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
