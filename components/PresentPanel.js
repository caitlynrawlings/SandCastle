import { useState } from 'react'
import { shapeLabel } from '../lib/store'

export default function PresentPanel({ shapes, studentName, setStudentName }) {
  const [enteredVolume, setEnteredVolume] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const totalVolume = shapes.reduce((sum, s) => sum + s.volume, 0)

  const handleSubmit = () => {
    const entered = parseFloat(enteredVolume)
    if (isNaN(entered)) return

    const pctError = Math.abs(entered - totalVolume) / totalVolume * 100

    let grade = ''
    let emoji = ''
    let message = ''

    if (pctError < 1) {
      grade = 'Perfect!'
      emoji = '🏆'
      message = 'Your calculation is exactly right! Outstanding math skills!'
    } else if (pctError < 5) {
      grade = 'Excellent!'
      emoji = '⭐'
      message = `Super close! Your answer was off by only ${pctError.toFixed(1)}%. Great work!`
    } else if (pctError < 15) {
      grade = 'Good Try!'
      emoji = '👍'
      message = `You were ${pctError.toFixed(1)}% off. Check your formula — you're almost there!`
    } else {
      grade = 'Try Again!'
      emoji = '🔄'
      message = `Your answer was ${pctError.toFixed(1)}% off. Review the volume formulas and try recalculating!`
    }

    setResult({ grade, emoji, message, entered, actual: totalVolume, pctError })
    setSubmitted(true)
  }


  return (
    <div className="present-panel">
      <div className="present-header">
        <span className="present-badge">🎤 Presentation Mode</span>
        <h2 className="present-title">
          {studentName ? `${studentName}'s Sand Castle` : 'Your Sand Castle'}
        </h2>
      </div>

      <label className="name-label">
        Your Name:
        <input
          type="text"
          value={studentName}
          onChange={e => setStudentName(e.target.value)}
          placeholder="Enter your name..."
          className="name-input"
        />
      </label>


      {/* Student answer */}
      {!submitted ? (
        <div className="answer-section">
          <div className="section-head">🧮 What's your calculated total volume?</div>
          <div className="answer-input-row">
            <input
              type="number"
              step="0.01"
              value={enteredVolume}
              onChange={e => setEnteredVolume(e.target.value)}
              placeholder="Enter your answer..."
              className="answer-input"
            />
            <span className="answer-unit">cm³</span>
          </div>
          <button className="submit-btn" onClick={handleSubmit}>
            Check My Answer ✓
          </button>
        </div>
      ) : (
        <div className="result-section">
          <div className={`result-card ${result.pctError < 5 ? 'success' : result.pctError < 15 ? 'warning' : 'error'}`}>
            <div className="result-emoji">{result.emoji}</div>
            <div className="result-grade">{result.grade}</div>
            <div className="result-message">{result.message}</div>
            <div className="result-nums">
              <div>You said: <strong>{result.entered.toFixed(2)} cm³</strong></div>
              <div>Correct: <strong>{result.actual.toFixed(2)} cm³</strong></div>
            </div>
            <div className={`budget-result ${result.actual > 5000 ? 'over' : 'under'}`}>
              {result.actual > 5000
                ? `🚨 Over budget! Your castle used ${result.actual.toFixed(0)} cm³ — ${(result.actual - 5000).toFixed(0)} cm³ over the 5,000 limit.`
                : `✅ Within budget! You used ${result.actual.toFixed(0)} of your 5,000 cm³.`}
            </div>
          </div>

          <button className="retry-btn" onClick={() => { setSubmitted(false); setEnteredVolume(''); setResult(null) }}>
            Try Again
          </button>
        </div>
      )}

      <div className="present-tip">
        💡 <strong>Tip:</strong> Use the 3D view to rotate your castle during presentation!
      </div>

      <style jsx>{`
        .present-panel { padding: 0; }
        .present-header { margin-bottom: 14px; }
        .present-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: #264653;
          color: white;
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 6px;
        }
        .present-title {
          font-size: 1.3rem;
          font-weight: 900;
          color: #264653;
          margin: 0;
          font-family: 'Fredoka One', cursive;
        }
        .name-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #264653;
          margin-bottom: 14px;
        }
        .name-input {
          padding: 8px 10px;
          border: 2px solid #B2D8D8;
          border-radius: 8px;
          font-size: 0.9rem;
          background: #F0FAFA;
          color: #1A2E3B;
          outline: none;
        }
        .name-input:focus { border-color: #2A9D8F; }

        .section-head {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #264653;
          margin-bottom: 8px;
        }
        .breakdown-section { margin-bottom: 16px; }
        .breakdown-list { display: flex; flex-direction: column; gap: 6px; }
        .breakdown-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          padding: 8px;
          background: #F0FAFA;
          border-radius: 8px;
          border: 1.5px solid #B2D8D8;
        }
        .breakdown-num { font-size: 0.8rem; font-weight: 700; color: #264653; flex-shrink: 0; }
        .breakdown-body { display: flex; flex-direction: column; gap: 1px; }
        .breakdown-type { font-size: 0.82rem; font-weight: 700; color: #1A2E3B; }
        .breakdown-formula { font-size: 0.7rem; font-family: monospace; color: #5C8A7A; }
        .breakdown-vol { font-size: 0.75rem; font-weight: 700; color: #2A9D8F; }
        .breakdown-total {
          padding: 8px;
          background: #264653;
          color: white;
          border-radius: 8px;
          font-size: 0.78rem;
          font-family: monospace;
        }

        .answer-section { margin-bottom: 14px; }
        .answer-input-row { display: flex; gap: 8px; align-items: center; margin: 8px 0 10px; }
        .answer-input {
          flex: 1;
          padding: 10px 12px;
          border: 2px solid #B2D8D8;
          border-radius: 10px;
          font-size: 1rem;
          background: #F0FAFA;
          color: #1A2E3B;
          outline: none;
        }
        .answer-input:focus { border-color: #2A9D8F; }
        .answer-unit { font-size: 0.85rem; color: #264653; font-weight: 600; }
        .submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #2A9D8F, #264653);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Fredoka One', cursive;
        }
        .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .result-section { margin-bottom: 14px; }
        .result-card {
          padding: 16px;
          border-radius: 14px;
          text-align: center;
          margin-bottom: 10px;
        }
        .result-card.success { background: #D4EDDA; border: 2px solid #28A745; }
        .result-card.warning { background: #FFF3CD; border: 2px solid #FFC107; }
        .result-card.error { background: #FFE5E5; border: 2px solid #E63946; }
        .result-emoji { font-size: 2rem; margin-bottom: 4px; }
        .result-grade { font-size: 1.2rem; font-weight: 900; color: #1A2E3B; margin-bottom: 6px; font-family: 'Fredoka One', cursive; }
        .result-message { font-size: 0.82rem; color: #1A2E3B; margin-bottom: 10px; line-height: 1.5; }
        .result-nums { display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; color: #1A2E3B; }
        .budget-result {
          margin-top: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .budget-result.over { background: #FFE5E5; color: #C62828; }
        .budget-result.under { background: #E8F5E9; color: #2E7D32; }
        .retry-btn {
          width: 100%;
          padding: 10px;
          background: #E8F4F4;
          border: 2px solid #B2D8D8;
          border-radius: 10px;
          color: #264653;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .retry-btn:hover { background: #D0ECEC; }

        .present-tip {
          font-size: 0.75rem;
          color: #5C8A7A;
          background: #E8F8F5;
          padding: 10px 12px;
          border-radius: 10px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}
