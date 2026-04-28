import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"
// import Footer from "@/components/common/Footer";

function HomePage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground transition-colors duration-300">
            {/* Background glowing orbs */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] animate-pulse-slow rounded-full bg-primary/20 blur-[128px]"></div>
                <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] animate-pulse-slow rounded-full bg-accent/20 blur-[128px]" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="z-10 my-12 flex h-full min-w-full flex-col items-center justify-evenly gap-10 sm:flex-row sm:pt-0">
                <div className="flex w-full flex-col items-center justify-center gap-6 animate-up-down sm:w-1/2 sm:pl-4 text-center">
                    <img
                        src={illustration}
                        alt="InLine Illustration"
                        className="mx-auto w-[200px] sm:w-[350px] drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    />
                    <div className="space-y-2">
                        <h1 className="font-outfit text-4xl sm:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">InLine</h1>
                        <p className="font-inter text-gray-400 text-lg sm:text-xl font-light">Real-time collaborative workspace</p>
                    </div>
                </div>
                <div className="flex w-full items-center justify-center sm:w-1/2">
                    <div className="w-full max-w-[450px] rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] sm:p-10">
                        <FormComponent />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HomePage
