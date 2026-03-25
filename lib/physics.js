const GROUND_Y = 0

export function getShapeTop(shape) {
  const { type, radius, height, y } = shape
  switch (type) {
    case 'sphere':     return y + radius * 2
    case 'hemisphere': return y + radius
    case 'cylinder':   return y + height
    case 'cone':       return y + height
    default:           return y + height
  }
}

export function computeSettleY(placingShape, allShapes) {
  const { radius: r, x: cx, z: cz } = placingShape
  let supportY = GROUND_Y

  for (const s of allShapes) {
    if (s.id === placingShape.id) continue
    const dist = Math.sqrt((cx - s.x) ** 2 + (cz - s.z) ** 2)
    if (dist < r + s.radius) {
      const top = getShapeTop(s)
      if (top > supportY) supportY = top
    }
  }

  return supportY
}

export function validatePlacement(placingShape, allShapes) {
  const errors = []
  const { x: cx, z: cz, radius: r } = placingShape

  const settleY = computeSettleY(placingShape, allShapes)

  if (settleY > GROUND_Y) {
    const supporters = allShapes.filter(s => {
      if (s.id === placingShape.id) return false

      const top = getShapeTop(s)
      const heightMatch = Math.abs(top - settleY) < 1.0

      const dist = Math.sqrt((cx - s.x) ** 2 + (cz - s.z) ** 2)
      const overlaps = dist < r + s.radius

      return heightMatch && overlaps
    })

    if (supporters.length > 0) {
      // sample points around the base of the shape
      const samples = [
        [0, 0], // center (most important)
        [r * 0.5, 0],
        [-r * 0.5, 0],
        [0, r * 0.5],
        [0, -r * 0.5],
      ]

      const supportedPoints = samples.filter(([dx, dz]) => {
        const px = cx + dx
        const pz = cz + dz

        return supporters.some(s => {
          const dist = Math.sqrt((px - s.x) ** 2 + (pz - s.z) ** 2)
          return dist <= s.radius
        })
      })

      // require center + at least one more point
      const centerSupported = supportedPoints.some(([dx, dz]) => dx === 0 && dz === 0)

      if (!centerSupported) {
        errors.push('Center of mass is not supported!')
      }
    }
  }

  return { valid: errors.length === 0, errors, settleY }
}

export function resettleAll(shapes) {
  const sorted = [...shapes].sort((a, b) => a.y - b.y)
  const settled = []
  for (const shape of sorted) {
    const y = computeSettleY(shape, settled)
    settled.push({ ...shape, y })
  }
  return settled
}