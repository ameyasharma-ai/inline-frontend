import { useFileSystem } from "@/context/FileContext"
import { getIconClassName } from "@/utils/getIconClassName"
import { Icon } from "@iconify/react"
import { IoClose, IoPlay } from "react-icons/io5"
import cn from "classnames"
import { useEffect, useRef } from "react"
import customMapping from "@/utils/customMapping"
import { useSettings } from "@/context/SettingContext"
import langMap from "lang-map"
import { useRunCode } from "@/context/RunCodeContext"
import { useViews } from "@/context/ViewContext"
import { VIEWS } from "@/types/view"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { USER_STATUS } from "@/types/user"
import { useNavigate } from "react-router-dom"
import { GoSignOut } from "react-icons/go"

function FileTab() {
    const {
        openFiles,
        closeFile,
        activeFile,
        updateFileContent,
        setActiveFile,
    } = useFileSystem()
    const fileTabRef = useRef<HTMLDivElement>(null)
    const { setLanguage } = useSettings()
    const { runCode } = useRunCode()
    const { setActiveView } = useViews()
    const { setStatus } = useAppContext()
    const { socket } = useSocket()
    const navigate = useNavigate()

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(USER_STATUS.DISCONNECTED)
        navigate("/", { replace: true })
    }

    const changeActiveFile = (fileId: string) => {
        // If the file is already active, do nothing
        if (activeFile?.id === fileId) return

        updateFileContent(activeFile?.id || "", activeFile?.content || "")

        const file = openFiles.find((file) => file.id === fileId)
        if (file) {
            setActiveFile(file)
        }
    }

    useEffect(() => {
        const fileTabNode = fileTabRef.current
        if (!fileTabNode) return

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY > 0) {
                fileTabNode.scrollLeft += 100
            } else {
                fileTabNode.scrollLeft -= 100
            }
        }

        fileTabNode.addEventListener("wheel", handleWheel)

        return () => {
            fileTabNode.removeEventListener("wheel", handleWheel)
        }
    }, [])

    // Update the editor language when a file is opened
    useEffect(() => {
        if (activeFile?.name === undefined) return
        // Get file extension on file open and set language when file is opened
        const extension = activeFile.name.split(".").pop()
        if (!extension) return

        // Check if custom mapping exists
        if (customMapping[extension]) {
            setLanguage(customMapping[extension])
            return
        }

        const language = langMap.languages(extension)
        setLanguage(language[0])
    }, [activeFile?.name, setLanguage])

    return (
        <div
            className="flex h-[50px] w-full select-none gap-2 overflow-x-auto p-2 pb-0 scrollbar-hide border-b border-white/5"
            ref={fileTabRef}
        >
            {openFiles.map((file) => (
                <span
                    key={file.id}
                    className={cn(
                        "flex w-fit cursor-pointer items-center rounded-t-lg px-4 py-2 transition-all duration-200",
                        { 
                            "bg-white/5 text-light border-t-2 border-primary": file.id === activeFile?.id,
                            "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-t-2 border-transparent": file.id !== activeFile?.id
                        },
                    )}
                    onClick={() => changeActiveFile(file.id)}
                >
                    <Icon
                        icon={getIconClassName(file.name)}
                        fontSize={22}
                        className={cn("mr-2 min-w-fit", {
                            "drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]": file.id === activeFile?.id
                        })}
                    />
                    <p
                        className="flex-grow cursor-pointer overflow-hidden truncate font-inter text-sm font-medium"
                        title={file.name}
                    >
                        {file.name}
                    </p>
                    <IoClose
                        className="ml-3 inline rounded-md p-0.5 transition-colors hover:bg-white/10 hover:text-danger"
                        size={18}
                        onClick={(e) => {
                            e.stopPropagation()
                            closeFile(file.id)
                        }}
                    />
                </span>
            ))}
            <div className="flex flex-grow items-center justify-end gap-2 px-2 pr-14">
                <button
                    className="flex items-center gap-1 rounded-md bg-white/5 px-3 py-1 text-sm font-medium text-light transition-all hover:bg-white/10 active:scale-95"
                    onClick={() => {
                        setActiveView(VIEWS.RUN)
                        runCode()
                    }}
                    title="Run Active File"
                >
                    <IoPlay size={18} className="text-primary" />
                    <span>Run</span>
                </button>
                <button
                    className="flex items-center gap-1 rounded-md bg-danger/10 px-3 py-1 text-sm font-medium text-danger transition-all hover:bg-danger/20 active:scale-95"
                    onClick={leaveRoom}
                    title="Logout / Leave Room"
                >
                    <GoSignOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}

export default FileTab
