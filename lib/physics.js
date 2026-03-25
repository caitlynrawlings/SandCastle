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
      // 👇 pick the CLOSEST supporter (actual contact)
      const base = supporters.reduce((closest, s) => {
        const d1 = Math.sqrt((cx - closest.x) ** 2 + (cz - closest.z) ** 2)
        const d2 = Math.sqrt((cx - s.x) ** 2 + (cz - s.z) ** 2)
        return d2 < d1 ? s : closest
      })

      const dist = Math.sqrt((cx - base.x) ** 2 + (cz - base.z) ** 2)
      const maxAllowed = base.radius * 0.9

      if (dist > maxAllowed) {
        errors.push('Too much overhang! That would tip over in real life.')
      }
    }
  }

  return { valid: errors.length === 0, errors, settleY }
}
//old
// export function validatePlacement(placingShape, allShapes) {
//   const errors = []
//   const { x: cx, z: cz, radius: r } = placingShape


//   // Only check overhang — float is handled by computeSettleY
//   const settleY = computeSettleY(placingShape, allShapes)

//   console.log({
//   settleY,
//   placingY: placingShape.y,
//   supporters: allShapes.map(s => ({ id: s.id, top: getShapeTop(s), diff: Math.abs(getShapeTop(s) - settleY) }))
// })

//   if (settleY > GROUND_Y) {
//     const supporters = allShapes.filter(s => {
//       if (s.id === placingShape.id) return false
//       return Math.abs(getShapeTop(s) - settleY) < 1.0
//     })

//     if (supporters.length > 0) {
//       const base = supporters.reduce((a, b) => a.radius > b.radius ? a : b)
//       const dist = Math.sqrt((cx - base.x) ** 2 + (cz - base.z) ** 2)
//       const maxAllowed = base.radius * 0.9

//       if (dist > maxAllowed) {
//         errors.push('Too much overhang! That would tip over in real life.')
//       }
//     }
//   }

//   return { valid: errors.length === 0, errors, settleY }
// }

export function resettleAll(shapes) {
  const sorted = [...shapes].sort((a, b) => a.y - b.y)
  const settled = []
  for (const shape of sorted) {
    const y = computeSettleY(shape, settled)
    settled.push({ ...shape, y })
  }
  return settled
}