import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import logo from "@/assets/logo.svg"

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    const createNewRoomId = () => {
        // Generate a random 6-character alphanumeric password
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        const randomPassword = Array.from({ length: 6 })
            .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
            .join('')
            
        setCurrentUser({ ...currentUser, roomId: uuidv4(), password: randomPassword })
        toast.success("Created a new Room ID & Password")
        usernameRef.current?.focus()
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        } else if (currentUser.roomId.trim().length === 0) {
            toast.error("Enter a room id")
            return false
        } else if (currentUser.roomId.trim().length < 5) {
            toast.error("ROOM Id must be at least 5 characters long")
            return false
        } else if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        } else if (!currentUser.password || currentUser.password.trim().length === 0) {
            toast.error("Enter a 4-8 character room password")
            return false
        } else if (currentUser.password.trim().length < 4 || currentUser.password.trim().length > 8) {
            toast.error("Password must be between 4 and 8 characters long")
            return false
        }
        return true
    }

    const joinRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return
        toast.loading("Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        socket.emit(SocketEvent.JOIN_REQUEST, currentUser)
    }

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ 
                ...currentUser, 
                roomId: location.state.roomId, 
                password: location.state.password || "" 
            })
            if (currentUser.username.length === 0) {
                toast.success("Enter your username")
            }
        }
    }, [currentUser, location.state?.roomId, location.state?.password, setCurrentUser])



    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            socket.connect()
            return
        }

        if (status === USER_STATUS.JOINED) {
            const username = currentUser.username
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            })
        }
    }, [currentUser, navigate, socket, status])

    return (
        <div className="flex w-full flex-col items-center justify-center gap-6">
            <h2 className="font-outfit text-2xl font-bold tracking-wide text-light drop-shadow-sm">
                Join Workspace
            </h2>
            <form onSubmit={joinRoom} className="flex w-full flex-col gap-5">
                <div className="group relative">
                    <input
                        type="text"
                        name="roomId"
                        placeholder="Room Id"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-light placeholder-gray-400 backdrop-blur-sm transition-all focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        onChange={handleInputChanges}
                        value={currentUser.roomId}
                    />
                </div>
                <div className="group relative">
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-light placeholder-gray-400 backdrop-blur-sm transition-all focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        onChange={handleInputChanges}
                        value={currentUser.username}
                        ref={usernameRef}
                    />
                </div>
                <div className="group relative">
                    <input
                        type="password"
                        name="password"
                        placeholder="Room Password (4-8 characters)"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-light placeholder-gray-400 backdrop-blur-sm transition-all focus:border-primary focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        onChange={handleInputChanges}
                        value={currentUser.password}
                        maxLength={8}
                    />
                </div>
                <button
                    type="submit"
                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-primary to-accent px-8 py-3 text-lg font-semibold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] active:scale-[0.98]"
                >
                    Join Room
                </button>
            </form>
            <button
                className="cursor-pointer select-none text-sm text-gray-400 transition-colors hover:text-accent hover:underline hover:underline-offset-4"
                onClick={createNewRoomId}
                type="button"
            >
                Generate Unique Room Id & Password
            </button>
        </div>
    )
}

export default FormComponent
