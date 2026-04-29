import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react"
import { useSocket } from "./SocketContext"
import { SocketEvent } from "@/types/socket"
import { useAppContext } from "./AppContext"
import { toast } from "react-hot-toast"

interface WebRTCContextType {
    localStream: MediaStream | null
    remoteStreams: { [socketId: string]: MediaStream }
    isMuted: boolean
    isCameraOff: boolean
    toggleMute: () => void
    toggleCamera: () => void
    startCall: () => void
    endCall: () => void
}

const WebRTCContext = createContext<WebRTCContextType | null>(null)

export const useWebRTC = () => {
    const context = useContext(WebRTCContext)
    if (!context) {
        throw new Error("useWebRTC must be used within a WebRTCProvider")
    }
    return context
}

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket()
    const { users, currentUser } = useAppContext()
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({})
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({})

    const configuration: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }

    const createPeerConnection = useCallback((targetId: string, stream: MediaStream) => {
        const pc = new RTCPeerConnection(configuration)

        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit(SocketEvent.SEND_ICE_CANDIDATE, {
                    candidate: event.candidate,
                    targetId,
                })
            }
        }

        pc.ontrack = (event) => {
            setRemoteStreams((prev) => ({
                ...prev,
                [targetId]: event.streams[0],
            }))
        }

        peerConnections.current[targetId] = pc
        return pc
    }, [socket])

    const startCall = useCallback(async (incomingOffer?: { offer: RTCSessionDescriptionInit, senderId: string }) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            })
            setLocalStream(stream)

            if (incomingOffer) {
                // If joining an existing call from an offer
                const { offer, senderId } = incomingOffer
                const pc = createPeerConnection(senderId, stream)
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit(SocketEvent.SEND_RTC_ANSWER, {
                    answer,
                    targetId: senderId,
                })
            } else {
                // For every other user in the room, send an offer
                users.forEach(async (user) => {
                    if (user.socketId !== socket.id) {
                        const pc = createPeerConnection(user.socketId, stream)
                        const offer = await pc.createOffer()
                        await pc.setLocalDescription(offer)
                        socket.emit(SocketEvent.SEND_RTC_OFFER, {
                            offer,
                            targetId: user.socketId,
                        })
                    }
                })
            }
        } catch (error) {
            console.error("Error starting call:", error)
        }
    }, [socket, users, createPeerConnection])

    const endCall = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop())
            setLocalStream(null)
        }
        Object.values(peerConnections.current).forEach((pc) => pc.close())
        peerConnections.current = {}
        setRemoteStreams({})
    }, [localStream])

    const toggleMute = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsMuted(!audioTrack.enabled)
            }
        }
    }

    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setIsCameraOff(!videoTrack.enabled)
            }
        }
    }

    useEffect(() => {
        const handleOffer = async ({ offer, senderId }: { offer: RTCSessionDescriptionInit, senderId: string }) => {
            if (!localStream) {
                // Show invitation to join
                const sender = users.find(u => u.socketId === senderId)
                const senderName = sender ? sender.username : "Someone"
                
                toast((t) => (
                    <div className="flex items-center gap-4">
                        <span>{senderName} is in a video call. Join them?</span>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id)
                                startCall({ offer, senderId })
                            }}
                            className="bg-primary text-black px-3 py-1 rounded font-bold text-sm"
                        >
                            Join
                        </button>
                    </div>
                ), { duration: 10000, id: `call-invite-${senderId}` })
                return
            }

            const pc = createPeerConnection(senderId, localStream)
            await pc.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            socket.emit(SocketEvent.SEND_RTC_ANSWER, {
                answer,
                targetId: senderId,
            })
        }

        const handleAnswer = async ({ answer, senderId }: { answer: RTCSessionDescriptionInit, senderId: string }) => {
            const pc = peerConnections.current[senderId]
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
            }
        }

        const handleIceCandidate = async ({ candidate, senderId }: { candidate: RTCIceCandidateInit, senderId: string }) => {
            const pc = peerConnections.current[senderId]
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
        }

        socket.on(SocketEvent.RECEIVE_RTC_OFFER, handleOffer)
        socket.on(SocketEvent.RECEIVE_RTC_ANSWER, handleAnswer)
        socket.on(SocketEvent.RECEIVE_ICE_CANDIDATE, handleIceCandidate)

        return () => {
            socket.off(SocketEvent.RECEIVE_RTC_OFFER)
            socket.off(SocketEvent.RECEIVE_RTC_ANSWER)
            socket.off(SocketEvent.RECEIVE_ICE_CANDIDATE)
        }
    }, [socket, localStream, createPeerConnection, startCall, users])

    return (
        <WebRTCContext.Provider
            value={{
                localStream,
                remoteStreams,
                isMuted,
                isCameraOff,
                toggleMute,
                toggleCamera,
                startCall,
                endCall,
            }}
        >
            {children}
        </WebRTCContext.Provider>
    )
}
