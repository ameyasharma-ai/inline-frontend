import SplitterComponent from "@/components/SplitterComponent"
import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import Sidebar from "@/components/sidebar/Sidebar"
import WorkSpace from "@/components/workspace"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS, User } from "@/types/user"
import { useEffect } from "react"
import toast from "react-hot-toast"
import { useLocation, useNavigate, useParams } from "react-router-dom"

function EditorPage() {
    // Listen user online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, setStatus, setCurrentUser, currentUser } = useAppContext()
    const { socket } = useSocket()
    const location = useLocation()

    useEffect(() => {
        if (currentUser.username.length > 0) return
        const username = location.state?.username
        if (username === undefined && roomId) {
            const checkRoom = async () => {
                try {
                    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"
                    const response = await fetch(`${BACKEND_URL}/api/room/${roomId}`)
                    const data = await response.json()
                    if (data.exists) {
                        const searchParams = new URLSearchParams(location.search)
                        const pwdParam = searchParams.get("pwd")
                        navigate("/", {
                            state: { roomId, password: pwdParam },
                        })
                    } else {
                        toast.error("Room not found or host has left")
                        navigate("/")
                    }
                } catch (error) {
                    toast.error("Failed to connect to server")
                    navigate("/")
                }
            }
            checkRoom()
        } else if (roomId) {
            const user: User = { username, roomId, password: currentUser.password }
            setCurrentUser(user)
            setStatus(USER_STATUS.ATTEMPTING_JOIN)
            socket.emit(SocketEvent.JOIN_REQUEST, user)
        }
    }, [
        currentUser.username,
        location.state?.username,
        navigate,
        roomId,
        setCurrentUser,
        setStatus,
        socket,
    ])

    useEffect(() => {
        if (status === USER_STATUS.INITIAL && currentUser.username.length > 0) {
            navigate("/", {
                state: { roomId },
            })
        }
    }, [status, currentUser.username, navigate, roomId])

    useEffect(() => {
        const handleSessionTimeout = () => {
            toast.error("Session timed out due to inactivity (30 minutes).")
            setStatus(USER_STATUS.INITIAL)
            navigate("/")
        }

        socket.on("SESSION_TIMEOUT", handleSessionTimeout)

        return () => {
            socket.off("SESSION_TIMEOUT", handleSessionTimeout)
        }
    }, [socket, navigate, setStatus])

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    if (status === USER_STATUS.INITIAL || currentUser.username.length === 0) {
        return null
    }

    return (
        <SplitterComponent>
            <Sidebar />
            <WorkSpace/>
        </SplitterComponent>
    )
}

export default EditorPage
