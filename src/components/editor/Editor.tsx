import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { editorThemes } from "@/resources/Themes"
import { FileSystemItem } from "@/types/file"
import { SocketEvent } from "@/types/socket"
import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs"
import CodeMirror, {
    Extension,
    ViewUpdate,
    scrollPastEnd,
} from "@uiw/react-codemirror"
import { EditorView } from "@codemirror/view"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { autocompletion, CompletionContext, startCompletion } from "@codemirror/autocomplete"
import axios from "axios"
import { collaborativeHighlighting, updateRemoteUsers } from "./collaborativeHighlighting"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { LuSparkles } from "react-icons/lu"

function Editor() {
    const { users, currentUser } = useAppContext()
    const { activeFile, setActiveFile } = useFileSystem()
    const { theme, language, fontSize } = useSettings()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    const { isMobile } = useWindowDimensions()
    const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))
    const filteredUsers = useMemo(
        () => users.filter((u) => u.username !== currentUser.username),
        [users, currentUser],
    )
    const [extensions, setExtensions] = useState<Extension[]>([])
    const editorRef = useRef<any>(null)
    const [lastCursorPosition, setLastCursorPosition] = useState<number>(0)
    const [lastSelection, setLastSelection] = useState<{start?: number, end?: number}>({})
    const cursorMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const onCodeChange = (code: string, view: ViewUpdate) => {
        if (!activeFile) return

        const file: FileSystemItem = { ...activeFile, content: code }
        setActiveFile(file)

        // Get cursor position and selection range
        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Emit cursor and selection data
        socket.emit(SocketEvent.TYPING_START, {
            cursorPosition,
            selectionStart,
            selectionEnd
        })
        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: code,
        })
        clearTimeout(timeOut)

        const newTimeOut = setTimeout(
            () => socket.emit(SocketEvent.TYPING_PAUSE),
            1000,
        )
        setTimeOut(newTimeOut)
    }

    // Handle cursor/selection changes without typing
    const handleSelectionChange = useCallback((view: ViewUpdate) => {
        if (!view.selectionSet) return

        const selection = view.state?.selection?.main
        const cursorPosition = selection?.head || 0
        const selectionStart = selection?.from
        const selectionEnd = selection?.to

        // Check if cursor or selection actually changed
        const cursorChanged = cursorPosition !== lastCursorPosition
        const selectionChanged = selectionStart !== lastSelection.start || selectionEnd !== lastSelection.end

        if (cursorChanged || selectionChanged) {
            setLastCursorPosition(cursorPosition)
            setLastSelection({ start: selectionStart, end: selectionEnd })

            // Clear existing timeout
            if (cursorMoveTimeoutRef.current) {
                clearTimeout(cursorMoveTimeoutRef.current)
            }

            // Debounce cursor move events
            cursorMoveTimeoutRef.current = setTimeout(() => {
                socket.emit(SocketEvent.CURSOR_MOVE, {
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                })
            }, 100) // 100ms debounce
        }
    }, [lastCursorPosition, lastSelection, socket])

    // Listen wheel event to zoom in/out and prevent page reload
    usePageEvents()

    useEffect(() => {
        const extensions = [
            color,
            hyperLink,
            collaborativeHighlighting(),
            EditorView.updateListener.of(handleSelectionChange),
            scrollPastEnd(),
        ]

        const aiCompletionSource = async (context: CompletionContext) => {
            if (!context.explicit) return null

            const word = context.matchBefore(/\w*/)
            const cursorPosition = context.pos
            const documentText = context.state.doc.toString()
            const codeBefore = documentText.substring(Math.max(0, cursorPosition - 500), cursorPosition)

            toast.loading(
                <div className="flex flex-col gap-1">
                    <span className="font-jetbrains text-xs text-primary">{"> [sys] Synthesizing code..."}</span>
                    <span className="font-jetbrains text-xs text-white/70">{"> [sys] Awaiting model consensus..."}</span>
                </div>, 
                { id: "autocomplete", duration: 10000 }
            )
            try {
                const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
                const response = await axios.post(`${BACKEND_URL}/api/copilot`, {
                    messages: [
                        {
                            role: "system",
                            content: "You are an AI code autocomplete extension. Your task is to provide the next logical lines of code based on the user's current cursor position and code context. ONLY return the code that should be inserted exactly at the cursor. DO NOT include markdown backticks (```) or language identifiers like ```javascript. Do not include explanations. Only output the raw code snippet."
                        },
                        { role: "user", content: `Code:\n${codeBefore}` }
                    ],
                    models: [
                        "openai/gpt-oss-120b:free",
                        "qwen/qwen3-coder:free",
                        "openrouter/free"
                    ],
                })
                
                toast.dismiss("autocomplete")
                const suggestion = response.data?.choices?.[0]?.message?.content
                if (suggestion) {
                    const cleanSuggestion = suggestion.replace(/^```[\w]*\n/, "").replace(/```$/, "").trim()
                    return {
                        from: word ? word.from : context.pos,
                        options: [
                            { label: cleanSuggestion.slice(0, 40) + "...", detail: "AI", info: cleanSuggestion, apply: cleanSuggestion, type: "text" }
                        ]
                    }
                }
            } catch (error) {
                console.error("AI Completion Error:", error)
                toast.dismiss()
                toast.error("Failed to fetch suggestion")
            }
            return null
        }

        extensions.push(autocompletion({ override: [aiCompletionSource] }))

        const langExt = loadLanguage(language.toLowerCase() as LanguageName)
        if (langExt) {
            extensions.push(langExt)
        } else {
            toast.error(
                "Syntax highlighting is unavailable for this language. Please adjust the editor settings; it may be listed under a different name.",
                {
                    duration: 5000,
                },
            )
        }

        setExtensions(extensions)
    }, [filteredUsers, language, handleSelectionChange])

    // Update remote users when filteredUsers changes
    useEffect(() => {
        if (editorRef.current?.view) {
            editorRef.current.view.dispatch({
                effects: updateRemoteUsers.of(filteredUsers)
            })
        }
    }, [filteredUsers])

    return (
        <div className="relative w-full" style={{ height: viewHeight }}>
            <CodeMirror
                ref={editorRef}
                theme={editorThemes[theme]}
                onChange={onCodeChange}
                value={activeFile?.content}
                extensions={extensions}
                minHeight="100%"
                maxWidth="100vw"
                style={{
                    fontSize: fontSize + "px",
                    height: "100%",
                }}
            />
            {isMobile ? (
                <button 
                    onClick={() => {
                        if (editorRef.current?.view) {
                            startCompletion(editorRef.current.view)
                        }
                    }}
                    className="absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-lg active:scale-95 transition-all"
                >
                    <LuSparkles className="animate-pulse" />
                    <span>Ask AI</span>
                </button>
            ) : (
                <div className="pointer-events-none absolute bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-primary/30 bg-darkHover/80 px-4 py-2 text-sm text-primary shadow-xl backdrop-blur-md">
                    <span>✨ Press <kbd className="rounded bg-primary/20 px-1.5 py-0.5 font-sans font-semibold text-white">Ctrl</kbd> + <kbd className="rounded bg-primary/20 px-1.5 py-0.5 font-sans font-semibold text-white">Space</kbd> for AI</span>
                </div>
            )}
        </div>
    )
}

export default Editor
