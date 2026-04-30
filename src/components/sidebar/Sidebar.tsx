import SidebarButton from "@/components/sidebar/sidebar-views/SidebarButton"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { useViews } from "@/context/ViewContext"
import useResponsive from "@/hooks/useResponsive"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { ACTIVITY_STATE } from "@/types/app"
import { SocketEvent } from "@/types/socket"
import { VIEWS } from "@/types/view"
import { IoCodeSlash, IoLogoGithub } from "react-icons/io5"
import { MdOutlineDraw } from "react-icons/md"
import cn from "classnames"
import { Tooltip } from 'react-tooltip'
import { useState } from 'react'
import { tooltipStyles } from "./tooltipStyles"

function Sidebar() {
    const {
        activeView,
        isSidebarOpen,
        viewComponents,
        viewIcons,
        setIsSidebarOpen,
    } = useViews()
    const { minHeightReached } = useResponsive()
    const { activityState, setActivityState } = useAppContext()
    const { socket } = useSocket()
    const { isMobile, width } = useWindowDimensions()
    const [showTooltip, setShowTooltip] = useState(true)

    console.log(`[LAYOUT-DEBUG] Sidebar render. Width: ${width}, isMobile: ${isMobile}`)

    const changeState = () => {
        setShowTooltip(false)
        if (activityState === ACTIVITY_STATE.CODING) {
            setActivityState(ACTIVITY_STATE.DRAWING)
            socket.emit(SocketEvent.REQUEST_DRAWING)
        } else {
            setActivityState(ACTIVITY_STATE.CODING)
        }

        if (isMobile) {
            setIsSidebarOpen(false)
        }
    }

    return (
        <aside className="flex w-full md:h-full md:max-h-full md:min-h-full md:w-auto">
            <div
                className={cn(
                    "fixed bottom-0 left-0 z-50 flex h-[60px] w-full items-center justify-between overflow-hidden border-t border-border bg-background px-1 md:static md:h-full md:w-[60px] md:min-w-[60px] md:flex-col md:gap-2 md:border-r md:border-t-0 md:p-3 md:pt-4 transition-colors duration-300",
                    {
                        hidden: minHeightReached,
                    },
                )}
            >
                <SidebarButton
                    viewName={VIEWS.FILES}
                    icon={viewIcons[VIEWS.FILES]}
                />
                <SidebarButton
                    viewName={VIEWS.CHATS}
                    icon={viewIcons[VIEWS.CHATS]}
                />
                <SidebarButton
                    viewName={VIEWS.COPILOT}
                    icon={viewIcons[VIEWS.COPILOT]}
                />
                <SidebarButton
                    viewName={VIEWS.RUN}
                    icon={viewIcons[VIEWS.RUN]}
                />
                <SidebarButton
                    viewName={VIEWS.CLIENTS}
                    icon={viewIcons[VIEWS.CLIENTS]}
                />
                <SidebarButton
                    viewName={VIEWS.VIDEO}
                    icon={viewIcons[VIEWS.VIDEO]}
                />
                <SidebarButton
                    viewName={VIEWS.SETTINGS}
                    icon={viewIcons[VIEWS.SETTINGS]}
                />

                {/* Activity State (Drawing) - Strategic placement before GitHub */}
                <div className="flex h-fit items-center justify-center mt-auto mb-2 md:mb-4">
                    <div className="relative flex flex-1 min-w-0 flex-col items-center justify-center">
                        <button
                            className="flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ease-in-out hover:bg-white/10 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)] text-gray-400 hover:text-white"
                            onClick={changeState}
                            onMouseEnter={() => setShowTooltip(true)}
                            data-tooltip-id="activity-state-tooltip"
                            data-tooltip-content={
                                activityState === ACTIVITY_STATE.CODING
                                    ? "Switch to Drawing Mode"
                                    : "Switch to Coding Mode"
                            }
                        >
                            {activityState === ACTIVITY_STATE.CODING ? (
                                <MdOutlineDraw size={30} />
                            ) : (
                                <IoCodeSlash size={30} />
                            )}
                        </button>
                        {showTooltip && (
                            <Tooltip
                                id="activity-state-tooltip"
                                place="right"
                                offset={15}
                                className="!z-50"
                                style={tooltipStyles}
                                noArrow={false}
                                positionStrategy="fixed"
                                float={true}
                            />
                        )}
                    </div>
                </div>

                {/* GitHub Link - End of the toolbar */}
                <div className="flex h-fit items-center justify-center mb-2 md:mb-4">
                    <a
                        href="https://github.com/ameyasharma-ai/inline-frontend"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ease-in-out hover:bg-white/10 text-gray-400 hover:text-white group"
                        title="Star on GitHub"
                    >
                        <IoLogoGithub size={isMobile ? 22 : 28} className="group-hover:text-primary transition-colors" />
                    </a>
                </div>
            </div>
            <div
                className="absolute left-0 top-0 z-20 w-full flex-col bg-background md:static md:min-w-[300px] transition-colors duration-300"
                style={isSidebarOpen ? {} : { display: "none" }}
            >
                {/* Render the active view component */}
                {viewComponents[activeView]}
            </div>
        </aside>
    )
}

export default Sidebar
