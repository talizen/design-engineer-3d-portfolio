import { useEffect, useRef, useState } from "react"
import { PROJECTS } from "../component/projects"
import { mountGallery } from "../component/gallery"

export const metadata = {
    title: "Alex Rowan — Design Engineer",
    description: "Alex Rowan, design engineer. Selected work in an interactive WebGL hall.",
}

const hasWebGL = () => {
    try {
        const c = document.createElement("canvas")
        return !!(c.getContext("webgl2") || c.getContext("webgl"))
    } catch {
        return false
    }
}

function Grid() {
    return (
        <section className="grid grid-cols-1 gap-[25px] py-10 s:grid-cols-2 s:gap-[15px] min-[1100px]:grid-cols-3">
            {PROJECTS.map(p => (
                <div key={p.slug} className="block">
                    <img src={p.shots[0]} alt={p.title} className="aspect-video w-full rounded-[10px] object-cover" />
                    <span className="mono mt-2.5 block">{p.title}</span>
                </div>
            ))}
        </section>
    )
}

export default function Index() {
    const root = useRef<HTMLDivElement>(null)
    const [gl, setGl] = useState<boolean | null>(null)

    useEffect(() => {
        const ok = hasWebGL()
        setGl(ok)
        if (!ok || !root.current) return
        document.documentElement.classList.add("gl")
        const destroy = mountGallery(root.current, PROJECTS)
        return () => {
            destroy()
            document.documentElement.classList.remove("gl")
        }
    }, [])

    if (gl === false) {
        return (
            <main className="min-h-dvh px-[30px] py-[30px] max-s:px-5">
                <header className="flex items-start justify-between">
                    <h1 className="text-base uppercase leading-none tracking-[.02em]">AR</h1>
                    <a href="mailto:hello@example.com" className="mono link">Contact</a>
                </header>
                <Grid />
            </main>
        )
    }

    return (
        <div ref={root} className="text-base leading-[1.4]">
            <canvas id="gl" className="fixed inset-0 block h-full w-full cursor-grab" />

            {/* loader curtain */}
            <div id="curtain" className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-paper transition-opacity duration-700 ease-o3 [&.out]:opacity-0">
                <span className="mask mono"><span className="w" id="loadFig">000</span></span>
            </div>

            <main className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-[30px] max-s:p-5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
                <header className="top flex items-start justify-between">
                    <h1 className="text-base uppercase leading-none tracking-[.02em]">
                        <a href="/" id="home" className="mask pb-[.12em]">
                            <span className="w">A</span><span className="w">R</span>
                        </a>
                    </h1>
                    <nav className="mono flex gap-[25px]">
                        <span className="mask"><a href="#about" id="navAbout" className="link w">About</a></span>
                        <span className="mask"><a href="/" id="navClose" className="link w hidden">Close</a></span>
                    </nav>
                </header>

                {/* about */}
                <div id="about" className="about fixed left-[30px] top-1/2 w-[min(34vw,470px)] -translate-y-1/2 max-s:inset-x-5 max-s:top-auto max-s:bottom-40 max-s:w-auto max-s:translate-y-0">
                    <span className="mask mb-[15px]"><span className="w mono text-[11px]">Design Engineer</span></span>
                    <span className="mask pb-[.06em]"><span className="w text-[clamp(40px,5.6vw,80px)] uppercase leading-none tracking-[-.02em]">Alex</span></span>
                    <span className="mask pb-[.06em]"><span className="w text-[clamp(40px,5.6vw,80px)] uppercase leading-none tracking-[-.02em]">Rowan</span></span>
                    <p className="fade mt-[30px]">
                        I’m a design engineer working where interface design meets code — building websites that feel considered, quick and a little playful. Ideas first, polish later, and always one more experiment on the go.
                    </p>
                </div>
                <div id="aboutFoot" className="about-foot fixed bottom-[30px] left-[30px] max-s:bottom-5 max-s:left-5">
                    <span className="mask">
                        <span className="w mono grid grid-cols-[2.5rem_1fr] items-center text-[11px]"><span>01</span><a className="link justify-self-start" href="mailto:hello@example.com">Contact ↗</a></span>
                    </span>
                    <span className="mask mt-[5px]">
                        <span className="w mono grid grid-cols-[2.5rem_1fr] items-center text-[11px]"><span>02</span><a className="link justify-self-start" href="mailto:hello@example.com">Newsletter ↗</a></span>
                    </span>
                </div>

                {/* case info */}
                <div id="case" className="case fixed bottom-[30px] left-[30px] w-[min(30vw,400px)] max-s:inset-x-5 max-s:bottom-[120px] max-s:w-auto">
                    <span className="mask"><span className="w text-base uppercase leading-[1.1] tracking-[.01em]" id="caseName" /></span>
                    <p className="fade mt-[15px] text-ink/80" id="caseCopy" />
                    <div id="caseCredits" className="mt-[25px] [&>.mask+.mask]:mt-[5px]" />
                    <a className="mask link mt-[25px] w-fit" id="caseVisit" href="/" target="_blank" rel="noreferrer">
                        <span className="w mono underline underline-offset-4">Visit site ↗</span>
                    </a>
                </div>

                {/* shot thumbs */}
                <div id="thumbs" className="thumbs fixed right-[30px] top-1/2 flex -translate-y-1/2 flex-col gap-5 max-s:inset-x-5 max-s:top-auto max-s:bottom-[65px] max-s:translate-y-0 max-s:flex-row max-s:justify-center max-s:gap-2.5">
                    <span id="thumbBox" className="thumb-box pointer-events-none absolute left-0 top-0 outline outline-1 outline-offset-[6px] outline-ink" />
                </div>

                {/* readout */}
                <footer className="bottom mono flex items-end justify-between">
                    <span className="mask roll" id="walk"><span className="w">{PROJECTS[0].title}</span></span>
                    <span className="flex gap-[.4em]">
                        <span className="mask roll" id="index"><span className="w">01</span></span>
                        <span className="mask"><span className="w">/</span></span>
                        <span className="mask"><span className="w">{String(PROJECTS.length).padStart(2, "0")}</span></span>
                    </span>
                </footer>
            </main>
        </div>
    )
}
