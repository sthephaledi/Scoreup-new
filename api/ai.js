export const config = {
api: {
bodyParser: true,
},
};

export default async function handler(req, res) {
console.log("REQUEST RECEIVED:", req.body);

const msg = req.body?.msg;
const grade = req.body?.grade;
const subject = req.body?.subject || '';
const history = req.body?.history || [];

console.log("msg:", msg);
console.log("grade:", grade);
console.log("subject:", subject);
console.log("API KEY exists:", !!process.env.DEEPSEEK_KEY);

try {
// Build history messages for Deepseek
const historyMessages = history.map(m => ({
role: m.role === 'ai' ? 'assistant' : 'user',
content: m.text
}));

const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${process.env.DEEPSEEK_KEY}`,
},
body: JSON.stringify({
model: "deepseek-chat",
messages: [
{
role: "system",
content: `You are ScoreUp, an AI CAPS tutor for South African Grade ${grade} students.
${subject ? `The student is currently studying: ${subject}. Stay focused on ${subject} unless they explicitly ask to change subject.` : 'Wait for the student to tell you what subject they are studying.'}

You must:
- Teach according to CAPS curriculum
- Use simple English
- Keep answers short and clear
- Stay strictly on the current subject
- Never randomly switch to another subject or ask about unrelated topics
- If student asks for a quiz, only quiz them on ${subject || 'the subject they mentioned'}

If the student asks for past papers or memos, direct them here:
https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx`
},
// Inject last 10 messages of history
...historyMessages,
// Current message
{
role: "user",
content: msg
}
],
}),
});

const data = await response.json();
console.log("DEEPSEEK RESPONSE:", JSON.stringify(data));
if (data.error) console.log("DEEPSEEK ERROR DETAIL:", data.error.message, data.error.code);

const reply =
data?.choices?.[0]?.message?.content || "No response from AI";

return res.status(200).json({
reply
});

} catch (err) {
console.error("AI ERROR:", err);
return res.status(500).json({
error: err.message,
full: JSON.stringify(err)
});
}
}