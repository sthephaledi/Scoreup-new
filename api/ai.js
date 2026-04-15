export const config = {
    api: {
        bodyParser: true,
    },
};


export default async function handler(req, res) {
    console.log("FULL BODY:", req.body);
    console.log("REQUEST RECEIVED:", req.body);

    const msg = req.body?.msg;
    const grade = req.body?.grade;

    console.log("msg:", msg);
    console.log("grade:", grade);

    console.log("msg:", msg);
    console.log("grade:", grade);
    console.log("API KEY exists:", !!process.env.DEEPSEEK_KEY);


    try {
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

You must:
- Teach according to CAPS curriculum
- Use simple English
- Keep answers short and clear
- Stay strictly on academic topics

If the student asks for past papers or memos, direct them here:
https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations.aspx`
                    },
                    {
                        role: "user",
                        content: msg?.topic || msg
                    }
                ]
            })
        });

        const data = await response.json();
        console.log("DEEPSEEK RESPONSE:", JSON.stringify(data));

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