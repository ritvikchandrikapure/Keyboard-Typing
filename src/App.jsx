import { useState, useEffect, useRef, useMemo } from 'react'
import { EXERCISES, LEVELS, ROWS, baseKey, fingerOf, genWords } from './data'
import './App.css'

/* ---------- storage + analytics helpers ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } }

const dayKey = (t) => new Date(t).toDateString()
function streakOf(history) {
  const days = new Set(history.map((h) => dayKey(h.date)))
  let n = 0, d = new Date()
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}
const weakKeysOf = (rows, limit = 5) => {
  const t = {}
  rows.forEach((r) => Object.entries(r.keyErrors || {}).forEach(([k, v]) => (t[k] = (t[k] || 0) + v)))
  return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, limit)
}
const std = (a) => { if (!a.length) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) }
const xpOf = (h) => Math.round(h.reduce((s, r) => s + r.wpm * (r.acc / 100) * 2, 0))
const levelOf = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1
const taskText = (t, name) => (t.text || '').replaceAll('{name}', name || 'Ritvik')
const taskTitle = (t, name) => t.title.replace('{name}', name || 'Ritvik')

function suggestions(r, best) {
  const s = []
  const weak = (r.weak || []).map(([k]) => (k === ' ' ? 'Space' : k.toUpperCase()))
  if (r.acc < 90) s.push(['Slow down to clean up', `${r.errors} mistakes cost you speed. Drop to about 70% of your pace until accuracy passes 95%.`])
  else if (r.acc >= 97 && r.wpm < 40) s.push(['Accuracy is solid. Add speed.', 'You rarely miss, so push your tempo a little. Aim for steady rhythm rather than bursts.'])
  if (weak.length) s.push([`Drill ${weak.slice(0, 3).join(', ')}`, 'These keys caused most of your errors. Use the recommended tasks below to practise them.'])
  if (std(r.series) > 12) s.push(['Even out your rhythm', 'Your speed swung a lot. Try a metronome feel: same beat between every key.'])
  if (r.wpm >= 60 && r.acc >= 96) s.push(['Level up', 'Strong numbers. Move to Advanced tasks: punctuation, code and paragraphs.'])
  if (best && r.wpm > best) s.push(['New personal best', `You beat your previous best of ${best} WPM.`])
  if (!s.length) s.push(['Keep the streak going', 'A short session every day beats one long session a week.'])
  return s
}
function recommend(weakKeys, doneIds, name) {
  const keys = weakKeys.map(([k]) => k)
  const scored = EXERCISES.filter((t) => !t.time).map((t) => ({ t, score: [...taskText(t, name).toLowerCase()].filter((c) => keys.includes(baseKey(c))).length }))
  scored.sort((a, b) => b.score - a.score || doneIds.includes(a.t.id) - doneIds.includes(b.t.id))
  return scored.slice(0, 3).map((x) => x.t)
}

/* ---------- small visual pieces ---------- */
function Ring({ value, label }) {
  const r = 46, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 120 120" className="ring" role="img" aria-label={`${label} ${value}%`}>
      <circle cx="60" cy="60" r={r} className="ring-bg" />
      <circle cx="60" cy="60" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)} />
      <text x="60" y="58" textAnchor="middle" className="ring-num">{value}%</text>
      <text x="60" y="76" textAnchor="middle" className="ring-lab">{label}</text>
    </svg>
  )
}
const nice = (m) => Math.max(10, Math.ceil(m / 10) * 10)
const W = 560, H = 230, PL = 38, PR = 38, PT = 14, PB = 28

