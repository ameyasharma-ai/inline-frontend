import { useSettings } from "@/context/SettingContext"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { FaGithub } from "react-icons/fa"

function GitHubCorner() {
    const { showGitHubCorner } = useSettings()
    const { width } = useWindowDimensions()

    if (!showGitHubCorner || width < 768) return null

    return (
        <a
            href="https://github.com/ameyasharma-ai/inline-frontend"
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.3)] group"
            aria-label="View source on GitHub"
        >
            <FaGithub className="text-xl text-white/70 transition-colors group-hover:text-primary" />
            <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white">
                Star on GitHub
            </span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
    )
}

export default GitHubCorner
