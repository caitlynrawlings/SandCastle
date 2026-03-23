import { useState } from 'react'
import { calcVolume, shapeLabel, MAX_SAND } from '../lib/store'

const SHAPES = ['sphere', 'hemisphere', 'cylinder', 'cone']

const SHAPE_ICONS = {
  sphere:     '⚪',
  hemisphere: '🌓',
  cylinder:   '🥫',
  cone:       '🍦',
}

const SHAPE_FORMULAS = {
  sphere:     'V = (4/3)πr³',
  hemisphere: 'V = (2/3)πr³',
  cylinder:   'V = πr²h',
  cone:       'V = (1/3)πr²h',
}

const SHAPE_HINTS = {
  sphere:     'Only needs radius',
  hemisphere: 'Flat side goes down',
  cylinder:   'Needs radius + height',
  cone:       'Needs radius + height',
}

export default function BuildPanel({ onAddShape, sandUsed, selectedShapeInfo, onDeleteSelected }) {
  const [selectedType, setSelectedType] = useState('cylinder')
  const [radius, setRadius] = useState('')
  const [height, setHeight] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const needsHeight = selectedType === 'cylinder' || selectedType === 'cone'
  const previewVolume = calcVolume(selectedType, radius, height)
  const sandLeft = MAX_SAND - sandUsed

  const handleAdd = () => {
    setError('')
    setSuccess('')

    const r = parseFloat(radius)
    const h = parseFloat(height) || r * 2

    if (isNaN(r) || r <= 0) {
      setError('Please enter a valid radius (must be > 0)')
      return
    }
    if (needsHeight && (isNaN(parseFloat(height)) || parseFloat(height) <= 0)) {
      setError('Please enter a valid height (must be > 0)')
      return
    }
    if (r > 15) {
      setError('Radius is too big! Max is 15 units.')
      return
    }
    if (needsHeight && parseFloat(height) > 25) {
      setError('Height is too big! Max is 25 units.')
      return
    }

    const vol = calcVolume(selectedType, r, needsHeight ? h : r)
    if (vol > sandLeft) {
      setError(`Not enough sand! This shape needs ${vol.toFixed(0)} cm³ but you only have ${sandLeft.toFixed(0)} cm³ left.`)
      return
    }

    const result = onAddShape(selectedType, r, needsHeight ? h : r)
    if (result && !result.ok) {
      setError(result.reason)
    } else {
      setSuccess(`${shapeLabel(selectedType)} added! Click on the scene to place it.`)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const pct = (sandUsed / MAX_SAND) * 100

  return (
    <div className="panel build-panel">
      <h2 className="panel-title">🏖️ Build Your Castle</h2>

      {/* Sand meter */}
      <div className="sand-meter">
        <div className="sand-meter-label">
          <span>🪣 Sand Used</span>
          <span className={pct > 85 ? 'danger' : ''}>{sandUsed.toFixed(0)} / {MAX_SAND} cm³</span>
        </div>
        <div className="sand-bar-bg">
          <div
            className={`sand-bar-fill ${pct > 85 ? 'danger' : pct > 65 ? 'warning' : ''}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        {pct > 85 && <p className="warning-text">⚠️ Almost out of sand!</p>}
      </div>

      {/* Shape selector */}
      <div className="section-label">Choose a Shape</div>
      <div className="shape-grid">
        {SHAPES.map(type => (
          <button
            key={type}
            className={`shape-btn ${selectedType === type ? 'active' : ''}`}
            onClick={() => { setSelectedType(type); setError('') }}
          >
            <span className="shape-icon">{SHAPE_ICONS[type]}</span>
            <span className="shape-name">{shapeLabel(type)}</span>
          </button>
        ))}
      </div>

      {/* Formula display */}
      <div className="formula-box">
        <span className="formula-label">Volume Formula:</span>
        <span className="formula-text">{SHAPE_FORMULAS[selectedType]}</span>
        <span className="formula-hint">{SHAPE_HINTS[selectedType]}</span>
      </div>

      {/* Inputs */}
      <div className="inputs">
        <label>
          Radius (units)
          <input
            type="number"
            min="0.5"
            max="15"
            step="0.5"
            value={radius}
            onChange={e => { setRadius(e.target.value); setError('') }}
            placeholder="e.g. 3"
          />
        </label>

        {needsHeight && (
          <label>
            Height (units)
            <input
              type="number"
              min="0.5"
              max="25"
              step="0.5"
              value={height}
              onChange={e => { setHeight(e.target.value); setError('') }}
              placeholder="e.g. 5"
            />
          </label>
        )}
      </div>

      {/* Preview volume */}
      {previewVolume > 0 && (
        <div className="preview-vol">
          Preview volume: <strong>{previewVolume.toFixed(1)} cm³</strong>
          {previewVolume > sandLeft && <span className="danger-text"> (too much sand!)</span>}
        </div>
      )}

      {error && <div className="error-box">❌ {error}</div>}
      {success && <div className="success-box">✅ {success}</div>}

      <button className="add-btn" onClick={handleAdd}>
        + Add Shape to Castle
      </button>

      {/* Selected shape actions */}
      {selectedShapeInfo && (
        <div className="selected-info">
          <div className="selected-title">Selected: {shapeLabel(selectedShapeInfo.type)}</div>
          <div className="selected-stats">
            r = {selectedShapeInfo.radius} | {selectedShapeInfo.type !== 'sphere' && selectedShapeInfo.type !== 'hemisphere' ? `h = ${selectedShapeInfo.height} | ` : ''}
            V = {selectedShapeInfo.volume.toFixed(1)} cm³
          </div>
          <button className="delete-btn" onClick={onDeleteSelected}>
            🗑️ Remove Shape
          </button>
        </div>
      )}

      <style jsx>{`
        .panel { padding: 0; }
        .panel-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #5C3D11;
          margin: 0 0 16px;
          font-family: 'Fredoka One', cursive;
        }
        .sand-meter { margin-bottom: 18px; }
        .sand-meter-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          color: #5C3D11;
          margin-bottom: 6px;
        }
        .sand-meter-label .danger { color: #E63946; }
        .sand-bar-bg {
          height: 10px;
          background: #E8D5A3;
          border-radius: 10px;
          overflow: hidden;
        }
        .sand-bar-fill {
          height: 100%;
          background: #F4A261;
          border-radius: 10px;
          transition: width 0.4s ease;
        }
        .sand-bar-fill.warning { background: #FFD166; }
        .sand-bar-fill.danger { background: #E63946; }
        .warning-text { font-size: 0.75rem; color: #E63946; margin: 4px 0 0; }

        .section-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #8B6914;
          margin-bottom: 8px;
        }
        .shape-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }
        .shape-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 6px;
          border: 2px solid #E8D5A3;
          border-radius: 12px;
          background: #FFFBF0;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .shape-btn:hover { border-color: #F4A261; background: #FFF5E0; }
        .shape-btn.active { border-color: #E76F51; background: #FFF0E0; box-shadow: 0 0 0 2px #F4A26140; }
        .shape-icon { font-size: 1.4rem; }
        .shape-name { font-size: 0.7rem; font-weight: 700; color: #5C3D11; }

        .formula-box {
          background: #FFF8E7;
          border: 1.5px solid #E8D5A3;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .formula-label { font-size: 0.65rem; color: #8B6914; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .formula-text { font-size: 1rem; font-weight: 700; color: #5C3D11; font-family: 'Courier New', monospace; }
        .formula-hint { font-size: 0.7rem; color: #A08030; font-style: italic; }

        .inputs { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
        .inputs label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #5C3D11;
        }
        .inputs input {
          padding: 8px 10px;
          border: 2px solid #E8D5A3;
          border-radius: 8px;
          font-size: 0.9rem;
          background: #FFFBF0;
          color: #3D2B0A;
          outline: none;
          transition: border-color 0.15s;
        }
        .inputs input:focus { border-color: #F4A261; }

        .preview-vol {
          font-size: 0.8rem;
          color: #5C3D11;
          background: #E8F5E9;
          padding: 6px 10px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .danger-text { color: #E63946; }

        .error-box {
          background: #FFE5E5;
          border: 1.5px solid #E63946;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.78rem;
          color: #C62828;
          margin-bottom: 10px;
        }
        .success-box {
          background: #E8F5E9;
          border: 1.5px solid #4CAF50;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.78rem;
          color: #2E7D32;
          margin-bottom: 10px;
        }

        .add-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #F4A261, #E76F51);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          font-family: 'Fredoka One', cursive;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 3px 10px #E76F5140;
        }
        .add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px #E76F5155; }
        .add-btn:active { transform: translateY(0); }

        .selected-info {
          margin-top: 14px;
          padding: 12px;
          background: #FFF3CD;
          border: 1.5px solid #FFD166;
          border-radius: 12px;
        }
        .selected-title { font-size: 0.85rem; font-weight: 800; color: #5C3D11; margin-bottom: 4px; }
        .selected-stats { font-size: 0.75rem; color: #7A5C1E; margin-bottom: 10px; font-family: monospace; }
        .delete-btn {
          width: 100%;
          padding: 8px;
          background: #FFE5E5;
          border: 1.5px solid #E63946;
          border-radius: 8px;
          color: #C62828;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          font-family: inherit;
        }
        .delete-btn:hover { background: #FFCDD2; }
      `}</style>
    </div>
  )
}