function Chart({ series, raw, errs }) {
  const [hv, setHv] = useState(null)
  const n = series.length
  if (n < 2) return <p className="muted">Speed curve needs a few seconds of data. Try a longer task.</p>
  const max = nice(Math.max(...series, ...raw))
  const x = (i) => PL + (i / (n - 1)) * (W - PL - PR)
  const y = (v) => H - PB - (v / max) * (H - PT - PB)
  const path = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const step = Math.ceil(n / 8)
  const move = (e) => {
    const bb = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - bb.left) / bb.width) * W
    setHv(Math.min(n - 1, Math.max(0, Math.round(((px - PL) / (W - PL - PR)) * (n - 1)))))
  }
  return (
    <div>
      <div className="legend"><span><i className="sw pink" />WPM (correct)</span><span><i className="sw amber" />Raw speed</span><span><i className="sw dot" />Mistake</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" onMouseMove={move} onMouseLeave={() => setHv(null)} role="img" aria-label="Speed over time">
        <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5d8f" stopOpacity=".35" /><stop offset="1" stopColor="#ff5d8f" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}><line x1={PL} x2={W - PR} y1={y((max / 4) * t)} y2={y((max / 4) * t)} className="gl" /><text x={PL - 8} y={y((max / 4) * t) + 4} textAnchor="end" className="ax">{Math.round((max / 4) * t)}</text></g>
        ))}
        {series.map((_, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="ax">{i + 1}s</text>)}
        <path d={`${path(series)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#g1)" />
        <path d={path(raw)} className="l-raw" />
        <path d={path(series)} className="l-wpm" />
        {errs.map((e, i) => e > (errs[i - 1] || 0) && <circle key={i} cx={x(i)} cy={y(0) - 5} r="4" className="err-dot" />)}
        {hv !== null && (<g><line x1={x(hv)} x2={x(hv)} y1={PT} y2={y(0)} className="cursor" /><circle cx={x(hv)} cy={y(series[hv])} r="5" fill="#ff5d8f" stroke="#fff" strokeWidth="2" /></g>)}
      </svg>
      <div className="readout">{hv !== null ? `Second ${hv + 1}: ${series[hv]} WPM · raw ${raw[hv]} · ${errs[hv]} mistakes so far` : 'Hover the chart to inspect each second'}</div>
    </div>
  )
}

function Trend({ rows }) {
  const [hv, setHv] = useState(null)
  const d = rows.slice(-12)
  if (d.length < 2) return <p className="muted">Finish two sessions to see your trend.</p>
  const n = d.length, max = nice(Math.max(...d.map((r) => r.wpm)))
  const x = (i) => PL + (i / (n - 1)) * (W - PL - PR)
  const yw = (v) => H - PB - (v / max) * (H - PT - PB)
  const ya = (v) => H - PB - (Math.max(v - 50, 0) / 50) * (H - PT - PB)
  const path = (f, k) => d.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${f(r[k]).toFixed(1)}`).join(' ')
  const move = (e) => {
    const bb = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - bb.left) / bb.width) * W
    setHv(Math.min(n - 1, Math.max(0, Math.round(((px - PL) / (W - PL - PR)) * (n - 1)))))
  }
  const cur = hv ?? n - 1
  return (
    <div>
      <div className="legend"><span><i className="sw pink" />WPM (left axis)</span><span><i className="sw mint" />Accuracy % (right axis)</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" onMouseMove={move} onMouseLeave={() => setHv(null)} role="img" aria-label="Progress over sessions">
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}><line x1={PL} x2={W - PR} y1={yw((max / 4) * t)} y2={yw((max / 4) * t)} className="gl" />
            <text x={PL - 8} y={yw((max / 4) * t) + 4} textAnchor="end" className="ax">{Math.round((max / 4) * t)}</text>
            <text x={W - PR + 8} y={yw((max / 4) * t) + 4} className="ax">{50 + t * 12.5 > 99 ? 100 : Math.round(50 + t * 12.5)}</text></g>
        ))}
        <path d={path(ya, 'acc')} className="l-acc" />
        <path d={path(yw, 'wpm')} className="l-wpm" />
        {d.map((r, i) => <circle key={i} cx={x(i)} cy={yw(r.wpm)} r={i === cur ? 6 : 3.5} fill="#ff5d8f" stroke="#fff" strokeWidth={i === cur ? 2 : 0} />)}
        {d.map((_, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="ax">#{rows.length - n + i + 1}</text>)}
      </svg>
      <div className="readout">Session #{rows.length - n + cur + 1}: {d[cur].wpm} WPM · {d[cur].acc}% accuracy · {new Date(d[cur].date).toLocaleDateString()}</div>
    </div>
  )
}

/* ---------- sound (tiny synth, no audio files) ---------- */
let ac
const beep = (on, type) => {
  if (!on) return
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)()
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), bell = type === 'bell'
    o.type = bell ? 'sine' : 'square'
    o.frequency.value = bell ? 1760 : type === 'err' ? 110 : 330 + Math.random() * 70
    g.gain.setValueAtTime(bell ? 0.12 : 0.035, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + (bell ? 1.3 : 0.06))
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + (bell ? 1.3 : 0.07))
  } catch { }
}
function useCount(to, ms = 1000) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, t0
    const f = (t) => { t0 ??= t; const p = Math.min((t - t0) / ms, 1); setV(Math.round(to * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return v
}
const rankOf = (w) => (w >= 70 ? 'Court Reporter' : w >= 50 ? 'Secretary' : w >= 35 ? 'Clerk' : w >= 20 ? 'Typist' : 'Intern')
const lastDays = (h) => {
  const set = new Set(h.map((r) => dayKey(r.date)))
  return Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return set.has(dayKey(d)) })
}

