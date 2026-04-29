import { Socket } from "socket.io-client"

type SocketId = string

enum SocketEvent {
    JOIN_REQUEST = "join-request",
    JOIN_ACCEPTED = "join-accepted",
    JOIN_ERROR = "join-error",
    USER_JOINED = "user-joined",
    USER_DISCONNECTED = "user-disconnected",
    SYNC_FILE_STRUCTURE = "sync-file-structure",
    DIRECTORY_CREATED = "directory-created",
    DIRECTORY_UPDATED = "directory-updated",
    DIRECTORY_RENAMED = "directory-renamed",
    DIRECTORY_DELETED = "directory-deleted",
    FILE_CREATED = "file-created",
    FILE_UPDATED = "file-updated",
    FILE_RENAMED = "file-renamed",
    FILE_DELETED = "file-deleted",
    USER_OFFLINE = "offline",
    USER_ONLINE = "online",
    SEND_MESSAGE = "send-message",
    RECEIVE_MESSAGE = "receive-message",
    TYPING_START = "typing-start",
    TYPING_PAUSE = "typing-pause",
    CURSOR_MOVE = "cursor-move",
    USERNAME_EXISTS = "username-exists",
    REQUEST_DRAWING = "request-drawing",
    SYNC_DRAWING = "sync-drawing",
    DRAWING_UPDATE = "drawing-update",
    SEND_RTC_OFFER = "send-rtc-offer",
    RECEIVE_RTC_OFFER = "receive-rtc-offer",
    SEND_RTC_ANSWER = "send-rtc-answer",
    RECEIVE_RTC_ANSWER = "receive-rtc-answer",
    SEND_ICE_CANDIDATE = "send-ice-candidate",
    RECEIVE_ICE_CANDIDATE = "receive-ice-candidate",
}

interface SocketContext {
    socket: Socket
}

export { SocketEvent, SocketContext, SocketId }
