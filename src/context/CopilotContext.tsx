import { ICopilotContext } from "@/types/copilot"
import { createContext, ReactNode, useContext, useState } from "react"
import toast from "react-hot-toast"
import axios from "axios"

const CopilotContext = createContext<ICopilotContext | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useCopilot = () => {
    const context = useContext(CopilotContext)
    if (context === null) {
        throw new Error(
            "useCopilot must be used within a CopilotContextProvider",
        )
    }
    return context
}

const CopilotContextProvider = ({ children }: { children: ReactNode }) => {
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)

    const generateCode = async () => {
        try {
            if (input.length === 0) {
                toast.error("Please write a prompt")
                return
            }

            toast.loading("Generating code...")
            setIsRunning(true)
            
            setOutput("> [sys] Initiating secure connection to OpenRouter...\n> [sys] Bypassing legacy API nodes...\n> [sys] Routing through neural network fallback cascade:\n>   -> [1] openai/gpt-oss-120b:free\n>   -> [2] qwen/qwen3-coder:free\n>   -> [3] meta-llama/llama-3.3-70b-instruct:free\n> [sys] Awaiting model consensus...")

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const response = await axios.post(`${BACKEND_URL}/api/copilot`, {
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a code generator copilot for project named InLine. Generate code based on the given prompt without any explanation. Return only the code, formatted in Markdown using the appropriate language syntax (e.g., js for JavaScript, py for Python). Do not include any additional text or explanations. If you don't know the answer, respond with 'I don't know'.",
                    },
                    {
                        role: "user",
                        content: input,
                    },
                ],
                models: [
                    "openai/gpt-oss-120b:free",
                    "qwen/qwen3-coder:free",
                    "openrouter/free"
                ],
            })
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                toast.success("Code generated successfully")
                const code = response.data.choices[0].message.content
                if (code) setOutput(code)
            }
            setIsRunning(false)
            toast.dismiss()
        } catch (error: any) {
            console.error(error)
            const errorMsg = error.response?.data?.error?.message || error.message || "Unknown error"
            setOutput(`> [error] CRITICAL FAILURE IN NEURAL LINK.\n> [error] Handshake terminated.\n> [error] Details: ${errorMsg}\n> [sys] Aborting operation.`)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to generate the code")
        }
    }

    return (
        <CopilotContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                generateCode,
            }}
        >
            {children}
        </CopilotContext.Provider>
    )
}

export { CopilotContextProvider }
export default CopilotContext
