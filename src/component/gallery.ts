import * as THREE from 'three'
import type { Project } from './projects'

/* ------------------------------------------------------------- shaders */

const planeVert = /* glsl */`
uniform float uRadius, uPush, uWarp, uWave, uPhase, uMirror, uFloor;
varying vec2 vUv;
varying float vPop;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  w.y -= sin(uv.x * 3.14159) * uWarp;
  w.z += sin(uv.x * 6.28318 + uPhase) * uWave;
  if (uMirror > .5) w.y = 2. * uFloor - w.y;
  vec4 mv = viewMatrix * w;
  float ax = abs(mv.x);
  float pop = 0.;
  if (ax < uRadius) { float t = ax / uRadius; pop = (1. - t * t * (3. - 2. * t)) * uRadius * uPush; }
  mv.z += pop;
  vPop = pop / (uRadius * uPush + 1e-4);
  vUv = uv;
  gl_Position = projectionMatrix * mv;
}`

const planeFrag = /* glsl */`
uniform sampler2D uMap;
uniform vec2 uUvScale, uViewport;
uniform float uLight, uOpacity, uMirror, uHorizon, uWater, uSplit, uReflect;
varying vec2 vUv;
varying float vPop;
void main(){
  vec2 uv = vUv;
  float a = uOpacity;
  if (uMirror > .5) {
    float q = gl_FragCoord.y / uViewport.y;
    float Y = clamp((uHorizon - q) / .32, 0., 1.);
    float R = mix(.35, 1., Y);
    float d = uWater * 4.;
    float s = sin(gl_FragCoord.y * .07 + d) + .5 * sin(gl_FragCoord.y * .16 - d * 1.3);
    uv.x += s * .028 * R;
    uv.y += s * .011 * R;
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) discard;
    a *= uReflect * (1. - Y) * (1. - Y);
  }
  vec2 t = (uv - .5) * uUvScale + .5;
  vec4 c = texture2D(uMap, t);
  if (uSplit != 0.) {
    c.r = texture2D(uMap, t + vec2(uSplit, 0.)).r;
    c.b = texture2D(uMap, t - vec2(uSplit, 0.)).b;
  }
  float g = dot(c.rgb, vec3(.3333));
  float k = clamp(smoothstep(.2, .95, vPop) + uLight, 0., 1.);
  vec3 col = mix(vec3(g) * .6, c.rgb, k);
  gl_FragColor = vec4(col, a);
}`

const dustVert = /* glsl */`
attribute vec3 seed;
uniform float uTime, uScroll, uSpan, uDepth, uTop, uFloor, uCamZ, uDpr;
varying float vA;
void main(){
  float z = 400. - seed.z * uDepth;
  float h = uTop - uFloor;
  float y = uTop - fract(seed.y + uTime * (.004 + .008 * seed.x)) * h;
  float x = mod(seed.x * uSpan - uScroll + uSpan * .5, uSpan) - uSpan * .5 + sin(seed.z * 43.7 + uTime * .35) * 18.;
  vec4 mv = viewMatrix * vec4(x, y, z, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  gl_PointSize = clamp(2.4 * uCamZ / max(dist, 1.), 1., 10.) * uDpr;
  float far = uCamZ + uDepth;
  vA = smoothstep(far, far * .55, dist) * smoothstep(0., 120., dist) * smoothstep(uFloor, uFloor + 90., y);
}`

const dustFrag = /* glsl */`
uniform float uAlpha;
varying float vA;
void main(){
  float d = length(gl_PointCoord - .5);
  gl_FragColor = vec4(vec3(.94, .937, .925), smoothstep(.5, .15, d) * vA * uAlpha);
}`

