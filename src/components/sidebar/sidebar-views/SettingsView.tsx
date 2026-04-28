import Select from "@/components/common/Select"
import { useSettings } from "@/context/SettingContext"
import useResponsive from "@/hooks/useResponsive"
import { editorFonts } from "@/resources/Fonts"
import { editorThemes } from "@/resources/Themes"
import { langNames } from "@uiw/codemirror-extensions-langs"
import { ChangeEvent, useEffect } from "react"
import { PiCaretDownBold } from "react-icons/pi"

function SettingsView() {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        showGitHubCorner,
        setShowGitHubCorner,
        resetSettings,
    } = useSettings()
    const { viewHeight } = useResponsive()

    const handleFontFamilyChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setFontFamily(e.target.value)
    const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setTheme(e.target.value)
    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setLanguage(e.target.value)
    const handleFontSizeChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setFontSize(parseInt(e.target.value))
    const handleShowGitHubCornerChange = (e: ChangeEvent<HTMLInputElement>) =>
        setShowGitHubCorner(e.target.checked)

    useEffect(() => {
        // Set editor font family
        const editor = document.querySelector(
            ".cm-editor > .cm-scroller",
        ) as HTMLElement
        if (editor !== null) {
            editor.style.fontFamily = `${fontFamily}, monospace`
        }
    }, [fontFamily])

    return (
        <div
            className="flex flex-col items-center gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Settings</h1>
            {/* Choose Font Family option */}
            <div className="flex w-full items-end gap-2">
                <Select
                    onChange={handleFontFamilyChange}
                    value={fontFamily}
                    options={editorFonts}
                    title="Font Family"
                />
                {/* Choose font size option */}
                <select
                    value={fontSize}
                    onChange={handleFontSizeChange}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-light outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                    title="Font Size"
                >
                    {[...Array(13).keys()].map((size) => {
                        return (
                            <option key={size} value={size + 12}>
                                {size + 12}
                            </option>
                        )
                    })}
                </select>
            </div>
            {/* Choose theme option */}
            <Select
                onChange={handleThemeChange}
                value={theme}
                options={Object.keys(editorThemes)}
                title="Theme"
            />
            {/* Choose language option */}
            <div className="relative w-full text-left">
                <label className="mb-2 inline-block">Language</label>
                <select
                    className="w-full appearance-none rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                    value={language}
                    onChange={handleLanguageChange}
                >
                    <optgroup label="Supported for Execution">
                        {["javascript", "typescript", "python", "cpp", "java"].map((lang) => (
                            <option className="bg-[#1e1e2e]" key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Syntax Highlighting Only">
                        {langNames.filter(l => !["javascript", "typescript", "python", "cpp", "java"].includes(l)).sort().map((lang) => (
                            <option className="bg-[#1e1e2e]" key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                        ))}
                    </optgroup>
                </select>
                <PiCaretDownBold
                    size={16}
                    className="pointer-events-none absolute bottom-3 right-4 z-10 text-white"
                />
            </div>
            {/* Show GitHub corner option */}
            <div className="mt-4 flex w-full items-center justify-between">
                <label>Show github corner</label>
                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        className="peer sr-only"
                        type="checkbox"
                        onChange={handleShowGitHubCornerChange}
                        checked={showGitHubCorner}
                    />
                    <div className="peer h-6 w-12 rounded-full bg-darkHover outline-none duration-100 after:absolute after:left-1 after:top-1 after:flex after:h-4 after:w-4 after:items-center after:justify-center after:rounded-full after:bg-white after:font-bold after:outline-none after:duration-500 peer-checked:after:translate-x-6 peer-checked:after:border-white peer-focus:outline-none"></div>
                </label>
            </div>
            <button
                className="mt-auto w-full rounded-xl border border-white/10 bg-white/5 p-3 text-light transition-all hover:bg-danger/20 hover:text-danger hover:border-danger/50 active:scale-95"
                onClick={resetSettings}
            >
                Reset to default
            </button>
        </div>
    )
}

export default SettingsView
