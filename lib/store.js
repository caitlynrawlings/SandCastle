import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Physics constants
export const MAX_SAND = 5000 // cm³ total sand budget
export const MAX_OVERHANG_RATIO = 0.4 // center of mass can hang over by this fraction
export const GRID_Y_STEP = 0.5 // snap resolution vertically

// Volume calculations (all in "units" — tell students 1 unit = 10cm)
export const calcVolume = (type, radius, height) => {
  const r = parseFloat(radius)
  const h = parseFloat(height)
  if (isNaN(r) || isNaN(h) || r <= 0 || h <= 0) return 0
  switch (type) {
    case 'sphere':     return (4/3) * Math.PI * r * r * r
    case 'hemisphere': return (2/3) * Math.PI * r * r * r
    case 'cylinder':   return Math.PI * r * r * h
    case 'cone':       return (1/3) * Math.PI * r * r * h
    default:           return 0
  }
}

export const shapeLabel = (type) => ({
  sphere:     'Sphere',
  hemisphere: 'Hemisphere',
  cylinder:   'Cylinder',
  cone:       'Cone',
}[type] || type)

// Each shape has: id, type, radius, height, x, y, z (3D position)
const defaultState = {
  shapes: [],
  selectedId: null,
  mode: 'build',     // 'build' | 'present'
  studentName: '',
  nextId: 1,
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...defaultState,

      setMode: (mode) => set({ mode }),
      setStudentName: (name) => set({ studentName: name }),

      addShape: (type, radius, height) => {
        const id = get().nextId
        const r = parseFloat(radius)
        const h = parseFloat(height)
        const vol = calcVolume(type, r, h)
        const used = get().shapes.reduce((sum, s) => sum + s.volume, 0)

        if (used + vol > MAX_SAND) return { ok: false, reason: 'Not enough sand! You\'ve used too much.' }

        // Place new shape floating above center
        const newShape = {
          id,
          type,
          radius: r,
          height: h,
          volume: vol,
          // position — will be dropped by physics
          x: 0,
          y: 50, // high up, will fall
          z: 0,
          placed: false,
        }

        set({ shapes: [...get().shapes, newShape], nextId: id + 1, selectedId: id })
        return { ok: true, shape: newShape }
      },

      updateShapePosition: (id, x, y, z) => {
        set({
          shapes: get().shapes.map(s =>
            s.id === id ? { ...s, x, y, z } : s
          )
        })
      },

      removeShape: (id) => {
        set({
          shapes: get().shapes.filter(s => s.id !== id),
          selectedId: get().selectedId === id ? null : get().selectedId,
        })
      },

      selectShape: (id) => set({ selectedId: id }),

      clearAll: () => set({ shapes: [], selectedId: null }),

      totalVolume: () => get().shapes.reduce((sum, s) => sum + s.volume, 0),

      sandUsed: () => get().shapes.reduce((sum, s) => sum + s.volume, 0),
    }),
    {
      name: 'sandcastle-storage',
      version: 1,
    }
  )
)