const postVert = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`

const postFrag = /* glsl */`
uniform sampler2D uScene;
uniform vec2 uViewport;
uniform float uLens, uVignette, uTime;
varying vec2 vUv;
vec2 B(vec2 C, float D, float E){ return .5 + C * (1. - E * (1. - D)); }
void main(){
  vec2 C = vUv - .5;
  float F = uViewport.x / uViewport.y;
  vec2 G = vec2(C.x * F, C.y);
  float D = dot(G, G) / (.25 * F * F + .25);
  float E = uLens * .3;
  float H = .05;
  vec3 I = vec3(
    texture2D(uScene, B(C, D, E * (1. + H))).r,
    texture2D(uScene, B(C, D, E)).g,
    texture2D(uScene, B(C, D, E * (1. - H))).b);
  I += uLens * .05 * (1. - D);
  I *= 1. - uVignette * smoothstep(.35, 1., length(G));
  float J = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
  gl_FragColor = vec4(I + (J - .5) * .03, 1.);
}`

/* --------------------------------------------------------------- mount */

const SHOTS = 4
const pad2 = (n: number) => String(n).padStart(2, '0')
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const expoOut = (t: number) => t >= 1 ? 1 : 1 - 2 ** (-10 * t)

type Plane = {
    p: Project, i: number, mesh: THREE.Mesh, refl: THREE.Mesh,
    tex: THREE.Texture[], shot: number, split: number, light: number,
}

/** Builds the WebGL hall inside `root` (which holds the page's UI markup) and returns a cleanup. */
export function mountGallery (root: HTMLElement, PROJECTS: Project[]): () => void {
    const $ = (s: string) => root.querySelector(s) as HTMLElement
    const N = PROJECTS.length
    const off: (() => void)[] = []
    const on = (t: EventTarget, type: string, fn: any, opts?: any) => {
        t.addEventListener(type, fn, opts)
        off.push(() => t.removeEventListener(type, fn, opts))
    }

    THREE.ColorManagement.enabled = false
    const canvas = $('#gl') as HTMLCanvasElement
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 20000)
    const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 })

    const postScene = new THREE.Scene()
    const postCam = new THREE.Camera()
    const postMat = new THREE.ShaderMaterial({
        vertexShader: postVert, fragmentShader: postFrag, depthTest: false, depthWrite: false,
        uniforms: { uScene: { value: rt.texture }, uViewport: { value: new THREE.Vector2() }, uLens: { value: 0 }, uVignette: { value: .45 }, uTime: { value: 0 } },
    })
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat))

    const geo = new THREE.PlaneGeometry(1, 1, 64, 1)
    const viewport = new THREE.Vector2()

    const planes: Plane[] = PROJECTS.map((p, i) => {
        const make = (mirror: boolean) => new THREE.ShaderMaterial({
            vertexShader: planeVert, fragmentShader: planeFrag, transparent: true,
            side: THREE.DoubleSide, depthWrite: !mirror,
            uniforms: {
                uMap: { value: null }, uUvScale: { value: new THREE.Vector2(1, 1) }, uViewport: { value: viewport },
                uRadius: { value: 1 }, uPush: { value: 0 }, uWarp: { value: 0 }, uWave: { value: 0 }, uPhase: { value: 0 },
                uMirror: { value: mirror ? 1 : 0 }, uFloor: { value: 0 }, uHorizon: { value: .3 }, uWater: { value: 0 },
                uLight: { value: 0 }, uOpacity: { value: 0 }, uSplit: { value: 0 }, uReflect: { value: .32 },
            },
        })
        const mesh = new THREE.Mesh(geo, make(false))
        const refl = new THREE.Mesh(geo, make(true))
        refl.renderOrder = -1
        scene.add(refl, mesh)
        return { p, i, mesh, refl, tex: [], shot: 0, split: 0, light: 0 }
    })
    const uni = (m: THREE.Mesh) => (m.material as THREE.ShaderMaterial).uniforms

    /* dust */
    const DUST = 1400
    const seeds = new Float32Array(DUST * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3))
    const dustMat = new THREE.ShaderMaterial({
        vertexShader: dustVert, fragmentShader: dustFrag, transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uSpan: { value: 1 }, uDepth: { value: 6000 }, uTop: { value: 1 }, uFloor: { value: 0 }, uCamZ: { value: 1 }, uDpr: { value: dpr }, uAlpha: { value: 0 } },
    })
    const dust = new THREE.Points(dustGeo, dustMat)
    dust.frustumCulled = false
    scene.add(dust)

    /* state */
    const L = { ww: 1, wh: 1, W: 1, H: 1, pitch: 1, total: 1, camZ: 1, planeY: 0, air: 40, mobile: false }
    let scroll = 0, target = 0, prevScroll = 0
    let mode: 'hall' | 'case' | 'about' = 'hall'
    let caseT = 0, aboutT = 0, introStart = -1, lens = 0
    let active = 0, shownActive = -1
    let dragging = false, dragX = 0, dragStartX = 0, dragVel = 0, moved = 0, lastInput = 0, snapped = true
    const bg = new THREE.Color('#101114'), paper = new THREE.Color('#101114'), tmpC = new THREE.Color()
    const grounds = PROJECTS.map(p => p.ground ? new THREE.Color(p.ground) : null)
    const timers: number[] = []
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)) }

    const wrap = (x: number) => ((x + L.total / 2) % L.total + L.total) % L.total - L.total / 2

    function layout () {
        const ww = innerWidth, wh = innerHeight
        const keep = Math.round(target / L.pitch)
        L.ww = ww; L.wh = wh; L.mobile = ww < 650
        L.W = L.mobile ? ww * .72 : Math.min(Math.max(ww * .3, 320), 620)
        L.H = L.W * 9 / 16
        L.pitch = L.W + (L.mobile ? 30 : 60)
        L.total = L.pitch * N
        L.camZ = wh / 2 / Math.tan(Math.PI * 45 / 360)
        L.planeY = L.mobile ? wh * .08 : wh * .06
        L.air = L.mobile ? 24 : 36
        target = scroll = keep * L.pitch

        camera.aspect = ww / wh
        camera.position.set(0, 0, L.camZ)
        camera.updateProjectionMatrix()
        renderer.setSize(ww, wh, false)
        renderer.getDrawingBufferSize(viewport)
        rt.setSize(viewport.x, viewport.y)
        postMat.uniforms.uViewport.value.copy(viewport)

        const du = dustMat.uniforms
        du.uSpan.value = ww * 3.4
        du.uTop.value = wh * 1.1
        du.uFloor.value = L.planeY - L.H / 2 - L.air
        du.uCamZ.value = L.camZ
        if (mode === 'case') placeThumbBox()
    }

    /* load */
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    let loaded = 0, shownLoad = 0
    const total = N * SHOTS
    const fig = $('#loadFig')
    const loads: Promise<void>[] = []
    planes.forEach(pl => {
        for (let k = 0; k < SHOTS; k++) {
            loads.push(new Promise(res => {
                loader.load(pl.p.shots[k], t => {
                    t.minFilter = THREE.LinearMipmapLinearFilter
                    t.anisotropy = renderer.capabilities.getMaxAnisotropy()
                    pl.tex[k] = t
                    if (k === 0) setMap(pl, 0)
                    loaded++; res()
                }, undefined, () => { loaded++; res() })
            }))
        }
    })
    requestAnimationFrame(() => $('#curtain .mask').classList.add('in'))
    let alive = true
    Promise.all(loads).then(() => {
        const wait = () => { if (!alive) return; shownLoad > .995 ? later(intro, 250) : requestAnimationFrame(wait) }
        wait()
    })

    function setMap (pl: Plane, k: number) {
        const t = pl.tex[k]
        if (!t) return
        pl.shot = k
        const img = t.image as HTMLImageElement
        const aspect = img.width / img.height, plane = 16 / 9
        const sc: [number, number] = aspect > plane ? [plane / aspect, 1] : [1, aspect / plane]
        for (const m of [pl.mesh, pl.refl]) {
            uni(m).uMap.value = t
            uni(m).uUvScale.value.set(...sc)
        }
    }

    function intro () {
        $('#curtain .mask').classList.remove('in')
        later(() => $('#curtain').classList.add('out'), 350)
        introStart = performance.now() + 450
        stagger($('.top'), 600)
        stagger($('.bottom'), 900)
        later(() => { if (location.hash === '#about') setMode('about') }, 1400)
    }

    function stagger (el: HTMLElement, delay = 0, step = .06) {
        el.querySelectorAll<HTMLElement>('.w, .fade').forEach((w, i) => w.style.setProperty('--d', `${i * step}s`))
        later(() => el.classList.add('in'), delay)
    }

    /* texts */
    function roll (el: HTMLElement, text: string) {
        const old = el.querySelector('.w:not(.leave)')
        if (old && old.textContent === text) return
        const w = document.createElement('span')
        w.className = 'w enter'
        w.textContent = text
        el.appendChild(w)
        w.getBoundingClientRect()
        w.classList.remove('enter')
        if (old) { old.classList.add('leave'); later(() => old.remove(), 1100) }
    }

    function fillCase (p: Project) {
        $('#caseName').textContent = p.title
        $('#caseCopy').textContent = p.blurb
        const credits = $('#caseCredits')
        credits.replaceChildren(...p.credits.map(([role, value], i) => {
            const m = document.createElement('span')
            m.className = 'mask'
            m.innerHTML = '<span class="w credit"><span></span><span></span><span></span></span>'
            const cells = m.querySelectorAll('.w > span')
            cells[0].textContent = String(i + 1); cells[1].textContent = role; cells[2].textContent = value
            return m
        }))
        const v = $('#caseVisit') as HTMLAnchorElement
        v.href = p.site || '#'
        v.classList.toggle('hidden', !p.site)
        const th = $('#thumbs')
        th.querySelectorAll('.thumb').forEach(b => b.remove())
        for (let k = 0; k < SHOTS; k++) {
            const b = document.createElement('button')
            b.type = 'button'
            b.className = 'thumb'
            b.style.setProperty('--d', `${.15 + k * .06}s`)
            b.setAttribute('aria-label', `Shot ${k + 1}`)
            const img = document.createElement('img')
            img.alt = ''; img.draggable = false; img.src = p.shots[k]
                        b.appendChild(img)
            b.addEventListener('click', () => showShot(k))
            th.appendChild(b)
        }
        markThumb(planes[active].shot)
    }

    function markThumb (k: number) {
        root.querySelectorAll('.thumb').forEach((b, i) => b.classList.toggle('on', i === k))
        requestAnimationFrame(placeThumbBox)
    }
    function placeThumbBox () {
        const el = root.querySelector('.thumb.on') as HTMLElement | null
        if (el) $('#thumbBox').style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`
    }

    function showShot (k: number) {
        const pl = planes[active]
        k = (k + SHOTS) % SHOTS
        if (k === pl.shot) return
        setMap(pl, k)
        pl.split = .025
        markThumb(k)
    }

    /* modes */
    function setMode (m: typeof mode) {
        if (m === mode) return
        const els: Record<string, HTMLElement[]> = { case: [$('#case'), $('#thumbs')], about: [$('#about'), $('#aboutFoot')] }
        els[mode]?.forEach(e => e.classList.remove('in'))
        mode = m
        if (m === 'case') {
            target = Math.round(target / L.pitch) * L.pitch
            fillCase(PROJECTS[active])
            stagger($('#case'), 350, .05)
            later(() => $('#thumbs').classList.add('in'), 350)
        }
        if (m === 'about') {
            stagger($('#about'), 300, .08)
            stagger($('#aboutFoot'), 700, .08)
        }
        $('#walk').classList.toggle('out', m !== 'hall')
        $('#navAbout').classList.toggle('hidden', m !== 'hall')
        $('#navClose').classList.toggle('hidden', m === 'hall')
        history.replaceState(null, '', m === 'about' ? '#about' : location.pathname)
    }

    const prevent = (fn: () => void) => (e: Event) => { e.preventDefault(); fn() }
    on($('#navAbout'), 'click', prevent(() => setMode('about')))
    on($('#navClose'), 'click', prevent(() => setMode('hall')))
    on($('#home'), 'click', prevent(() => setMode('hall')))

    /* input */
    const ready = () => introStart > 0

    on(canvas, 'pointerdown', (e: PointerEvent) => {
        if (!ready()) return
        dragging = true; dragX = dragStartX = e.clientX; dragVel = 0; moved = 0
        canvas.setPointerCapture(e.pointerId)
        canvas.classList.add('cursor-grabbing')
    })
    on(canvas, 'pointermove', (e: PointerEvent) => {
        if (!dragging) return
        const dx = e.clientX - dragX
        dragX = e.clientX
        moved = Math.max(moved, Math.abs(e.clientX - dragStartX))
        if (mode === 'hall') {
            target -= dx * (L.mobile ? 1.6 : 1.2)
            dragVel = lerp(dragVel, dx, .4)
            snapped = false; lastInput = performance.now()
        }
    })
    const release = (e: PointerEvent) => {
        if (!dragging) return
        dragging = false
        canvas.classList.remove('cursor-grabbing')
        const dx = e.clientX - dragStartX
        if (mode === 'hall') {
            if (moved < 6) return click(e.clientX)
            target -= dragVel * 10
            lastInput = performance.now(); snapped = false
        } else if (mode === 'case') {
            if (moved < 6) return showShot(planes[active].shot + 1)
            if (Math.abs(dx) > 40) showShot(planes[active].shot + (dx < 0 ? 1 : -1))
        } else if (mode === 'about' && moved < 6) setMode('hall')
    }
    on(canvas, 'pointerup', release)
    on(canvas, 'pointercancel', release)

    function click (cx: number) {
        const d = cx - L.ww / 2
        if (Math.abs(d) < L.W * .62) return setMode('case')
        target = Math.round(target / L.pitch + Math.sign(d) * Math.max(1, Math.round(Math.abs(d) / (L.pitch * 1.15)))) * L.pitch
        lastInput = performance.now(); snapped = true
    }

    on(window, 'wheel', (e: WheelEvent) => {
        if (!ready()) return
        e.preventDefault()
        if (mode === 'case') {
            if (Math.abs(e.deltaY) + Math.abs(e.deltaX) > 30 && performance.now() - lastInput > 600) {
                showShot(planes[active].shot + Math.sign(e.deltaY || e.deltaX)); lastInput = performance.now()
            }
            return
        }
        if (mode === 'about') return
        target += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 30 : 1)
        snapped = false; lastInput = performance.now()
    }, { passive: false })

    on(window, 'keydown', (e: KeyboardEvent) => {
        if (!ready()) return
        if (e.key === 'Escape') return setMode('hall')
        const dir = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
        if (e.key === 'Enter' && mode === 'hall') return setMode('case')
        if (!dir) return
        if (mode === 'case') return showShot(planes[active].shot + dir)
        if (mode === 'hall') { target = (Math.round(target / L.pitch) + dir) * L.pitch; snapped = true }
    })

    on(window, 'resize', layout)

    /* loop */
    const horizonV = new THREE.Vector3()
    let last = performance.now(), raf = 0
    function frame (now: number) {
        raf = requestAnimationFrame(frame)
        const r = Math.min((now - last) / 16.667, 4)
        last = now
        const t = now / 1000
        const k = (rate: number) => 1 - (1 - rate) ** r

        shownLoad = lerp(shownLoad, loaded / total, k(.08))
        if (introStart < 0) fig.textContent = String(Math.round(shownLoad * 100)).padStart(3, '0')

        if (!dragging && !snapped && now - lastInput > 140) {
            target = Math.round(target / L.pitch) * L.pitch
            snapped = true
        }
        scroll = lerp(scroll, target, k(dragging ? .2 : .075))
        const vel = (scroll - prevScroll) / r
        prevScroll = scroll

        active = ((Math.round(scroll / L.pitch) % N) + N) % N
        if (active !== shownActive && ready()) {
            shownActive = active
            roll($('#walk'), PROJECTS[active].title)
            roll($('#index'), pad2(active + 1))
        }

        caseT = lerp(caseT, mode === 'case' ? 1 : 0, k(.065))
        aboutT = lerp(aboutT, mode === 'about' ? 1 : 0, k(.06))
        lens = lerp(lens, .22 + Math.min(Math.abs(vel) / 45, 1) * .9 + caseT * .1, k(.1))

        const ground = grounds[active]
        tmpC.copy(paper)
        if (ground) tmpC.lerp(ground, .18 + caseT * .22)
        bg.lerp(tmpC, k(.04))
        renderer.setClearColor(bg, 1)

        const left = L.mobile ? 0 : 30 + Math.min(L.ww * .3, 400) + 40
        const right = L.mobile ? L.ww : L.ww - 30 - 90 - 50
        const caseW = L.mobile ? L.ww - 40 : Math.min(right - left, (L.wh * .6) * 16 / 9)
        const caseX = L.mobile ? 0 : (left + right) / 2 - L.ww / 2
        const caseY = L.mobile ? L.wh * .24 : L.planeY + L.wh * .02
        const radius = L.pitch * 1.15
        const push = (L.camZ * .24) / radius
        const ip = ready() ? now - introStart : -1e9

        for (const pl of planes) {
            const x0 = wrap(pl.i * L.pitch - scroll)
            const isActive = pl.i === active
            const intro = expoOut(clamp01((ip - Math.abs(x0) / L.pitch * 110) / 1300))

            let s = 1, x = x0, y = L.planeY, z = 0, op = 1
            if (isActive) {
                s = lerp(1, caseW / L.W, caseT)
                x = lerp(x0, caseX, caseT)
                y = lerp(L.planeY, caseY, caseT)
            } else {
                x = x0 + Math.sign(x0 || 1) * L.ww * .45 * caseT
                op *= 1 - caseT
            }
            x += L.ww * (L.mobile ? 0 : .3) * aboutT
            z -= 900 * aboutT
            op *= 1 - .78 * aboutT
            y -= (1 - intro) * L.H * .6
            op *= intro

            pl.light = lerp(pl.light, isActive && mode === 'case' ? 1 : 0, k(.08))
            pl.split = lerp(pl.split, 0, k(.06))

            const w = L.W * s, h = L.H * s
            const floor = y - h / 2 - L.air
            horizonV.set(x, floor, z).project(camera)

            for (const m of [pl.mesh, pl.refl]) {
                m.position.set(x, y, z)
                m.scale.set(w, h, 1)
                const u = uni(m)
                u.uRadius.value = radius
                u.uPush.value = push * (1 - caseT) * (1 - aboutT)
                u.uWarp.value = Math.max(-70, Math.min(70, vel * 1.4)) * (1 - caseT)
                u.uWave.value = Math.min(Math.abs(vel) * .9, 50)
                u.uPhase.value = t * 2
                u.uFloor.value = floor
                u.uHorizon.value = horizonV.y * .5 + .5
                u.uWater.value = t
                u.uLight.value = pl.light
                u.uOpacity.value = op
                u.uSplit.value = pl.split
            }
            pl.mesh.visible = pl.refl.visible = op > .002
        }

        const du = dustMat.uniforms
        du.uTime.value = t
        du.uScroll.value = scroll
        du.uAlpha.value = lerp(du.uAlpha.value, ready() ? .3 : 0, k(.02))

        postMat.uniforms.uLens.value = lens
        postMat.uniforms.uTime.value = t

        renderer.setRenderTarget(rt)
        renderer.clear()
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)
        renderer.render(postScene, postCam)
    }

    layout()
    raf = requestAnimationFrame(frame)

    return () => {
        alive = false
        cancelAnimationFrame(raf)
        timers.forEach(clearTimeout)
        off.forEach(f => f())
        planes.forEach(pl => { pl.tex.forEach(t => t.dispose()); (pl.mesh.material as THREE.Material).dispose(); (pl.refl.material as THREE.Material).dispose() })
        geo.dispose(); dustGeo.dispose(); dustMat.dispose(); postMat.dispose(); rt.dispose()
        renderer.dispose()
    }
}
