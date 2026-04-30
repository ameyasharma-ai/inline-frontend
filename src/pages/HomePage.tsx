import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"

function HomePage() {
    return (
        <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground transition-colors duration-300 overflow-hidden">
            {/* Background glowing orbs */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] animate-pulse-slow rounded-full bg-primary/10 blur-[128px]"></div>
                <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] animate-pulse-slow rounded-full bg-accent/10 blur-[128px]" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="z-10 flex h-full w-full max-w-7xl flex-col items-center justify-center gap-12 px-6 sm:flex-row sm:gap-20">
                <div className="flex w-full flex-col items-center justify-center gap-8 animate-up-down sm:w-1/2 text-center sm:text-left sm:items-start">
                    <img
                        src={illustration}
                        alt="InLine Illustration"
                        className="mx-auto sm:mx-0 w-[220px] sm:w-[400px] drop-shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                    />
                    <div className="space-y-4">
                        <h1 className="font-outfit text-5xl sm:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-sm">InLine</h1>
                        <p className="font-inter text-gray-400 text-lg sm:text-2xl font-light max-w-md">Real-time collaborative workspace for elite engineering teams.</p>
                    </div>
                </div>
                <div className="flex w-full items-center justify-center sm:w-1/2">
                    <div className="w-full max-w-[450px] rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all hover:border-white/20 sm:p-12">
                        <FormComponent />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HomePage
