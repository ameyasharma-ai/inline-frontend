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
    const { users } = useAppContext()
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: MediaStream }>({})
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({})
    const iceCandidatesQueue = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({})
    const makingOffer = useRef<{ [socketId: string]: boolean }>({})
    const ignoreOffer = useRef<{ [socketId: string]: boolean }>({})

    const configuration: RTCConfiguration = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
        ],
    }

    const processIceCandidates = useCallback(async (socketId: string) => {
        const pc = peerConnections.current[socketId]
        const queue = iceCandidatesQueue.current[socketId]
        if (pc && pc.remoteDescription && queue) {
            while (queue.length > 0) {
                const candidate = queue.shift()
                if (candidate) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate))
                    } catch (e) {
                        if (!ignoreOffer.current[socketId]) {
                            console.error("Error adding queued ICE candidate", e)
                        }
                    }
                }
            }
        }
    }, [])

    const createPeerConnection = useCallback((targetId: string, stream: MediaStream) => {
        // If connection exists, close it
        if (peerConnections.current[targetId]) {
            peerConnections.current[targetId].close()
        }

        const pc = new RTCPeerConnection(configuration)

        // Add local tracks
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream)
        })

        // Perfect Negotiation: On Negotiation Needed
        pc.onnegotiationneeded = async () => {
            try {
                makingOffer.current[targetId] = true
                await pc.setLocalDescription()
                socket.emit(SocketEvent.SEND_RTC_OFFER, {
                    offer: pc.localDescription,
                    targetId,
                })
            } catch (err) {
                console.error("Negotiation error:", err)
            } finally {
                makingOffer.current[targetId] = false
            }
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit(SocketEvent.SEND_ICE_CANDIDATE, {
                    candidate: event.candidate,
                    targetId,
                })
            }
        }

        pc.ontrack = (event) => {
            setRemoteStreams((prev) => {
                const existingStream = prev[targetId]
                if (existingStream) {
                    event.streams[0].getTracks().forEach(track => {
                        if (!existingStream.getTracks().find(t => t.id === track.id)) {
                            existingStream.addTrack(track)
                        }
                    })
                    return { ...prev }
                }
                return {
                    ...prev,
                    [targetId]: event.streams[0],
                }
            })
        }

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
                setRemoteStreams((prev) => {
                    const newState = { ...prev }
                    delete newState[targetId]
                    return newState
                })
            }
        }

        peerConnections.current[targetId] = pc
        return pc
    }, [socket])

    const localStreamRef = useRef<MediaStream | null>(localStream)
    const usersRef = useRef(users)

    useEffect(() => {
        localStreamRef.current = localStream
        usersRef.current = users
    }, [localStream, users])

    const startCall = useCallback(async () => {
        console.log("[WebRTC] Initiating call...")
        try {
            let stream = localStreamRef.current
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                setLocalStream(stream)
            }
            
            // Notify everyone in the room that I'm starting a call
            const roomId = usersRef.current[0]?.roomId
            if (roomId) {
                console.log("[WebRTC] Broadcasting call invitation to room")
                socket.emit("RTC_CALL_START", { roomId })
            }
        } catch (error) {
            console.error("[WebRTC] Failed to start call:", error)
            toast.error("Could not access media devices")
        }
    }, [socket])

    const joinCall = useCallback(async (senderId: string) => {
        console.log(`[WebRTC] Joining call from ${senderId}`)
        try {
            let stream = localStreamRef.current
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                setLocalStream(stream)
            }
            
            // Tell the initiator I am ready to receive their offer
            socket.emit("RTC_PROCEED_OFFER", { targetId: senderId })
        } catch (error) {
            console.error("[WebRTC] Failed to join call:", error)
            toast.error("Could not access media devices")
        }
    }, [socket])

    const endCall = useCallback(() => {
        console.log("[WebRTC] Ending call...")
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            setLocalStream(null)
        }
        Object.values(peerConnections.current).forEach((pc) => pc.close())
        peerConnections.current = {}
        iceCandidatesQueue.current = {}
        makingOffer.current = {}
        ignoreOffer.current = {}
        setRemoteStreams({})
    }, [])

    // Prune connections when users leave
    useEffect(() => {
        const userIds = new Set(users.map(u => u.socketId))
        Object.keys(peerConnections.current).forEach(id => {
            if (!userIds.has(id)) {
                peerConnections.current[id].close()
                delete peerConnections.current[id]
                delete iceCandidatesQueue.current[id]
                setRemoteStreams(prev => {
                    const newState = { ...prev }
                    delete newState[id]
                    return newState
                })
            }
        })
    }, [users])

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
        const handleInvite = ({ senderId, senderName }: { senderId: string; senderName: string }) => {
            console.log(`[WebRTC] Received call invitation from ${senderName}`)
            toast((t) => (
                <div className="flex items-center gap-4">
                    <span>{senderName} is in a video call. Join?</span>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id)
                            joinCall(senderId)
                        }}
                        className="bg-primary rounded px-3 py-1 font-bold text-sm text-black transition-all hover:bg-primary/80"
                    >
                        Join
                    </button>
                </div>
            ), { duration: 15000, id: `invite-${senderId}` })
        }

        const handleReady = ({ senderId }: { senderId: string }) => {
            console.log(`[WebRTC] Peer ${senderId} is ready, initiating connection`)
            const stream = localStreamRef.current
            if (stream) {
                createPeerConnection(senderId, stream)
            }
        }

        const handleOffer = async ({ offer, senderId }: { offer: RTCSessionDescriptionInit; senderId: string }) => {
            try {
                console.log(`[WebRTC] Received offer from ${senderId}`)
                const stream = localStreamRef.current
                if (!stream || !socket.id) return

                const pc = peerConnections.current[senderId]
                const polite = socket.id.localeCompare(senderId) > 0
                const offerCollision = makingOffer.current[senderId] || pc?.signalingState !== "stable"
                
                ignoreOffer.current[senderId] = !polite && offerCollision
                if (ignoreOffer.current[senderId]) {
                    console.log(`[WebRTC] Ignoring offer from ${senderId} (collision)`)
                    return
                }

                const activePc = pc || createPeerConnection(senderId, stream)
                await activePc.setRemoteDescription(offer)
                await processIceCandidates(senderId)
                await activePc.setLocalDescription()
                
                socket.emit(SocketEvent.SEND_RTC_ANSWER, {
                    answer: activePc.localDescription,
                    targetId: senderId,
                })
            } catch (err) {
                console.error("[WebRTC] Offer error:", err)
            }
        }

        const handleAnswer = async ({ answer, senderId }: { answer: RTCSessionDescriptionInit; senderId: string }) => {
            try {
                console.log(`[WebRTC] Received answer from ${senderId}`)
                const pc = peerConnections.current[senderId]
                if (pc) {
                    await pc.setRemoteDescription(answer)
                    await processIceCandidates(senderId)
                }
            } catch (err) {
                console.error("[WebRTC] Answer error:", err)
            }
        }

        const handleIceCandidate = async ({ candidate, senderId }: { candidate: RTCIceCandidateInit; senderId: string }) => {
            try {
                if (!iceCandidatesQueue.current[senderId]) {
                    iceCandidatesQueue.current[senderId] = []
                }
                iceCandidatesQueue.current[senderId].push(candidate)
                await processIceCandidates(senderId)
            } catch (err) {
                if (!ignoreOffer.current[senderId]) {
                    console.error("[WebRTC] ICE error:", err)
                }
            }
        }

        socket.on("RTC_CALL_INVITE", handleInvite)
        socket.on("RTC_READY_TO_RECEIVE", handleReady)
        socket.on(SocketEvent.RECEIVE_RTC_OFFER, handleOffer)
        socket.on(SocketEvent.RECEIVE_RTC_ANSWER, handleAnswer)
        socket.on(SocketEvent.RECEIVE_ICE_CANDIDATE, handleIceCandidate)

        return () => {
            socket.off("RTC_CALL_INVITE")
            socket.off("RTC_READY_TO_RECEIVE")
            socket.off(SocketEvent.RECEIVE_RTC_OFFER)
            socket.off(SocketEvent.RECEIVE_RTC_ANSWER)
            socket.off(SocketEvent.RECEIVE_ICE_CANDIDATE)
        }
    }, [socket, createPeerConnection, joinCall, processIceCandidates])

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
