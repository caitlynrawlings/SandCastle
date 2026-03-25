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
  const { x: cx, z: cz, radius: pr } = placingShape
  let bestY = GROUND_Y

  for (const s of allShapes) {
    if (s.id === placingShape.id) continue

    const dx = cx - s.x
    const dz = cz - s.z
    const distXZ = Math.sqrt(dx * dx + dz * dz)
    if (distXZ >= pr + s.radius) continue

    // Sample multiple points across the placing shape's footprint
    // and find the highest surface point of s underneath any of them
    const samplePoints = [
      [0, 0],
      [pr * 0.7, 0], [-pr * 0.7, 0],
      [0, pr * 0.7], [0, -pr * 0.7],
      [pr * 0.5, pr * 0.5], [-pr * 0.5, pr * 0.5],
      [pr * 0.5, -pr * 0.5], [-pr * 0.5, -pr * 0.5],
    ]

    for (const [ox, oz] of samplePoints) {
      const px = cx + ox
      const pz = cz + oz
      const pdx = px - s.x
      const pdz = pz - s.z
      const pd = Math.sqrt(pdx * pdx + pdz * pdz)

      let surfaceY = null

      if (s.type === 'cylinder') {
        if (pd <= s.radius) surfaceY = s.y + s.height

      } else if (s.type === 'cone') {
        // The highest cone surface point under the placing shape is at
        // the point in the placing shape's footprint closest to the cone center
        const closestDist = Math.max(0, distXZ - pr) // closest edge of placing shape to cone center
        if (closestDist <= s.radius) {
          surfaceY = s.y + s.height * (1 - closestDist / s.radius)
        }
      } else if (s.type === 'hemisphere') {
        if (pd <= s.radius) {
          surfaceY = s.y + Math.sqrt(Math.max(0, s.radius ** 2 - pd ** 2))
        }

      } else if (s.type === 'sphere') {
        if (pd <= s.radius) {
          surfaceY = s.y + s.radius + Math.sqrt(Math.max(0, s.radius ** 2 - pd ** 2))
        }
      }

      if (surfaceY !== null && surfaceY > bestY) {
        bestY = surfaceY
      }
    }
  }

  return bestY
}

export function validatePlacement(placingShape, allShapes) {
  const errors = []
  const { x: cx, z: cz, radius: r } = placingShape
  const settleY = computeSettleY(placingShape, allShapes)

  if (settleY > GROUND_Y) {
    // Curved surfaces — only allow stacking if nearly centered
    const curvedSupporters = allShapes.filter(s => {
    if (s.id === placingShape.id) return false
      const dx = cx - s.x
      const dz = cz - s.z
      const distXZ = Math.sqrt(dx * dx + dz * dz)
      return distXZ < r + s.radius &&
        (s.type === 'sphere' || s.type === 'hemisphere' || s.type === 'cone')
    })

    for (const s of curvedSupporters) {
      const dist = Math.sqrt((cx - s.x) ** 2 + (cz - s.z) ** 2)
      const maxAllowed = s.radius * 0.25
      if (dist > maxAllowed) {
        errors.push(`Too curved to stack there — center it on the ${s.type} to place on top.`)
        return { valid: false, errors, settleY }
      }
    }

    const supporters = allShapes.filter(s => {
      if (s.id === placingShape.id) return false
      const dx = cx - s.x
      const dz = cz - s.z
      const distXZ = Math.sqrt(dx * dx + dz * dz)
      return distXZ < r + s.radius && Math.abs(getShapeTop(s) - settleY) < 0.1
    })

    if (supporters.length > 0) {
      const base = supporters.reduce((a, b) => a.radius > b.radius ? a : b)
      const dist = Math.sqrt((cx - base.x) ** 2 + (cz - base.z) ** 2)
      if (dist > base.radius) {
        errors.push('Too much overhang! That would tip over in real life.')
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