const starsOf = (r) => 1 + (r.acc >= 90) + (r.acc >= 96 && r.wpm >= 30)
const LVCOL = { Beginner: '#2fd08b', Intermediate: '#ffb020', Advanced: '#ff5c7a' }

/* ---------- mascot ---------- */
function Mascot({ mood = 'idle', look = 0, size = 1 }) {
  return (
    <div className={`mascot ${mood}`} style={{ '--look': `${look * 4}px`, '--sz': size }} aria-hidden="true">
      <div className="m-body">
        <div className="m-eyes"><i /><i /></div>
        <b className="m-mouth" />
        <u className="m-cheek l" /><u className="m-cheek r" />
      </div>
    </div>
  )
}

/* ---------- keyboard ---------- */
function Keyboard({ next, flash, press, heat }) {
  const nk = baseKey(next)
  const hmax = heat ? Math.max(1, ...Object.values(heat)) : 1
  return (
    <div className="kb" aria-hidden="true">
      {ROWS.map((row, i) => (
        <div className="kb-row" key={i} style={{ paddingLeft: [0, 16, 30, 52, 0][i] }}>
          {row.map((k) => (
            <div key={k} style={heat && heat[k] ? { '--heat': heat[k] / hmax } : undefined}
              className={`key${k === ' ' ? ' space' : ''}${!heat && k === nk ? ' next' : ''}${flash === k ? ' bad' : ''}${press === k ? ' down' : ''}${heat && heat[k] ? ' hot' : ''}`}>
              {k === ' ' ? '' : k}{heat && heat[k] ? <sup>{heat[k]}</sup> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ---------- play screen ---------- */
function Arena({ task, name, sound, onFinish, onRestart, onExit }) {
  const text = useMemo(() => (task.time ? genWords() : taskText(task, name)), [task, name])
  const [typed, setTyped] = useState('')
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [flash, setFlash] = useState('')
  const [press, setPress] = useState('')
  const [mood, setMood] = useState('idle')
  const [combo, setCombo] = useState(0)
  const [toast, setToast] = useState(null)
  const [shake, setShake] = useState(0)
  const typedRef = useRef('')
  const mt = useRef()
  const sr = useRef(sound); sr.current = sound
  const s = useRef({ start: 0, keys: 0, errs: 0, ke: {}, series: [], rawS: [], errS: [], combo: 0, maxCombo: 0, done: false })
  const correctOf = (t) => { let c = 0; for (let i = 0; i < t.length; i++) if (t[i] === text[i]) c++; return c }

  const finish = () => {
    const st = s.current
    if (st.done) return
    st.done = true
    const t = typedRef.current
    const secs = task.time ? task.time : Math.max((Date.now() - st.start) / 1000, 1)
    const acc = st.keys ? Math.max(0, Math.round(((st.keys - st.errs) / st.keys) * 100)) : 100
    onFinish({ taskId: task.id, date: Date.now(), secs: Math.round(secs), wpm: Math.round(correctOf(t) / 5 / (secs / 60)), raw: Math.round(t.length / 5 / (secs / 60)), acc, errors: st.errs, chars: t.length, maxCombo: st.maxCombo, series: st.series, rawS: st.rawS, errS: st.errS, keyErrors: st.ke })
  }
  const feel = (m, ms) => { setMood(m); clearTimeout(mt.current); mt.current = setTimeout(() => setMood('idle'), ms) }

  useEffect(() => {
    const down = (e) => {
      const st = s.current
      if (st.done || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') { onRestart(); return }
      if (e.key === 'Backspace') { e.preventDefault(); typedRef.current = typedRef.current.slice(0, -1); setTyped(typedRef.current); return }
      if (e.key.length !== 1) return
      e.preventDefault()
      setPress(baseKey(e.key))
      if (!st.start) { st.start = Date.now(); setStarted(true) }
      const cur = typedRef.current, exp = text[cur.length]
      st.keys++
      if (e.key !== exp) {
        st.errs++; st.combo = 0; setCombo(0)
        const b = baseKey(exp)
        st.ke[b] = (st.ke[b] || 0) + 1
        setFlash(b); setShake((n) => n + 1); feel('oops', 500); beep(sr.current, 'err')
        setTimeout(() => setFlash(''), 250)
      } else {
        st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo); setCombo(st.combo)
        feel('happy', 220); beep(sr.current, 'key')
        const msg = { 10: 'Nice!', 25: 'On fire!', 50: 'Unstoppable!', 100: 'LEGEND!' }[st.combo]
        if (msg) setToast({ msg, id: Date.now() })
      }
      typedRef.current = cur + e.key
      setTyped(typedRef.current)
      if (typedRef.current.length >= text.length) finish()
    }
    const up = () => setPress('')
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); clearTimeout(mt.current) }
  }, [text])

  useEffect(() => {
    if (!started) return
    const id = setInterval(() => {
      const st = s.current
      if (st.done) return
      const secs = (Date.now() - st.start) / 1000
      setElapsed(secs)
      if (Math.floor(secs) > st.series.length) {
        st.series.push(Math.round(correctOf(typedRef.current) / 5 / (secs / 60)))
        st.rawS.push(Math.round(typedRef.current.length / 5 / (secs / 60)))
        st.errS.push(st.errs)
      }
      if (task.time && secs >= task.time) finish()
    }, 250)
    return () => clearInterval(id)
  }, [started])

  const liveWpm = started ? Math.round(correctOf(typed) / 5 / (Math.max(elapsed, 1) / 60)) : 0
  const { keys, errs } = s.current
  const liveAcc = keys ? Math.round(((keys - errs) / keys) * 100) : 100
  const progress = task.time ? Math.min(elapsed / task.time, 1) : typed.length / text.length
  const shown = task.time ? Math.max(0, typed.length - 50) : 0

  return (
    <section className="arena">
      <div className="arena-top">
        <button className="chunk ghost" onClick={onExit}>← Map</button>
        <h2>{taskTitle(task, name)}</h2>
        <button className="chunk ghost" onClick={onRestart}>Restart <span className="hk">Esc</span></button>
      </div>
      <div className="play-row">
        <div className="mascot-wrap">
          <Mascot mood={started ? mood : 'wave'} look={progress * 2 - 1} />
          <div className={`combo${combo >= 5 ? ' hot' : ''}`} key={combo >= 5 ? Math.floor(combo / 5) : 0}><span className="flame">🔥</span> x{combo}</div>
          {toast && <div className="toast" key={toast.id}>{toast.msg}</div>}
        </div>
        <div className="chips">
          <div><b>{liveWpm}</b><span>WPM</span></div>
          <div><b>{liveAcc}%</b><span>accuracy</span></div>
          <div><b>{errs}</b><span>typos</span></div>
          <div><b>{task.time ? Math.max(Math.ceil(task.time - elapsed), 0) : Math.round(elapsed)}s</b><span>{task.time ? 'left' : 'time'}</span></div>
        </div>
      </div>
      <div className="bar"><i style={{ width: `${Math.max(progress * 100, 2)}%` }} /></div>
      <div className={`typecard${shake ? ' shk' : ''}`} key={'tc' + (shake % 2)}>
        {!started && <p className="start-hint">Start typing whenever you are ready ✨</p>}
        <p className="text" aria-label="Text to type">
          {[...text].slice(shown, shown + (task.time ? 240 : text.length)).map((c, j) => {
            const i = j + shown
            const cls = i < typed.length ? (typed[i] === c ? 'ok' : 'err') : i === typed.length ? 'cur' : ''
            return <span key={i} className={cls}>{c}</span>
          })}
        </p>
      </div>
      <Keyboard next={text[typed.length]} flash={flash} press={press} />
    </section>
  )
}

/* ---------- level complete ---------- */
const Confetti = () => {
  const bits = useMemo(() => Array.from({ length: 48 }, (_, i) => ({ x: Math.random() * 100, d: 2.2 + Math.random() * 2.4, w: Math.random() * 1, c: ['#3a5bff', '#ffcf33', '#ff6b6b', '#2fd08b', '#b36bff'][i % 5], r: Math.random() * 360, round: i % 3 === 0 })), [])
  return <div className="confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ left: `${b.x}%`, background: b.c, animationDuration: `${b.d}s`, animationDelay: `${b.w}s`, borderRadius: b.round ? '50%' : '2px', '--r': `${b.r}deg` }} />)}</div>
}

function Report({ r, best, name, history, nextTask, sound, onRetry, onNext, onPick, onHome }) {
  const task = EXERCISES.find((t) => t.id === r.taskId)
  const weak = weakKeysOf([r])
  const tips = suggestions({ ...r, weak }, best)
  const rec = recommend(weak.length ? weak : weakKeysOf(history), history.map((h) => h.taskId), name).filter((t) => t.id !== r.taskId)
  const consistency = Math.max(0, Math.round(100 - (std(r.series) / Math.max(r.wpm, 1)) * 100))
  const stars = starsOf(r)
  const title = stars === 3 ? 'Flawless!' : stars === 2 ? 'Great job!' : 'Level complete!'
  const wpm = useCount(r.wpm)
  const diff = best ? r.wpm - best : 0
  useEffect(() => {
    beep(sound, 'bell')
    const k = (e) => { if (e.key === 'Enter') onNext(); else if (e.key.toLowerCase() === 'r') onRetry() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  const Actions = (
    <div className="nextbar">
      <button className="chunk green" onClick={onNext}>Next: {taskTitle(nextTask, name)} <span className="hk">Enter</span></button>
      <button className="chunk blue" onClick={onRetry}>Try again <span className="hk">R</span></button>
      <button className="chunk ghost dark" onClick={onHome}>Back to map</button>
    </div>
  )
  return (
    <section className="report">
      {stars >= 2 && <Confetti />}
      <div className="win">
        <Mascot mood="cheer" size={1.3} />
        <h1>{title}</h1>
        <p className="win-sub">{taskTitle(task, name)}{best && diff > 0 ? ` · new personal best, +${diff} WPM` : ''}</p>
        <div className="stars big">{[0, 1, 2].map((j) => <i key={j} className={j < stars ? 'on' : ''} style={{ animationDelay: `${0.4 + j * 0.35}s` }} />)}</div>
        <div className="score"><b>{wpm}</b><span>words per minute</span></div>
        <div className="rings"><Ring value={r.acc} label="accuracy" /><Ring value={consistency} label="steady" /></div>
        <div className="pills"><span>⚡ raw {r.raw} WPM</span><span>🔥 best combo x{r.maxCombo || 0}</span><span>✗ {r.errors} typos</span><span>⏱ {r.secs}s</span></div>
        {Actions}
      </div>
      <div className="card white"><h3>Speed, second by second</h3><Chart series={r.series} raw={r.rawS || r.series} errs={r.errS || []} /></div>
      <div className="two">
        <div className="card white"><h3>Typo heatmap</h3>{weak.length ? <Keyboard heat={r.keyErrors} /> : <p className="muted">Zero typos. Perfect run! 🎯</p>}</div>
        <div className="card yellow"><h3>Coach says</h3><ul className="tips">{tips.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul></div>
      </div>
      <div className="card white"><h3>Your last sessions</h3><Trend rows={history} /></div>
      {rec.length > 0 && (
        <div><h3 className="sec-h">Picked for your fingers</h3>
          <div className="recs">{rec.map((t) => <button key={t.id} className="rec" onClick={() => onPick(t)}><b>{taskTitle(t, name)}</b><span>{t.blurb}</span></button>)}</div>
        </div>
      )}
      {Actions}
    </section>
  )
}

/* ---------- app ---------- */
export default function App() {
  const [history, setHistory] = useState(() => load('kc-history', []))
  const [name, setName] = useState(() => load('kc-name', 'Ritvik'))
  const [sound, setSound] = useState(() => load('kc-sound', true))
  const [view, setView] = useState('home')
  const [task, setTask] = useState(null)
  const [run, setRun] = useState(0)
  const [result, setResult] = useState(null)
  const [best, setBest] = useState(0)

  useEffect(() => save('kc-name', name), [name])
  useEffect(() => save('kc-sound', sound), [sound])
  const bestWpm = Math.max(0, ...history.map((h) => h.wpm))
  const recent = history.slice(-5)
  const rank = rankOf(recent.length ? Math.round(recent.reduce((a, h) => a + h.wpm, 0) / recent.length) : 0)
  const today = history.filter((h) => dayKey(h.date) === dayKey(Date.now())).length
  const doneIds = new Set(history.map((h) => h.taskId))
  const cur = Math.max(0, EXERCISES.findIndex((t) => !doneIds.has(t.id)))
  const idx = task ? EXERCISES.findIndex((t) => t.id === task.id) : 0
  const nextTask = EXERCISES[(idx + 1) % EXERCISES.length]

  const start = (t) => { setTask(t); setRun((n) => n + 1); setView('type') }
  const smart = () => start(recommend(weakKeysOf(history.slice(-10)), [...doneIds], name)[0] || EXERCISES[0])
  const done = (r) => {
    const next = [...history, r].slice(-100)
    setBest(bestWpm); setHistory(next); save('kc-history', next); setResult(r); setView('report')
  }

  return (
    <div className="app">
      <div className="blobs" aria-hidden="true"><i /><i /><i /></div>
      <header className="top">
        <button className="logo" onClick={() => setView('home')}><Mascot size={0.36} /><span>Tappy</span></button>
        <div className="top-right">
          <label className="name">Hi, <input value={name} maxLength={14} onChange={(e) => setName(e.target.value)} aria-label="Your name" /></label>
          <span className="chip">🔥 {streakOf(history)}</span>
          <button className="chip btnchip" onClick={() => setSound(!sound)} aria-pressed={sound}>{sound ? '🔊' : '🔇'}</button>
        </div>
      </header>

      <main key={view + run} className="page">
        {view === 'home' && (
          <>
            <section className="hero">
              <div className="hero-text">
                <p className="eyebrow">{rank} · best {bestWpm} WPM</p>
                <h1>Type faster.<br />One level at a time.</h1>
                <p>Short, playful rounds with combos, stars and a coach that tells you exactly which keys to fix.</p>
                <button className="chunk yellow big" onClick={smart}>{history.length ? '▶ Continue' : '▶ Play now'}</button>
              </div>
              <div className="hero-art"><Mascot mood="wave" size={2.2} /><span className="k k1">A</span><span className="k k2">S</span><span className="k k3">D</span><span className="k k4">F</span></div>
            </section>

            <section className="daily card white">
              <div><b>Daily goal</b><span>{Math.min(today, 3)} of 3 rounds today</span></div>
              <div className="bar"><i style={{ width: `${Math.min(today / 3, 1) * 100}%` }} /></div>
              <div className="days">{lastDays(history).map((d, i) => <i key={i} className={d ? 'on' : ''} title="last 14 days" />)}</div>
            </section>

            <h2 className="sec-h">Your road</h2>
            <section className="road">
              {EXERCISES.map((t, i) => {
                const runs = history.filter((h) => h.taskId === t.id)
                const st = Math.max(0, ...runs.map(starsOf))
                return (
                  <div key={t.id} className="stop" style={{ '--x': `${Math.sin(i * 1.15) * 90}px`, '--c': LVCOL[t.level], '--i': i }}>
                    {i === cur && <span className="go">START</span>}
                    <button className={`node${i === cur ? ' cur' : ''}${runs.length ? ' done' : ''}`} onClick={() => start(t)} aria-label={`Play ${taskTitle(t, name)}`}>{runs.length ? '✓' : i + 1}</button>
                    <div className="stars">{[0, 1, 2].map((j) => <i key={j} className={j < st ? 'on' : ''} />)}</div>
                    <p className="lbl"><b>{taskTitle(t, name)}</b><small>{t.level} · {t.blurb}</small></p>
                  </div>
                )
              })}
            </section>

            <h2 className="sec-h">Progress</h2>
            <div className="card white"><Trend rows={history} /></div>
          </>
        )}
        {view === 'type' && task && <Arena key={run} task={task} name={name} sound={sound} onFinish={done} onRestart={() => setRun((n) => n + 1)} onExit={() => setView('home')} />}
        {view === 'report' && result && <Report r={result} best={best} name={name} history={history} nextTask={nextTask} sound={sound} onRetry={() => start(task)} onNext={() => start(nextTask)} onPick={start} onHome={() => setView('home')} />}
      </main>
    </div>
  )
}
