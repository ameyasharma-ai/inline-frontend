import { useWebRTC } from "@/context/WebRTCContext"
import { useAppContext } from "@/context/AppContext"
import { MdCall, MdCallEnd, MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdKeyboardVoice } from "react-icons/md"
import { useEffect, useRef } from "react"
import cn from "classnames"

const VideoView = () => {
    const {
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera,
        startCall,
        joinCall,
        endCall,
        isCallActive,
    } = useWebRTC()

    const localVideoRef = useRef<HTMLVideoElement>(null)
    const participantCount = Object.keys(remoteStreams).length + (localStream ? 1 : 0)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    // Google Meet style grid logic
    const getGridClass = () => {
        if (participantCount <= 1) return "grid-cols-1"
        if (participantCount <= 2) return "grid-cols-1 md:grid-cols-2"
        if (participantCount <= 4) return "grid-cols-2"
        return "grid-cols-2 md:grid-cols-3"
    }

    return (
        <div className="flex flex-col h-full bg-background p-2 md:p-4 gap-4 overflow-hidden">
            <div className="flex items-center justify-between px-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Meet</h1>
                {isCallActive && !localStream && (
                    <span className="flex items-center gap-2 text-xs font-medium text-primary animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        LIVE CALL
                    </span>
                )}
            </div>
            
            <div className="flex-grow overflow-y-auto no-scrollbar">
                {!localStream && isCallActive ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                        <div className="p-8 rounded-full bg-primary/10 border border-primary/20">
                            <MdCall size={48} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Active session in progress</h2>
                            <p className="text-sm text-gray-400 mt-1">Jump in to join your team</p>
                        </div>
                        <button
                            onClick={() => joinCall()}
                            className="w-full max-w-[200px] py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                        >
                            Join Now
                        </button>
                    </div>
                ) : !localStream ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
                        <div className="p-8 rounded-full bg-white/5 border border-white/10">
                            <MdVideocam size={48} className="text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Start a meeting</h2>
                            <p className="text-sm text-gray-400 mt-1">Initiate a video or voice call with everyone in the room</p>
                        </div>
                        <div className="flex flex-col w-full gap-3 max-w-[240px]">
                            <button
                                onClick={() => startCall(false)}
                                className="flex items-center justify-center gap-2 py-3 bg-white text-black font-bold rounded-xl transition-all hover:bg-gray-200"
                            >
                                <MdVideocam size={20} />
                                Video Call
                            </button>
                            <button
                                onClick={() => startCall(true)}
                                className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all hover:bg-white/10"
                            >
                                <MdKeyboardVoice size={20} />
                                Voice Only
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={cn("grid gap-3 h-fit", getGridClass())}>
                        {/* Local Participant */}
                        <div className="relative group aspect-video rounded-2xl overflow-hidden bg-darkHover border border-white/5 shadow-2xl">
                            {isCameraOff ? (
                                <div className="flex items-center justify-center h-full bg-gradient-to-br from-darkHover to-black">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold border border-primary/30">
                                        You
                                    </div>
                                </div>
                            ) : (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover mirror"
                                />
                            )}
                            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/10">
                                {isMuted && <MdMicOff className="text-red-500" />}
                                You
                            </div>
                        </div>

                        {/* Remote Participants */}
                        {Object.entries(remoteStreams).map(([socketId, stream]) => (
                            <RemoteParticipant key={socketId} stream={stream} socketId={socketId} />
                        ))}
                    </div>
                )}
            </div>

            {/* Premium Control Bar */}
            {localStream && (
                <div className="mt-auto py-4 flex items-center justify-center gap-4 border-t border-white/5">
                    <button
                        onClick={toggleMute}
                        className={cn(
                            "flex items-center justify-center rounded-2xl p-4 transition-all duration-300",
                            isMuted ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                        )}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
                    </button>
                    <button
                        onClick={toggleCamera}
                        className={cn(
                            "flex items-center justify-center rounded-2xl p-4 transition-all duration-300",
                            isCameraOff ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                        )}
                        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isCameraOff ? <MdVideocamOff size={24} /> : <MdVideocam size={24} />}
                    </button>
                    <button
                        onClick={endCall}
                        className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-2xl p-4 transition-all shadow-lg shadow-red-600/20"
                        title="Leave Call"
                    >
                        <MdCallEnd size={24} />
                    </button>
                </div>
            )}
        </div>
    )
}

const RemoteParticipant = ({ stream, socketId }: { stream: MediaStream; socketId: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const { users } = useAppContext()
    const participant = users.find(u => u.socketId === socketId)
    const isVideoDisabled = stream.getVideoTracks().length === 0 || !stream.getVideoTracks()[0].enabled

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative group aspect-video rounded-2xl overflow-hidden bg-darkHover border border-white/5 shadow-2xl">
            {isVideoDisabled ? (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-darkHover to-black">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/70 text-2xl font-bold border border-white/10 uppercase">
                        {participant?.username?.charAt(0) || "U"}
                    </div>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium text-white border border-white/10">
                {participant?.username || "Guest"}
            </div>
        </div>
    )
}

export default VideoView
