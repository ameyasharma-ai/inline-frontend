import axios from "axios"
import { Language, RunContext as RunContextType } from "@/types/run"
import langMap from "lang-map"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext<RunContextType | null>(null)

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })

    useEffect(() => {
        const fetchSupportedLanguages = async () => {
            try {
                const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
                const languages = await axios.get(`${BACKEND_URL}/api/languages`)
                const targetLanguages = [
                    { search: "javascript (node", label: "JavaScript" },
                    { search: "typescript (5", label: "TypeScript" },
                    { search: "python (3", label: "Python" },
                    { search: "c++ (g", label: "C++" },
                    { search: "java (jdk", label: "Java" },
                ]
                
                const mapped: Language[] = []
                for (const target of targetLanguages) {
                    const match = languages.data.find((l: any) => l.name.toLowerCase().startsWith(target.search))
                    if (match) {
                        mapped.push({
                            language: target.label,
                            version: match.id.toString(),
                            aliases: [target.search, match.name.toLowerCase(), target.search === "c++" ? "cpp" : target.search]
                        })
                    }
                }
                setSupportedLanguages(mapped)
            } catch (error: any) {
                toast.error("Failed to fetch supported languages")
                if (error?.response?.data) console.error(error?.response?.data)
            }
        }

        fetchSupportedLanguages()
    }, [])

    // Set the selected language based on the file extension
    useEffect(() => {
        if (supportedLanguages.length === 0 || !activeFile?.name) return

        const extension = activeFile.name.split(".").pop()
        if (extension) {
            const languageName = langMap.languages(extension)
            const language = supportedLanguages.find(
                (lang) =>
                    lang.aliases.includes(extension) ||
                    languageName.includes(lang.language.toLowerCase()),
            )
            if (language) setSelectedLanguage(language)
        } else setSelectedLanguage({ language: "", version: "", aliases: [] })
    }, [activeFile?.name, supportedLanguages])

    const runCode = async () => {
        try {
            if (!selectedLanguage) {
                return toast.error("Please select a language to run the code")
            } else if (!activeFile) {
                return toast.error("Please open a file to run the code")
            } else {
                toast.loading("Running code...")
            }

            setIsRunning(true)
            const { language, version } = selectedLanguage

            const encodeBase64 = (str: string) => btoa(unescape(encodeURIComponent(str || "")))
            const decodeBase64 = (str: string) => {
                if (!str) return ""
                try {
                    return decodeURIComponent(escape(atob(str)))
                } catch {
                    return atob(str)
                }
            }

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
            const response = await axios.post(`${BACKEND_URL}/api/submissions`, {
                source_code: encodeBase64(activeFile.content),
                language_id: parseInt(version),
                stdin: encodeBase64(input),
            })
            
            if (response.data.stderr) {
                setOutput(decodeBase64(response.data.stderr))
            } else if (response.data.compile_output) {
                setOutput(decodeBase64(response.data.compile_output))
            } else if (response.data.stdout !== null) {
                setOutput(decodeBase64(response.data.stdout))
            } else {
                setOutput(response.data.message || "Execution finished with no output.")
            }
            setIsRunning(false)
            toast.dismiss()
        } catch (error: any) {
            console.error(error.response?.data || error.message)
            setIsRunning(false)
            toast.dismiss()
            toast.error(error.response?.data?.error || "Failed to run the code")
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext
