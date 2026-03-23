import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useStore, calcVolume, MAX_SAND } from '../lib/store'
import BuildPanel from '../components/BuildPanel'
import ShapeList from '../components/ShapeList'
import PresentPanel from '../components/PresentPanel'

const Scene = dynamic(() => import('../components/Scene'), { ssr: false })

// Encode/decode castle state to/from a URL hash
function encodeCastle(shapes, studentName) {
  try {
    return btoa(encodeURIComponent(JSON.stringify({ shapes, studentName })))
  } catch { return null }
}

function decodeCastle(str) {
  try {
    return JSON.parse(decodeURIComponent(atob(str)))
  } catch { return null }
}

export default function Home() {
  const shapes      = useStore(s => s.shapes)
  const selectedId  = useStore(s => s.selectedId)
  const selectShape = useStore(s => s.selectShape)
  const addShape    = useStore(s => s.addShape)
  const updatePos   = useStore(s => s.updateShapePosition)
  const removeShape = useStore(s => s.removeShape)
  const clearAll    = useStore(s => s.clearAll)
  const mode        = useStore(s => s.mode)
  const setMode     = useStore(s => s.setMode)
  const studentName = useStore(s => s.studentName)
  const setStudentName = useStore(s => s.setStudentName)
  const sandUsed    = useStore(s => s.sandUsed())

  const [pendingShape,  setPendingShape]  = useState(null)  // new shape being placed
  const [movingShapeId, setMovingShapeId] = useState(null)  // existing shape being repositioned
  const [notification,  setNotification]  = useState(null)
  const [autoRotate,    setAutoRotate]    = useState(false)
  const [hydrated,      setHydrated]      = useState(false)
  const [sharePulse,    setSharePulse]    = useState(false)
  const [viewOnly,      setViewOnly]      = useState(false) // true when opened via share link

  // ── Hydration + share link detection
  useEffect(() => {
    setHydrated(true)
    const hash = window.location.hash
    if (hash.startsWith('#castle=')) {
      const data = decodeCastle(hash.replace('#castle=', ''))
      if (data?.shapes) {
        // Load shared castle — clear existing and populate
        clearAll()
        data.shapes.forEach(s => {
          const result = addShape(s.type, s.radius, s.height)
          if (result.ok) {
            const id = useStore.getState().shapes.at(-1)?.id
            if (id !== undefined) updatePos(id, s.x, s.y, s.z)
          }
        })
        if (data.studentName) setStudentName(data.studentName)
        setMode('present')
        setAutoRotate(true)
        setViewOnly(true)
        // Clean the hash from the URL without reloading
        history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  // ── Escape cancels any active placement/move
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') cancelActive()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const notify = useCallback((text, type = 'info', persist = false) => {
    setNotification({ text, type })
    if (!persist) setTimeout(() => setNotification(null), 3500)
  }, [])

  const cancelActive = useCallback(() => {
    setPendingShape(null)
    setMovingShapeId(null)
    selectShape(null)
    setNotification(null)
  }, [selectShape])

  // ── Add a new shape (enters placement mode)
  const handleAddShape = (type, radius, height) => {
    const r = parseFloat(radius)
    const h = parseFloat(height) || r * 2
    const vol = calcVolume(type, r, h)
    if (sandUsed + vol > MAX_SAND) {
      return { ok: false, reason: 'Not enough sand! Try a smaller shape.' }
    }
    cancelActive()
    setPendingShape({ type, radius: r, height: h, volume: vol })
    notify('Move your mouse over the sand — blue = valid, red = blocked. Click to place.', 'info', true)
    return { ok: true }
  }

  // ── Called by Scene when user clicks on a valid spot for a NEW shape
  const handlePlaceShape = useCallback(({ x, z, y }) => {
    if (!pendingShape) return
    const result = addShape(pendingShape.type, pendingShape.radius, pendingShape.height)
    if (!result.ok) { notify(result.reason, 'error'); setPendingShape(null); return }
    const newId = useStore.getState().shapes.at(-1)?.id
    if (newId !== undefined) updatePos(newId, x, y, z)
    setPendingShape(null)
    setNotification(null)
    notify('Placed! Click any shape to move it.', 'success')
  }, [pendingShape, addShape, updatePos, notify])

  // ── Called by Scene when user clicks a valid spot to DROP a shape they're moving
  const handleMoveShape = useCallback(({ id, x, z, y }) => {
    updatePos(id, x, y, z)
    setMovingShapeId(null)
    selectShape(null)
    setNotification(null)
    notify('Moved!', 'success')
  }, [updatePos, selectShape, notify])

  // ── Called by Scene when user clicks a placed shape (pick it up to move)
  const handleSelectShape = useCallback((id) => {
    if (id === null) { cancelActive(); return }
    if (pendingShape) return // already placing something
    selectShape(id)
    setMovingShapeId(id)
    notify('Move your mouse and click to reposition. Press Escape to cancel.', 'info', true)
  }, [pendingShape, selectShape, cancelActive, notify])

  // ── Called by Scene when user tries to place in a red (invalid) spot
  const handleInvalidAttempt = useCallback((message) => {
    notify('❌ ' + message, 'error')
  }, [notify])

  const handleDeleteSelected = () => {
    if (!selectedId) return
    if (movingShapeId === selectedId) setMovingShapeId(null)
    removeShape(selectedId)
    selectShape(null)
    setNotification(null)
  }

  // ── Share link
  const handleShare = () => {
    const name = studentName.trim()
    if (!name) {
      notify('Enter your name first before sharing!', 'error')
      return
    }
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify({ shapes, studentName: name })))
      const url = `${window.location.origin}${window.location.pathname}#castle=${encoded}`
      navigator.clipboard.writeText(url).then(() => {
        showNotification('Link copied! Share it with your teacher. 🔗', 'success')
      }).catch(() => prompt('Copy this link:', url))
    } catch {}
  }

  const selectedShape   = shapes.find(s => s.id === selectedId) || null
  const isActive        = pendingShape !== null || movingShapeId !== null

  if (!hydrated) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#FFF8E7' }}>
      <span style={{ fontFamily:'Fredoka One,cursive', fontSize:'2rem', color:'#5C3D11' }}>🏖️ Loading...</span>
    </div>
  )

  return (
    <>
      <Head>
        <title>Sand Castle Builder 🏖️</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏖️</text></svg>" />
      </Head>

      <div className="app">
        {/* ── Top bar ── */}
        <header className="topbar">
          <span className="logo">🏖️ Sand Castle Builder</span>

          {!viewOnly && (
            <div className="mode-tabs">
              <button className={`mode-btn ${mode === 'build' ? 'active' : ''}`}
                onClick={() => { setMode('build'); setAutoRotate(false) }}>
                🔨 Build
              </button>
              <button className={`mode-btn ${mode === 'present' ? 'active' : ''}`}
                onClick={() => { setMode('present'); setAutoRotate(true) }}>
                🎤 Present
              </button>
            </div>
          )}

          {viewOnly && (
            <span className="viewing-badge">👀 Viewing shared castle</span>
          )}

          <div className="topbar-right">
            <button className={`icon-btn ${autoRotate ? 'on' : ''}`}
              onClick={() => setAutoRotate(v => !v)} title="Toggle 360° rotation">
              {autoRotate ? '⏸' : '🔄'}
            </button>
            {!viewOnly && (
              <button className={`share-btn ${sharePulse ? 'pulse' : ''}`} onClick={handleShare}>
                🔗 Share
              </button>
            )}
            {!viewOnly && mode === 'build' && (
              <button className="clear-btn"
                onClick={() => { if (confirm('Clear all shapes?')) { clearAll(); cancelActive() } }}>
                🗑️
              </button>
            )}
          </div>
        </header>

        {/* ── Notification ── */}
        {notification && (
          <div className={`notif notif-${notification.type}`}>
            {notification.text}
            {isActive && (
              <button className="notif-cancel" onClick={cancelActive}>Cancel (Esc)</button>
            )}
          </div>
        )}

        <main className="layout">
          {/* Left panel */}
          {mode === 'build' && !viewOnly && (
            <aside className="panel left">
              <BuildPanel
                onAddShape={handleAddShape}
                sandUsed={sandUsed}
                selectedShapeInfo={selectedShape}
                onDeleteSelected={handleDeleteSelected}
              />
            </aside>
          )}

          {/* 3D canvas */}
          <div className="canvas-wrap">
            {isActive && (
              <div className="placement-bar">
                {movingShapeId ? '↕️ Moving' : '📍 Placing'} —
                <span style={{color:'#69E0A0'}}> green = valid</span>,
                <span style={{color:'#FF8080'}}> red = can&apos;t place here</span>
                <button onClick={cancelActive}>Cancel</button>
              </div>
            )}

            <Scene
              pendingShape={pendingShape}
              movingShapeId={movingShapeId}
              onPlaceShape={handlePlaceShape}
              onMoveShape={handleMoveShape}
              onSelectShape={handleSelectShape}
              onInvalidAttempt={handleInvalidAttempt}
              presentMode={mode === 'present' || viewOnly}
              autoRotate={autoRotate}
            />

            {mode === 'build' && !isActive && !viewOnly && (
              <div className="hint">Click a shape to move it • Click sand to deselect</div>
            )}
          </div>

          {/* Right panel */}
          <aside className="panel right">
            {mode === 'build' && !viewOnly ? (
              <ShapeList
                shapes={shapes}
                selectedId={selectedId}
                onSelect={handleSelectShape}
                onDelete={removeShape}
              />
            ) : (
              <PresentPanel
                shapes={shapes}
                studentName={studentName}
                setStudentName={viewOnly ? () => {} : setStudentName}
              />
            )}
          </aside>
        </main>
      </div>

      <style jsx>{`
        .app { display:flex; flex-direction:column; height:100vh; overflow:hidden; background:#FFF8E7; }

        /* top bar */
        .topbar {
          display:flex; align-items:center; gap:10px; padding:0 16px; height:52px;
          flex-shrink:0; background:linear-gradient(135deg,#5C3D11,#8B6914);
          box-shadow:0 3px 12px rgba(0,0,0,0.25); z-index:10;
        }
        .logo { font-family:'Fredoka One',cursive; font-size:1.2rem; color:#FFD166; white-space:nowrap; }
        .viewing-badge {
          font-size:0.75rem; color:#FFD166; background:rgba(255,209,102,0.15);
          border:1px solid rgba(255,209,102,0.3); border-radius:8px; padding:3px 10px;
        }
        .mode-tabs { display:flex; gap:6px; margin:0 auto; }
        .mode-btn {
          padding:5px 16px; border:2px solid #FFD16640; border-radius:20px;
          background:transparent; color:#FFD16680; font-size:0.8rem; font-weight:700;
          font-family:'Nunito',sans-serif; cursor:pointer; transition:all 0.15s;
        }
        .mode-btn:hover { color:#FFD166; border-color:#FFD16680; }
        .mode-btn.active { background:#FFD166; border-color:#FFD166; color:#5C3D11; }

        .topbar-right { display:flex; gap:6px; align-items:center; margin-left:auto; }
        .icon-btn {
          padding:5px 9px; border:2px solid rgba(255,255,255,0.2); border-radius:8px;
          background:transparent; color:white; font-size:1rem; cursor:pointer;
          font-family:'Nunito',sans-serif; transition:all 0.15s;
        }
        .icon-btn.on { background:rgba(135,206,235,0.25); border-color:#87CEEB; }
        .share-btn {
          padding:5px 12px; border:2px solid rgba(255,209,102,0.5); border-radius:8px;
          background:rgba(255,209,102,0.12); color:#FFD166; font-size:0.78rem;
          font-weight:700; cursor:pointer; font-family:'Nunito',sans-serif; transition:all 0.2s;
        }
        .share-btn.pulse { background:#FFD166; color:#5C3D11; transform:scale(1.05); }
        .share-btn:hover { background:rgba(255,209,102,0.22); }
        .clear-btn {
          padding:5px 9px; border:2px solid rgba(230,57,70,0.3); border-radius:8px;
          background:transparent; color:#F4A261; font-size:0.9rem; cursor:pointer;
          font-family:'Nunito',sans-serif;
        }
        .clear-btn:hover { border-color:#E63946; color:#E63946; }

        /* notification */
        .notif {
          position:absolute; top:60px; left:50%; transform:translateX(-50%);
          z-index:100; padding:9px 18px; border-radius:12px; font-size:0.82rem;
          font-weight:700; display:flex; align-items:center; gap:12px;
          box-shadow:0 4px 20px rgba(0,0,0,0.15); white-space:nowrap;
          animation:drop 0.2s ease; pointer-events:none;
        }
        .notif-cancel { pointer-events:all; }
        .notif-info    { background:#264653; color:#E8F4F4; }
        .notif-success { background:#2A9D8F; color:white; }
        .notif-error   { background:#E63946; color:white; }
        .notif-cancel {
          padding:3px 10px; border:1.5px solid white; border-radius:6px;
          background:transparent; color:white; font-size:0.72rem; font-weight:700;
          cursor:pointer; font-family:'Nunito',sans-serif;
        }
        @keyframes drop {
          from { opacity:0; transform:translateX(-50%) translateY(-8px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }

        /* layout */
        .layout { display:flex; flex:1; overflow:hidden; min-height:0; }
        .panel {
          width:255px; flex-shrink:0; background:#FFFBF0;
          overflow-y:auto; padding:14px;
        }
        .panel.left  { border-right:2px solid #E8D5A3; }
        .panel.right { border-left:2px solid #E8D5A3; }

        .canvas-wrap { flex:1; position:relative; overflow:hidden; }

        .placement-bar {
          position:absolute; top:10px; left:50%; transform:translateX(-50%);
          z-index:10; background:rgba(20,30,40,0.88); color:white;
          padding:8px 16px; border-radius:12px; font-size:0.8rem; font-weight:600;
          display:flex; align-items:center; gap:6px; pointer-events:none;
          box-shadow:0 3px 12px rgba(0,0,0,0.25);
        }
        .placement-bar button {
          pointer-events:all; margin-left:8px;
          background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3);
          border-radius:6px; color:white; padding:2px 8px;
          font-size:0.72rem; font-weight:700; cursor:pointer; font-family:'Nunito',sans-serif;
        }

        .hint {
          position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
          background:rgba(255,255,255,0.82); padding:5px 14px; border-radius:20px;
          font-size:0.7rem; color:#5C3D11; font-weight:600; pointer-events:none;
          box-shadow:0 2px 8px rgba(0,0,0,0.08); white-space:nowrap;
        }
      `}</style>
    </>
  )
}
