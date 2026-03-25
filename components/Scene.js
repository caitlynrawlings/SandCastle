import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../lib/store'
import { computeSettleY, validatePlacement } from '../lib/physics'

function getRenderY(type, y, r, h) {
  switch (type) {
    case 'sphere':     return y + r
    case 'hemisphere': return y
    case 'cylinder':   return y + h / 2
    case 'cone':       return y + h / 2
    default:           return y
  }
}

function ShapeGeometry({ type, r, h }) {
  switch (type) {
    case 'sphere':     return <sphereGeometry args={[r, 32, 32]} />
    case 'hemisphere': return <sphereGeometry args={[r, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
    case 'cylinder':   return <cylinderGeometry args={[r, r, h, 32]} />
    case 'cone':       return <coneGeometry args={[r, h, 32]} />
    default:           return <sphereGeometry args={[r, 32, 32]} />
  }
}

const BASE_COLORS = {
  sphere:     '#F4D35E',
  hemisphere: '#F4D35E',
  cylinder:   '#F4D35E',
  cone:       '#F4D35E',
}

function PlacedShape({ shape, isSelected, onSelect, presentMode, justSelected, isActive, isHovered }) {
  const [hovered, setHovered] = useState(false)
  const { radius: r, height: h, x, y, z, type } = shape
  const renderY = getRenderY(type, y, r, h)
  const color = isSelected ? '#FFD166' : isHovered ? '#FFE8A3' : BASE_COLORS[type] || '#F4A261'
  return (
    <mesh
      position={[x, renderY, z]}
      onClick={(e) => {
        if (isActive) return

        e.stopPropagation()
        if (!presentMode) {
          justSelected.current = true
          setTimeout(() => { justSelected.current = false }, 150)
          onSelect(shape.id)
        }
      }}
      onPointerOver={(e) => { e.stopPropagation(); if (!presentMode) setHovered(true) }}
      onPointerOut={() => setHovered(false)}
      castShadow receiveShadow
    >
      <ShapeGeometry type={type} r={r} h={h} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

function GhostShape({ shape, isValid }) {
  if (!shape) return null
  const { radius: r, height: h, x, y, z, type } = shape
  const renderY = getRenderY(type, y, r, h)
  return (
    <mesh position={[x, renderY, z]}>
      <ShapeGeometry type={type} r={r} h={h} />
      <meshStandardMaterial color={isValid ? '#0080d6' : '#FF3333'} transparent opacity={0.55} />
    </mesh>
  )
}

function GroundTracker({ onMove }) {
  const { camera, gl } = useThree()
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())

  useEffect(() => {
    const canvas = gl.domElement
    const handle = (e) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.current.setFromCamera(mouse, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(plane.current, target)
      if (target) onMove(target.x, target.z)
    }
    canvas.addEventListener('mousemove', handle)
    canvas.addEventListener('touchmove', handle)
    return () => {
      canvas.removeEventListener('mousemove', handle)
      canvas.removeEventListener('touchmove', handle)
    }
  }, [camera, gl, onMove])

  return null
}

export default function Scene({
  pendingShape,
  movingShapeId,
  onPlaceShape,
  onMoveShape,
  onSelectShape,
  onInvalidAttempt,
  presentMode,
  autoRotate,
  hoveredId
}) {
  const shapes = useStore(s => s.shapes)
  const selectedId = useStore(s => s.selectedId)
  const [cursor, setCursor] = useState(null)
  const justSelected = useRef(false)

  useEffect(() => {
    setCursor(null)
  }, [movingShapeId, pendingShape])

  const isMoving = movingShapeId != null
  const isActive = pendingShape != null || isMoving
  const movingShape = isMoving ? shapes.find(s => s.id === movingShapeId) : null
  const previewBase = pendingShape || movingShape
  const othersForValidation = isMoving ? shapes.filter(s => s.id !== movingShapeId) : shapes
  

  const ghost = (previewBase && cursor) ? (() => {
    const y = computeSettleY({ ...previewBase, x: cursor.x, z: cursor.z }, othersForValidation)
    return { ...previewBase, x: cursor.x, z: cursor.z, y }
  })() : null

  const validation = ghost ? validatePlacement(ghost, othersForValidation) : { valid: true, errors: [] }
  console.log('validation', ghost, validation.valid, validation.errors)

  const handleClick = useCallback(() => {
    // TODO: figure this out
    // should be that if nothing is selected then the click wil selelct
    // if something is selected then the click will try to place it and do nothing if placement is invalid
    console.log('handleClick', { ghost, cursor, validation, isMoving, movingShapeId })
    if (justSelected.current) return
    console.log('handleClick passed justSelected check')
    if (!ghost || !cursor) { onSelectShape(null); return }
    console.log('handleClick passed ghost/cursor check')
    if (!validation.valid) { onInvalidAttempt(validation.errors[0]); return }
    if (isMoving) {
      onMoveShape({ id: movingShapeId, x: ghost.x, z: ghost.z, y: ghost.y })
    } else {
      onPlaceShape({ x: ghost.x, z: ghost.z, y: ghost.y })
    }
  }, [ghost, cursor, validation, isMoving, movingShapeId, onPlaceShape, onMoveShape, onSelectShape, onInvalidAttempt])

  return (
    <Canvas
      shadows
      camera={{ position: [0, 25, 45], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #E0C89A 100%)' }}
      onClick={handleClick}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 20]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#fedb93" roughness={1} />
      </mesh>

      <Grid
        position={[0, 0.02, 0]}
        args={[40, 40]}
        cellColor="#C49A4A"
        sectionColor="#B8860B"
        cellSize={2}
        sectionSize={10}
        fadeDistance={60}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {shapes.filter(s => s.id !== movingShapeId).map(shape => (
        <PlacedShape
          key={shape.id}
          shape={shape}
          isSelected={shape.id === selectedId}
          isHovered={shape.id === hoveredId}
          onSelect={onSelectShape}
          presentMode={presentMode}
          justSelected={justSelected}
          isActive={isActive}
        />
      ))}

      {ghost && <GhostShape shape={ghost} isValid={validation.valid} />}
      {isActive && <GroundTracker onMove={(x, z) => {
        const BUILD_LIMIT = 90
        x = Math.max(-BUILD_LIMIT, Math.min(BUILD_LIMIT, x))
        z = Math.max(-BUILD_LIMIT, Math.min(BUILD_LIMIT, z))
        setCursor({ x, z })
      }} />}

      <OrbitControls
        enablePan={!isActive}
        autoRotate={autoRotate}
        autoRotateSpeed={3}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={300}
      />

      {shapes.length === 0 && !isActive && (
        <Text position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2.5} color="#B8860B" anchorX="center" anchorY="middle">
          Add a shape to start building!
        </Text>
      )}
    </Canvas>
  )
}
