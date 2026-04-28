import { useRunCode } from "@/context/RunCodeContext"
import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import { ChangeEvent } from "react"
import toast from "react-hot-toast"
import { LuCopy } from "react-icons/lu"
import { PiCaretDownBold } from "react-icons/pi"

function RunView() {
    const { viewHeight } = useResponsive()
    const { openFiles, activeFile, setActiveFile } = useFileSystem()
    const {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
    } = useRunCode()

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const lang = JSON.parse(e.target.value)
        setSelectedLanguage(lang)
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied to clipboard")
    }

    return (
        <div
            className="flex flex-col items-center gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Run Code</h1>
            <div className="flex h-[90%] w-full flex-col items-end gap-2 md:h-[92%]">
                <div className="relative w-full">
                    <select
                        className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-light outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                        value={activeFile?.id || ""}
                        onChange={(e) => {
                            const fileId = e.target.value
                            const file = openFiles.find((f) => f.id === fileId)
                            if (file) setActiveFile(file)
                        }}
                    >
                        {openFiles.length === 0 ? (
                            <option className="bg-[#1e1e2e] text-white" value="">No files open</option>
                        ) : (
                            openFiles.map((file) => (
                                <option className="bg-[#1e1e2e] text-white" key={file.id} value={file.id}>
                                    {file.name}
                                </option>
                            ))
                        )}
                    </select>
                    <PiCaretDownBold
                        size={16}
                        className="pointer-events-none absolute bottom-3.5 right-4 z-10 text-white/70"
                    />
                </div>
                <div className="relative w-full">
                    <select
                        className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-light outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                        value={JSON.stringify(selectedLanguage)}
                        onChange={handleLanguageChange}
                    >
                        {supportedLanguages
                            .sort((a, b) => (a.language > b.language ? 1 : -1))
                            .map((lang, i) => {
                                return (
                                    <option
                                        className="bg-[#1e1e2e] text-white"
                                        key={i}
                                        value={JSON.stringify(lang)}
                                    >
                                        {lang.language +
                                            (lang.version
                                                ? ` (${lang.version})`
                                                : "")}
                                    </option>
                                )
                            })}
                    </select>
                    <PiCaretDownBold
                        size={16}
                        className="pointer-events-none absolute bottom-3.5 right-4 z-10 text-white/70"
                    />
                </div>
                <textarea
                    className="min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-light outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                    placeholder="Write your input here..."
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    className="mt-2 flex w-full justify-center rounded-xl bg-gradient-to-r from-primary to-accent p-3 font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                    onClick={runCode}
                    disabled={isRunning}
                >
                    Run Code
                </button>
                <label className="flex w-full justify-between">
                    Output :
                    <button onClick={copyOutput} title="Copy Output">
                        <LuCopy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </label>
                <div className="w-full flex-grow resize-none overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4 text-light outline-none backdrop-blur-sm shadow-inner">
                    <code className="font-jetbrains text-sm">
                        <pre className="text-wrap">{output}</pre>
                    </code>
                </div>
            </div>
        </div>
    )
}

export default RunView
