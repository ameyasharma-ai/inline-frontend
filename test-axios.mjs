import axios from "axios"

const test = async () => {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            messages: [{ role: "user", content: "hi" }],
            models: ["openai/gpt-oss-120b:free", "qwen/qwen3-coder:free"],
        }, {
            headers: {
                "Authorization": "Bearer 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",
                "Content-Type": "application/json"
            }
        })
        console.log("SUCCESS:", response.data)
    } catch (e) {
        console.error("ERROR:", e.response?.data || e.message)
    }
}
test()
