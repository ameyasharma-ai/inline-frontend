import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import cn from "classnames"
import Editor from "./Editor"
import FileTab from "./FileTab"

function EditorComponent() {
    const { openFiles } = useFileSystem()
    const { minHeightReached } = useResponsive()

    if (openFiles.length <= 0) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background transition-colors duration-300">
                <div className="flex flex-col items-center justify-center opacity-50 transition-opacity hover:opacity-100">
                    <div className="h-24 w-24 rounded-full bg-primary/20 blur-3xl absolute animate-pulse"></div>
                    <h1 className="z-10 font-outfit text-3xl font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-600">
                        No file is currently open.
                    </h1>
                    <p className="z-10 mt-2 font-inter text-sm text-gray-500">Select a file from the sidebar to begin editing</p>
                </div>
            </div>
        )
    }

    return (
        <main
            className={cn("flex w-full flex-col overflow-x-auto md:h-screen bg-background transition-colors duration-300", {
                "h-[calc(100vh-60px)]": !minHeightReached,
                "h-full": minHeightReached,
            })}
        >
            <FileTab />
            <Editor />
        </main>
    )
}

export default EditorComponent
