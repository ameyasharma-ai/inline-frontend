import { useWebRTC } from "@/context/WebRTCContext"
import { MdCall, MdCallEnd, MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md"
import { useEffect, useRef } from "react"

const VideoView = () => {
    const {
        localStream,
        remoteStreams,
        isMuted,
        isCameraOff,
        toggleMute,
        toggleCamera,
        startCall,
        endCall,
    } = useWebRTC()

    const localVideoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream
        }
    }, [localStream])

    return (
        <div className="flex flex-col h-full bg-background p-4 gap-4 overflow-y-auto">
            <h1 className="text-xl font-bold text-white mb-2">Voice & Video</h1>
            
            <div className="flex flex-col gap-4">
                {/* Local Stream */}
                <div className="relative rounded-lg overflow-hidden border border-border bg-black/20 aspect-video">
                    {localStream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover mirror"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 italic">
                            No camera stream
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                        You (Local)
                    </div>
                </div>

                {/* Remote Streams */}
                {Object.entries(remoteStreams).map(([socketId, stream]) => (
                    <RemoteVideo key={socketId} stream={stream} socketId={socketId} />
                ))}
            </div>

            {/* Controls */}
            <div className="mt-auto pt-4 flex justify-center gap-4 border-t border-border">
                {!localStream ? (
                    <button
                        onClick={startCall}
                        className="flex items-center justify-center bg-primary hover:bg-primary-dark text-black rounded-full p-4 transition-all"
                        title="Start Call"
                    >
                        <MdCall size={28} />
                    </button>
                ) : (
                    <>
                        <button
                            onClick={toggleMute}
                            className={`flex items-center justify-center rounded-full p-4 transition-all ${
                                isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MdMicOff size={28} /> : <MdMic size={28} />}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className={`flex items-center justify-center rounded-full p-4 transition-all ${
                                isCameraOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                        >
                            {isCameraOff ? <MdVideocamOff size={28} /> : <MdVideocam size={28} />}
                        </button>
                        <button
                            onClick={endCall}
                            className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-all"
                            title="End Call"
                        >
                            <MdCallEnd size={28} />
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

const RemoteVideo = ({ stream, socketId }: { stream: MediaStream; socketId: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black/20 aspect-video">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                Remote User ({socketId.slice(0, 4)})
            </div>
        </div>
    )
}

export default VideoView
