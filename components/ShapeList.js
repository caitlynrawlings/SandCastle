import { shapeLabel, MAX_SAND } from '../lib/store'

const SHAPE_COLORS = {
  sphere:     '#F4A261',
  hemisphere: '#E76F51',
  cylinder:   '#F4D35E',
  cone:       '#EE6C4D',
}

const SHAPE_FORMULAS = {
  sphere:     (s) => `V = (4/3)π(${s.radius})³`,
  hemisphere: (s) => `V = (2/3)π(${s.radius})³`,
  cylinder:   (s) => `V = π(${s.radius})²(${s.height})`,
  cone:       (s) => `V = (1/3)π(${s.radius})²(${s.height})`,
}

export default function ShapeList({ shapes, selectedId, onSelect, onDelete }) {
  const totalVolume = shapes.reduce((sum, s) => sum + s.volume, 0)

  return (
    <div className="shape-list-panel">
      <h3 className="list-title">🏰 Castle Shapes</h3>

      {shapes.length === 0 ? (
        <div className="empty-state">
          No shapes yet!<br />Add some to start building.
        </div>
      ) : (
        <div className="shapes">
          {shapes.map((shape, i) => (
            <div
              key={shape.id}
              className={`shape-item ${shape.id === selectedId ? 'selected' : ''}`}
              onClick={() => onSelect(shape.id)}
            >
              <div className="shape-dot" style={{ background: SHAPE_COLORS[shape.type] }} />
              <div className="shape-info">
                <div className="shape-item-name">
                  {i + 1}. {shapeLabel(shape.type)}
                </div>
                <div className="shape-item-formula">
                  {SHAPE_FORMULAS[shape.type]?.(shape)}
                </div>
                <div className="shape-item-vol">
                  = {shape.volume.toFixed(2)} cm³
                </div>
              </div>
              <button
                className="remove-btn"
                onClick={(e) => { e.stopPropagation(); onDelete(shape.id) }}
                title="Remove shape"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {shapes.length > 0 && (
        <div className="total-section">
          <div className="total-label">Total Volume:</div>
          <div className="total-value">{totalVolume.toFixed(2)} cm³</div>
          <div className="total-hint">
            = {shapes.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ' + '}{s.volume.toFixed(2)}
              </span>
            ))}
          </div>
          <div className="sand-used">
            Sand used: {((totalVolume / MAX_SAND) * 100).toFixed(1)}%
          </div>
        </div>
      )}

      <style jsx>{`
        .shape-list-panel { padding: 0; }
        .list-title {
          font-size: 1rem;
          font-weight: 800;
          color: #5C3D11;
          margin: 0 0 12px;
          font-family: 'Fredoka One', cursive;
        }
        .empty-state {
          text-align: center;
          padding: 20px;
          color: #A08030;
          font-size: 0.82rem;
          line-height: 1.6;
          background: #FFFBF0;
          border-radius: 10px;
          border: 1.5px dashed #E8D5A3;
        }
        .shapes { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
        .shape-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1.5px solid #E8D5A3;
          background: #FFFBF0;
          cursor: pointer;
          transition: all 0.15s;
        }
        .shape-item:hover { border-color: #F4A261; background: #FFF5E0; }
        .shape-item.selected { border-color: #E76F51; background: #FFF0E0; box-shadow: 0 0 0 2px #F4A26140; }
        .shape-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .shape-info { flex: 1; min-width: 0; }
        .shape-item-name { font-size: 0.82rem; font-weight: 700; color: #3D2B0A; }
        .shape-item-formula { font-size: 0.68rem; color: #8B6914; font-family: 'Courier New', monospace; }
        .shape-item-vol { font-size: 0.72rem; color: #5C8A3C; font-weight: 600; }
        .remove-btn {
          background: none;
          border: none;
          color: #C62828;
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0 4px;
          flex-shrink: 0;
          opacity: 0.5;
          transition: opacity 0.15s;
          font-family: inherit;
        }
        .remove-btn:hover { opacity: 1; }
        .total-section {
          margin-top: 14px;
          padding: 12px;
          background: linear-gradient(135deg, #FFF8E7, #FFFBF0);
          border: 2px solid #FFD166;
          border-radius: 12px;
        }
        .total-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8B6914; }
        .total-value { font-size: 1.4rem; font-weight: 900; color: #5C3D11; font-family: 'Fredoka One', cursive; }
        .total-hint { font-size: 0.65rem; color: #A08030; font-family: monospace; margin: 4px 0; word-break: break-all; }
        .sand-used { font-size: 0.72rem; color: #E76F51; font-weight: 600; margin-top: 4px; }
      `}</style>
    </div>
  )
}
