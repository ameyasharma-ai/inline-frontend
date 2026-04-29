import { DrawingData } from "@/types/app"
import {
    SocketContext as SocketContextType,
    SocketEvent,
    SocketId,
} from "@/types/socket"
import { RemoteUser, USER_STATUS, User } from "@/types/user"
import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from "react"
import { toast } from "react-hot-toast"
import { Socket, io } from "socket.io-client"
import { useAppContext } from "./AppContext"

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext)
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider")
    }
    return context
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

const SocketProvider = ({ children }: { children: ReactNode }) => {
    const {
        setUsers,
        setStatus,
        currentUser,
        setCurrentUser,
        drawingData,
        setDrawingData,
    } = useAppContext()
    const socket: Socket = useMemo(
        () =>
            io(BACKEND_URL, {
                reconnectionAttempts: 2,
            }),
        [],
    )

    // Store latest state in refs for reconnect handler
    const currentUserRef = useRef(currentUser)
    const statusRef = useRef(status)

    useEffect(() => {
        currentUserRef.current = currentUser
        statusRef.current = status
    }, [currentUser, status])

    const handleError = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any) => {
            console.log("socket error", err)
            setStatus(USER_STATUS.CONNECTION_FAILED)
            toast.dismiss()
            toast.error(
                "The server is currently initializing. Please allow up to 60 seconds for the service to start and try again.",
                { id: "server-connection", duration: Infinity }
            )
        },
        [setStatus],
    )

    const handleUsernameExist = useCallback(() => {
        toast.dismiss()
        setStatus(USER_STATUS.INITIAL)
        toast.error(
            "The username you chose already exists in the room. Please choose a different username.",
        )
    }, [setStatus])

    const handleJoinError = useCallback(({ error }: { error: string }) => {
        toast.dismiss()
        setStatus(USER_STATUS.INITIAL)
        toast.error(error)
    }, [setStatus])

    const handleJoiningAccept = useCallback(
        ({ user, users }: { user: User; users: RemoteUser[] }) => {
            setCurrentUser({ ...user, password: currentUser.password })
            setUsers(users)
            toast.dismiss()
            setStatus(USER_STATUS.JOINED)

            if (users.length > 1) {
                toast.loading("Syncing data, please wait...")
                // Fallback: if no existing user responds within 3 seconds, dismiss the toast
                setTimeout(() => {
                    toast.dismiss()
                }, 3000)
            }
        },
        [currentUser.password, setCurrentUser, setStatus, setUsers],
    )

    const handleUserJoined = useCallback(
        ({ user }: { user: RemoteUser }) => {
            toast.success(`${user.username} joined the room`)
            setUsers((prev) => [...prev, user])
        },
        [setUsers],
    )

    const handleUserLeft = useCallback(
        ({ user }: { user: RemoteUser }) => {
            toast.success(`${user.username} left the room`)
            setUsers((prev) => prev.filter((u) => u.username !== user.username))
        },
        [setUsers],
    )

    const handleRequestDrawing = useCallback(
        ({ socketId }: { socketId: SocketId }) => {
            socket.emit(SocketEvent.SYNC_DRAWING, { socketId, drawingData })
        },
        [drawingData, socket],
    )

    const handleDrawingSync = useCallback(
        ({ drawingData }: { drawingData: DrawingData }) => {
            setDrawingData(drawingData)
        },
        [setDrawingData],
    )

    // Use refs for handlers to avoid re-attaching listeners when state changes
    const handlersRef = useRef({
        handleError,
        handleUsernameExist,
        handleJoinError,
        handleJoiningAccept,
        handleUserJoined,
        handleUserLeft,
        handleRequestDrawing,
        handleDrawingSync,
    })

    useEffect(() => {
        handlersRef.current = {
            handleError,
            handleUsernameExist,
            handleJoinError,
            handleJoiningAccept,
            handleUserJoined,
            handleUserLeft,
            handleRequestDrawing,
            handleDrawingSync,
        }
    }, [handleDrawingSync, handleError, handleJoinError, handleJoiningAccept, handleRequestDrawing, handleUserJoined, handleUserLeft, handleUsernameExist])

    useEffect(() => {
        const handleConnect = () => {
            toast.dismiss("server-connection")
            if (statusRef.current === USER_STATUS.JOINED && currentUserRef.current.roomId) {
                socket.emit(SocketEvent.JOIN_REQUEST, currentUserRef.current)
            }
        }

        socket.on("connect", handleConnect)
        socket.on("connect_error", (err) => handlersRef.current.handleError(err))
        socket.on("connect_failed", (err) => handlersRef.current.handleError(err))
        socket.on(SocketEvent.USERNAME_EXISTS, () => handlersRef.current.handleUsernameExist())
        socket.on(SocketEvent.JOIN_ERROR, (data) => handlersRef.current.handleJoinError(data))
        socket.on(SocketEvent.JOIN_ACCEPTED, (data) => handlersRef.current.handleJoiningAccept(data))
        socket.on(SocketEvent.USER_JOINED, (data) => handlersRef.current.handleUserJoined(data))
        socket.on(SocketEvent.USER_DISCONNECTED, (data) => handlersRef.current.handleUserLeft(data))
        socket.on(SocketEvent.REQUEST_DRAWING, (data) => handlersRef.current.handleRequestDrawing(data))
        socket.on(SocketEvent.SYNC_DRAWING, (data) => handlersRef.current.handleDrawingSync(data))

        return () => {
            socket.off("connect", handleConnect)
            socket.off("connect_error")
            socket.off("connect_failed")
            socket.off(SocketEvent.USERNAME_EXISTS)
            socket.off(SocketEvent.JOIN_ERROR)
            socket.off(SocketEvent.JOIN_ACCEPTED)
            socket.off(SocketEvent.USER_JOINED)
            socket.off(SocketEvent.USER_DISCONNECTED)
            socket.off(SocketEvent.REQUEST_DRAWING)
            socket.off(SocketEvent.SYNC_DRAWING)
        }
    }, [socket])

    return (
        <SocketContext.Provider
            value={{
                socket,
            }}
        >
            {children}
        </SocketContext.Provider>
    )
}

export { SocketProvider }
export default SocketContext
