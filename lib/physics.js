// Simplified physics for sandcastle validity
// Each shape is a bounding box approximation for stacking purposes

export function getShapeBounds(shape) {
  const { type, radius, height, x, y, z } = shape
  const r = radius
  const h = type === 'sphere' || type === 'hemisphere' ? r * 2 : height

  return {
    minX: x - r,
    maxX: x + r,
    minZ: z - r,
    maxZ: z + r,
    minY: y,
    maxY: y + (type === 'sphere' ? r * 2 : type === 'hemisphere' ? r : h),
    cx: x,
    cz: z,
    r,
  }
}

// The ground plane Y = 0
const GROUND_Y = 0

// Get the Y-height of the "base" of a shape (bottom of it)
export function getShapeBottom(shape) {
  return shape.y
}

// Get the top Y of a shape
export function getShapeTop(shape) {
  const { type, radius, height } = shape
  switch (type) {
    case 'sphere':     return shape.y + radius * 2
    case 'hemisphere': return shape.y + radius
    case 'cylinder':   return shape.y + height
    case 'cone':       return shape.y + height
    default:           return shape.y + height
  }
}

// Given a shape being placed, find what Y it should settle at
// by checking support from the ground or other shapes below it
export function computeSettleY(placingShape, allShapes, excludeId = null) {
  const r = placingShape.radius
  const cx = placingShape.x
  const cz = placingShape.z

  // Start from ground
  let supportY = GROUND_Y

  const others = allShapes.filter(s => s.id !== excludeId && s.id !== placingShape.id)

  for (const s of others) {
    const bounds = getShapeBounds(s)
    // Check horizontal overlap
    const dx = Math.abs(cx - bounds.cx)
    const dz = Math.abs(cz - bounds.cz)
    const overlap = r + bounds.r

    if (dx < overlap && dz < overlap) {
      // They overlap horizontally — this shape can rest on top
      const topY = getShapeTop(s)
      if (topY > supportY) {
        supportY = topY
      }
    }
  }

  return supportY
}

// Check if a shape placement is physically valid:
// 1. It must be supported (rest on ground or another shape)
// 2. No excessive overhang (center of mass check)
export function validatePlacement(placingShape, allShapes) {
  const errors = []
  const cx = placingShape.x
  const cz = placingShape.z

  // Check if resting on something
  const settleY = computeSettleY(placingShape, allShapes)
  const bottom = getShapeBottom(placingShape)

  if (Math.abs(bottom - settleY) > 1.5) {
    errors.push('Shapes can\'t float! It needs to rest on the ground or another shape.')
  }

  // Overhang check: if resting on another shape, center must be over it
  const others = allShapes.filter(s => s.id !== placingShape.id)
  const supporting = others.filter(s => {
    const top = getShapeTop(s)
    return Math.abs(top - bottom) < 1.5
  })

  if (supporting.length > 0) {
    // Find the bounding radius of support directly below
    let maxSupportR = 0
    let supportCx = 0
    let supportCz = 0

    for (const s of supporting) {
      if (s.radius > maxSupportR) {
        maxSupportR = s.radius
        supportCx = s.x
        supportCz = s.z
      }
    }

    const distFromSupport = Math.sqrt((cx - supportCx) ** 2 + (cz - supportCz) ** 2)
    const maxAllowed = maxSupportR + placingShape.radius * 0.35

    if (distFromSupport > maxAllowed) {
      errors.push('Too much overhang! That would tip over in real life.')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    settleY,
  }
}
