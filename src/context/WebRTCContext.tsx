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

    const startCall = useCallback(async (incomingOffer?: { offer: RTCSessionDescriptionInit, senderId: string }) => {
        console.log("[WebRTC] startCall triggered", incomingOffer ? "Incoming Offer" : "Initiator")
        try {
            let stream = localStreamRef.current

            if (!stream) {
                console.log("[WebRTC] No existing stream, acquiring media...")
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                } catch (e) {
                    console.warn("[WebRTC] Full media failed, trying audio only...")
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                    } catch (e2) {
                        console.warn("[WebRTC] Audio only failed, trying video only...")
                        stream = await navigator.mediaDevices.getUserMedia({ video: true })
                    }
                }
                setLocalStream(stream)
                console.log("[WebRTC] Media acquired successfully")
            } else {
                console.log("[WebRTC] Reusing existing local stream")
            }
            
            if (incomingOffer && incomingOffer.offer) {
                const { offer, senderId } = incomingOffer
                console.log(`[WebRTC] Answering incoming offer from ${senderId}`)
                const pc = createPeerConnection(senderId, stream)
                await pc.setRemoteDescription(offer)
                await processIceCandidates(senderId)
                await pc.setLocalDescription()
                socket.emit(SocketEvent.SEND_RTC_ANSWER, {
                    answer: pc.localDescription,
                    targetId: senderId,
                })
            } else {
                console.log("[WebRTC] Initiating P2P connections to peers...")
                usersRef.current.forEach((user) => {
                    if (socket.id && user.socketId !== socket.id) {
                        createPeerConnection(user.socketId, stream)
                    }
                })
            }
        } catch (error) {
            console.error("[WebRTC] Failed to start call:", error)
            toast.error("Could not access media devices")
        }
    }, [socket, createPeerConnection, processIceCandidates])

    const endCall = useCallback(() => {
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
        const handleOffer = async ({ offer, senderId }: { offer: RTCSessionDescriptionInit; senderId: string }) => {
            try {
                console.log(`[WebRTC] Received RTC Offer from ${senderId}`)
                const pc = peerConnections.current[senderId]
                const currentStream = localStreamRef.current
                
                // Perfect Negotiation Logic
                if (!socket.id) return
                const polite = socket.id.localeCompare(senderId) > 0
                const offerCollision = makingOffer.current[senderId] || pc?.signalingState !== "stable"
                
                ignoreOffer.current[senderId] = !polite && offerCollision
                if (ignoreOffer.current[senderId]) {
                    console.log("Ignoring offer due to collision (impolite)")
                    return
                }

                if (!currentStream) {
                    // Show invitation if not in a call
                    const sender = usersRef.current.find((u) => u.socketId === senderId)
                    const senderName = sender ? sender.username : "Someone"

                    toast((t) => (
                        <div className="flex items-center gap-4">
                            <span>{senderName} is calling...</span>
                            <button
                                onClick={() => {
                                    toast.dismiss(t.id)
                                    startCall({ offer, senderId })
                                }}
                                className="bg-primary rounded px-3 py-1 font-bold text-sm text-black transition-all hover:bg-primary/80"
                            >
                                Join
                            </button>
                        </div>
                    ), { duration: 15000, id: `call-invite-${senderId}` })
                    return
                }

                const activePc = pc || createPeerConnection(senderId, currentStream)
                await activePc.setRemoteDescription(offer)
                await processIceCandidates(senderId)
                await activePc.setLocalDescription()
                
                socket.emit(SocketEvent.SEND_RTC_ANSWER, {
                    answer: activePc.localDescription,
                    targetId: senderId,
                })
            } catch (err) {
                console.error("Offer error:", err)
            }
        }

        const handleAnswer = async ({ answer, senderId }: { answer: RTCSessionDescriptionInit; senderId: string }) => {
            try {
                console.log(`[WebRTC] Received RTC Answer from ${senderId}`)
                const pc = peerConnections.current[senderId]
                if (pc) {
                    await pc.setRemoteDescription(answer)
                    await processIceCandidates(senderId)
                }
            } catch (err) {
                console.error("Answer error:", err)
            }
        }

        const handleIceCandidate = async ({ candidate, senderId }: { candidate: RTCIceCandidateInit; senderId: string }) => {
            try {
                console.log(`[WebRTC] Received ICE candidate from ${senderId}`)
                if (!iceCandidatesQueue.current[senderId]) {
                    iceCandidatesQueue.current[senderId] = []
                }
                iceCandidatesQueue.current[senderId].push(candidate)
                await processIceCandidates(senderId)
            } catch (err) {
                if (!ignoreOffer.current[senderId]) {
                    console.error("ICE error:", err)
                }
            }
        }

        socket.on(SocketEvent.RECEIVE_RTC_OFFER, handleOffer)
        socket.on(SocketEvent.RECEIVE_RTC_ANSWER, handleAnswer)
        socket.on(SocketEvent.RECEIVE_ICE_CANDIDATE, handleIceCandidate)

        return () => {
            socket.off(SocketEvent.RECEIVE_RTC_OFFER, handleOffer)
            socket.off(SocketEvent.RECEIVE_RTC_ANSWER, handleAnswer)
            socket.off(SocketEvent.RECEIVE_ICE_CANDIDATE, handleIceCandidate)
        }
    }, [socket, createPeerConnection, startCall, processIceCandidates])

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
