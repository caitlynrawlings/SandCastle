import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useStore, calcVolume, MAX_SAND } from '../lib/store'
import { computeSettleY, validatePlacement } from '../lib/physics'
import BuildPanel from '../components/BuildPanel'
import ShapeList from '../components/ShapeList'
import PresentPanel from '../components/PresentPanel'

// Dynamic import for Three.js (no SSR)
const Scene = dynamic(() => import('../components/Scene'), { ssr: false })

export default function Home() {
  const shapes = useStore(s => s.shapes)
  const selectedId = useStore(s => s.selectedId)
  const selectShape = useStore(s => s.selectShape)
  const addShape = useStore(s => s.addShape)
  const updateShapePosition = useStore(s => s.updateShapePosition)
  const removeShape = useStore(s => s.removeShape)
  const clearAll = useStore(s => s.clearAll)
  const mode = useStore(s => s.mode)
  const setMode = useStore(s => s.setMode)
  const studentName = useStore(s => s.studentName)
  const setStudentName = useStore(s => s.setStudentName)
  const sandUsed = useStore(s => s.sandUsed())

  const [pendingShape, setPendingShape] = useState(null) // shape waiting to be placed
  const [notification, setNotification] = useState(null) // { text, type }
  const [autoRotate, setAutoRotate] = useState(false)
  const [rightTab, setRightTab] = useState('list') // 'list' | 'present'
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  const showNotification = (text, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleAddShape = (type, radius, height) => {
    // Don't add to store yet — create a pending shape for placement
    const r = parseFloat(radius)
    const h = parseFloat(height) || r * 2

    const vol = calcVolume(type, r, h)
    const used = sandUsed

    if (used + vol > MAX_SAND) {
      return { ok: false, reason: 'Not enough sand! Try a smaller shape.' }
    }

    setPendingShape({ type, radius: r, height: h, volume: vol })
    showNotification('Click anywhere on the sand to place your shape!', 'info')
    return { ok: true }
  }

  const handlePlaceShape = useCallback(({ x, z, y, valid, errors }) => {
    if (!pendingShape) return

    if (!valid) {
      showNotification(errors[0], 'error')
      // Still place it but warn
    }

    const result = addShape(pendingShape.type, pendingShape.radius, pendingShape.height)
    if (!result.ok) {
      showNotification(result.reason, 'error')
      setPendingShape(null)
      return
    }

    // Move the newly added shape to the clicked position
    const newId = useStore.getState().shapes.at(-1)?.id
    if (newId !== undefined) {
      updateShapePosition(newId, x, y, z)
    }

    setPendingShape(null)

    if (!valid) {
      showNotification('⚠️ ' + errors[0], 'error')
    } else {
      showNotification('Shape placed!', 'success')
    }
  }, [pendingShape, addShape, updateShapePosition])

  const handleCancelPending = () => {
    setPendingShape(null)
  }

  const selectedShape = shapes.find(s => s.id === selectedId) || null

  const handleDeleteSelected = () => {
    if (selectedId) {
      removeShape(selectedId)
      selectShape(null)
    }
  }

  if (!hydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FFF8E7' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: '2rem', color: '#5C3D11' }}>
          🏖️ Loading Sand Castle Builder...
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Sand Castle Builder 🏖️</title>
        <meta name="description" content="Build virtual sand castles and calculate their volume!" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏖️</text></svg>" />
      </Head>

      <div className="app">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="logo">🏖️ Sand Castle Builder</span>
            <span className="subtitle">Build • Calculate • Present</span>
          </div>

          <div className="mode-tabs">
            <button
              className={`mode-btn ${mode === 'build' ? 'active' : ''}`}
              onClick={() => { setMode('build'); setAutoRotate(false) }}
            >
              🔨 Build
            </button>
            <button
              className={`mode-btn ${mode === 'present' ? 'active' : ''}`}
              onClick={() => { setMode('present'); setRightTab('present'); setAutoRotate(true) }}
            >
              🎤 Present
            </button>
          </div>

          <div className="topbar-right">
            <button
              className={`rotate-btn ${autoRotate ? 'active' : ''}`}
              onClick={() => setAutoRotate(!autoRotate)}
              title="Toggle 360° rotation"
            >
              {autoRotate ? '⏸ Stop Rotating' : '🔄 360° View'}
            </button>
            {mode === 'build' && (
              <button
                className="clear-btn"
                onClick={() => { if (confirm('Clear all shapes?')) { clearAll(); setPendingShape(null) } }}
              >
                🗑️ Clear All
              </button>
            )}
          </div>
        </header>

        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.text}
            {pendingShape && (
              <button className="cancel-pending" onClick={handleCancelPending}>
                Cancel
              </button>
            )}
          </div>
        )}

        <main className="main-layout">
          {/* Left panel */}
          {mode === 'build' && (
            <aside className="left-panel">
              <BuildPanel
                onAddShape={handleAddShape}
                sandUsed={sandUsed}
                selectedShapeInfo={selectedShape}
                onDeleteSelected={handleDeleteSelected}
              />
            </aside>
          )}

          {/* Center — 3D Canvas */}
          <div className="canvas-area">
            {pendingShape && (
              <div className="placement-hint">
                🖱️ Move mouse to position the <strong>{pendingShape.type}</strong> — click to place • <button onClick={handleCancelPending}>Cancel</button>
              </div>
            )}
            <Scene
              pendingShape={pendingShape}
              onPlaceShape={handlePlaceShape}
              presentMode={mode === 'present'}
              autoRotate={autoRotate}
            />

            {/* Physics legend */}
            {mode === 'build' && (
              <div className="physics-legend">
                <span>⚠️ Physics rules: shapes must rest on something, limited overhang allowed</span>
              </div>
            )}
          </div>

          {/* Right panel */}
          <aside className="right-panel">
            {mode === 'build' ? (
              <>
                <div className="right-tabs">
                  <button
                    className={`rtab ${rightTab === 'list' ? 'active' : ''}`}
                    onClick={() => setRightTab('list')}
                  >
                    📋 Shape List
                  </button>
                </div>
                <div className="right-content">
                  <ShapeList
                    shapes={shapes}
                    selectedId={selectedId}
                    onSelect={selectShape}
                    onDelete={removeShape}
                  />
                </div>
              </>
            ) : (
              <div className="right-content">
                <PresentPanel
                  shapes={shapes}
                  studentName={studentName}
                  setStudentName={setStudentName}
                />
              </div>
            )}
          </aside>
        </main>
      </div>

      <style jsx>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #FFF8E7;
          overflow: hidden;
        }

        /* ── Top Bar ── */
        .topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
          height: 54px;
          background: linear-gradient(135deg, #5C3D11, #8B6914);
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
          flex-shrink: 0;
          z-index: 10;
        }
        .topbar-left { display: flex; align-items: baseline; gap: 10px; }
        .logo { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: #FFD166; letter-spacing: 0.03em; }
        .subtitle { font-size: 0.68rem; color: #D4A85380; text-transform: uppercase; letter-spacing: 0.12em; }

        .mode-tabs { display: flex; gap: 6px; margin: 0 auto; }
        .mode-btn {
          padding: 6px 18px;
          border: 2px solid #FFD16640;
          border-radius: 20px;
          background: transparent;
          color: #FFD16680;
          font-size: 0.82rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          transition: all 0.15s;
        }
        .mode-btn:hover { border-color: #FFD16680; color: #FFD166; }
        .mode-btn.active { background: #FFD166; border-color: #FFD166; color: #5C3D11; }

        .topbar-right { display: flex; gap: 8px; align-items: center; }
        .rotate-btn {
          padding: 6px 12px;
          border: 2px solid #87CEEB60;
          border-radius: 20px;
          background: transparent;
          color: #87CEEB;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          transition: all 0.15s;
        }
        .rotate-btn:hover { border-color: #87CEEB; }
        .rotate-btn.active { background: #87CEEB; color: #264653; border-color: #87CEEB; }
        .clear-btn {
          padding: 6px 12px;
          border: 2px solid #E76F5140;
          border-radius: 20px;
          background: transparent;
          color: #F4A261;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: 'Nunito', sans-serif;
          transition: all 0.15s;
        }
        .clear-btn:hover { border-color: #E76F51; color: #E76F51; }

        /* ── Notification ── */
        .notification {
          position: absolute;
          top: 62px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          animation: slideDown 0.25s ease;
        }
        .notification.info { background: #264653; color: #E8F4F4; }
        .notification.success { background: #2A9D8F; color: white; }
        .notification.error { background: #E63946; color: white; }
        .cancel-pending {
          padding: 3px 10px;
          border: 1.5px solid white;
          border-radius: 8px;
          background: transparent;
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ── Main Layout ── */
        .main-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        .left-panel, .right-panel {
          width: 260px;
          flex-shrink: 0;
          background: #FFFBF0;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .left-panel { border-right: 2px solid #E8D5A3; }
        .right-panel { border-left: 2px solid #E8D5A3; }

        .right-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .rtab {
          flex: 1;
          padding: 7px;
          border: 2px solid #E8D5A3;
          border-radius: 8px;
          background: #FFFBF0;
          color: #8B6914;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
        }
        .rtab.active { background: #FFD166; border-color: #FFD166; color: #5C3D11; }

        .right-content { flex: 1; }

        .canvas-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          min-width: 0;
        }

        .placement-hint {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          background: rgba(38, 70, 83, 0.92);
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 600;
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .placement-hint button {
          pointer-events: all;
          background: white;
          border: none;
          border-radius: 6px;
          color: #264653;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 8px;
          cursor: pointer;
          font-family: 'Nunito', sans-serif;
        }

        .physics-legend {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255,255,255,0.85);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.72rem;
          color: #5C3D11;
          font-weight: 600;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  )
}
