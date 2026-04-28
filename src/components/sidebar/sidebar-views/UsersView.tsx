import Users from "@/components/common/Users"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { USER_STATUS } from "@/types/user"
import toast from "react-hot-toast"
import { GoSignOut } from "react-icons/go"
import { IoShareOutline } from "react-icons/io5"
import { LuCopy } from "react-icons/lu"
import { useNavigate } from "react-router-dom"

function UsersView() {
    const navigate = useNavigate()
    const { viewHeight } = useResponsive()
    const { setStatus, currentUser } = useAppContext()
    const { socket } = useSocket()

    const copyURL = async () => {
        const url = `${window.location.origin}${window.location.pathname}?pwd=${encodeURIComponent(currentUser.password)}`
        try {
            await navigator.clipboard.writeText(url)
            toast.success("Room URL copied!")
        } catch (error) {
            toast.error("Unable to copy to clipboard")
            console.log(error)
        }
    }

    const shareURL = async () => {
        const url = `${window.location.origin}${window.location.pathname}?pwd=${encodeURIComponent(currentUser.password)}`
        try {
            await navigator.share({ title: "Workspace URL", url })
        } catch (error) {
            toast.error("Unable to share URL")
            console.log(error)
        }
    }

    const copyPassword = async () => {
        try {
            await navigator.clipboard.writeText(currentUser.password)
            toast.success("Password copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy password")
        }
    }

    const leaveRoom = () => {
        socket.disconnect()
        setStatus(USER_STATUS.DISCONNECTED)
        navigate("/", {
            replace: true,
        })
    }

    return (
        <div className="flex flex-col p-4" style={{ height: viewHeight }}>
            <h1 className="view-title">Users</h1>
            {/* List of connected users */}
            <Users />
            <div className="flex flex-col items-center gap-4 pt-4">
                <div 
                    className="w-full cursor-pointer rounded-md border border-white/10 bg-white/5 p-3 text-center text-sm text-light backdrop-blur-sm transition-colors hover:bg-white/10"
                    onClick={copyPassword}
                    title="Click to copy password"
                >
                    <p className="font-semibold text-white">Room Password</p>
                    <p className="mt-1 font-mono text-primary tracking-wider">{currentUser.password}</p>
                </div>
                <div className="flex w-full gap-4">
                    {/* Share URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-light transition-all hover:bg-white/10 active:scale-95"
                        onClick={shareURL}
                        title="Share Link"
                    >
                        <IoShareOutline size={22} />
                    </button>
                    {/* Copy URL button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-light transition-all hover:bg-white/10 active:scale-95"
                        onClick={copyURL}
                        title="Copy Link"
                    >
                        <LuCopy size={20} />
                    </button>
                    {/* Logout / Leave room button */}
                    <button
                        className="flex flex-grow items-center justify-center rounded-xl border border-danger/50 bg-danger/20 p-3 text-danger transition-all hover:bg-danger/30 active:scale-95"
                        onClick={leaveRoom}
                        title="Logout / Leave Room"
                    >
                        <GoSignOut size={22} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UsersView
