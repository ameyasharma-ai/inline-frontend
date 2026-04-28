import { useAppContext } from "@/context/AppContext"
import { useChatRoom } from "@/context/ChatContext"
import { SyntheticEvent, useEffect, useRef } from "react"

function ChatList() {
    const {
        messages,
        isNewMessage,
        setIsNewMessage,
        lastScrollHeight,
        setLastScrollHeight,
    } = useChatRoom()
    const { currentUser } = useAppContext()
    const messagesContainerRef = useRef<HTMLDivElement | null>(null)

    const handleScroll = (e: SyntheticEvent) => {
        const container = e.target as HTMLDivElement
        setLastScrollHeight(container.scrollTop)
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        if (!messagesContainerRef.current) return
        messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight
    }, [messages])

    useEffect(() => {
        if (isNewMessage) {
            setIsNewMessage(false)
        }
        if (messagesContainerRef.current)
            messagesContainerRef.current.scrollTop = lastScrollHeight
    }, [isNewMessage, setIsNewMessage, lastScrollHeight])

    return (
        <div
            className="flex-grow overflow-auto rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm"
            ref={messagesContainerRef}
            onScroll={handleScroll}
        >
            {/* Chat messages */}
            {messages.map((message, index) => {
                return (
                    <div
                        key={index}
                        className={
                            "mb-3 w-[85%] self-end break-words rounded-2xl px-4 py-2 shadow-sm " +
                            (message.username === currentUser.username
                                ? " ml-auto bg-gradient-to-br from-primary/80 to-accent/80 text-white rounded-br-none"
                                : " bg-white/10 text-gray-100 rounded-bl-none border border-white/5")
                        }
                    >
                        <div className="flex justify-between">
                            <span className={"text-[10px] font-semibold tracking-wider uppercase " + (message.username === currentUser.username ? "text-white/80" : "text-primary/90")}>
                                {message.username}
                            </span>
                            <span className="text-[10px] text-white/50">
                                {message.timestamp}
                            </span>
                        </div>
                        <p className="py-1">{message.message}</p>
                    </div>
                )
            })}
        </div>
    )
}

export default ChatList
