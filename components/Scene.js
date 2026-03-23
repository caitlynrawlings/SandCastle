import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../lib/store'
import { computeSettleY, validatePlacement } from '../lib/physics'

// Individual shape mesh
function ShapeMesh({ shape, isSelected, onSelect, isDragging, presentMode }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  const colors = {
    sphere:     '#F4A261',
    hemisphere: '#E76F51',
    cylinder:   '#F4D35E',
    cone:       '#EE6C4D',
  }

  const color = isSelected ? '#FFD166' : hovered ? '#FFE8A3' : colors[shape.type] || '#F4A261'

  useFrame(() => {
    if (meshRef.current && isSelected && !presentMode) {
      meshRef.current.rotation.y += 0.005
    }
  })

  const { radius: r, height: h, x, y, z, type } = shape

  const geometry = () => {
    switch (type) {
      case 'sphere':
        return <sphereGeometry args={[r, 32, 32]} />
      case 'hemisphere':
        return <sphereGeometry args={[r, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      case 'cylinder':
        return <cylinderGeometry args={[r, r, h, 32]} />
      case 'cone':
        return <coneGeometry args={[r, h, 32]} />
      default:
        return <sphereGeometry args={[r, 32, 32]} />
    }
  }

  // Adjust Y so shapes sit properly
  const renderY = (() => {
    switch (type) {
      case 'sphere':     return y + r
      case 'hemisphere': return y
      case 'cylinder':   return y + h / 2
      case 'cone':       return y + h / 2
      default:           return y
    }
  })()

  return (
    <mesh
      ref={meshRef}
      position={[x, renderY, z]}
      onClick={(e) => { e.stopPropagation(); onSelect(shape.id) }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      {geometry()}
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        metalness={0.1}
        transparent={isSelected}
        opacity={isSelected ? 0.85 : 1}
      />
    </mesh>
  )
}

// Ghost shape for preview during placement
function GhostShape({ shape }) {
  if (!shape) return null
  const { radius: r, height: h, x, y, z, type } = shape

  const renderY = (() => {
    switch (type) {
      case 'sphere':     return y + r
      case 'hemisphere': return y
      case 'cylinder':   return y + h / 2
      case 'cone':       return y + h / 2
      default:           return y
    }
  })()

  const geometry = () => {
    switch (type) {
      case 'sphere':     return <sphereGeometry args={[r, 32, 32]} />
      case 'hemisphere': return <sphereGeometry args={[r, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      case 'cylinder':   return <cylinderGeometry args={[r, r, h, 32]} />
      case 'cone':       return <coneGeometry args={[r, h, 32]} />
      default:           return <sphereGeometry args={[r, 32, 32]} />
    }
  }

  return (
    <mesh position={[x, renderY, z]}>
      {geometry()}
      <meshStandardMaterial color="#88CCFF" transparent opacity={0.4} wireframe={false} />
    </mesh>
  )
}

// Drag handler component
function DragPlane({ onMove }) {
  const { camera, gl } = useThree()
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef(new THREE.Raycaster())

  useEffect(() => {
    const canvas = gl.domElement

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycaster.current.setFromCamera(mouse, camera)
      const target = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(planeRef.current, target)
      if (target) onMove(target.x, target.z)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    return () => canvas.removeEventListener('mousemove', handleMouseMove)
  }, [camera, gl, onMove])

  return null
}

export default function Scene({ pendingShape, onPlaceShape, presentMode, autoRotate }) {
  const shapes = useStore(s => s.shapes)
  const selectedId = useStore(s => s.selectedId)
  const selectShape = useStore(s => s.selectShape)
  const updateShapePosition = useStore(s => s.updateShapePosition)

  const [ghostPos, setGhostPos] = useState({ x: 0, z: 0 })

  // Ghost for pending placement
  const ghostShape = pendingShape ? {
    ...pendingShape,
    x: ghostPos.x,
    z: ghostPos.z,
    y: computeSettleY({ ...pendingShape, x: ghostPos.x, z: ghostPos.z }, shapes),
  } : null

  const handleCanvasClick = (e) => {
    if (pendingShape) {
      // Place the shape
      const settled = computeSettleY({ ...pendingShape, x: ghostPos.x, z: ghostPos.z }, shapes)
      const result = validatePlacement(
        { ...pendingShape, x: ghostPos.x, z: ghostPos.z, y: settled },
        shapes
      )
      onPlaceShape({ x: ghostPos.x, z: ghostPos.z, y: settled, valid: result.valid, errors: result.errors })
    } else {
      selectShape(null)
    }
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 25, 45], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #E0C89A 100%)' }}
      onClick={handleCanvasClick}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 40, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Sand ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#D4A853" roughness={1} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        args={[40, 40]}
        position={[0, 0.01, 0]}
        cellColor="#C49A4A"
        sectionColor="#B8860B"
        cellSize={2}
        sectionSize={10}
        fadeDistance={60}
        fadeStrength={1}
      />

      {/* Shapes */}
      {shapes.map(shape => (
        <ShapeMesh
          key={shape.id}
          shape={shape}
          isSelected={shape.id === selectedId}
          onSelect={selectShape}
          presentMode={presentMode}
        />
      ))}

      {/* Ghost preview */}
      {pendingShape && <GhostShape shape={ghostShape} />}
      {pendingShape && <DragPlane onMove={(x, z) => setGhostPos({ x, z })} />}

      {/* Camera controls */}
      <OrbitControls
        enablePan={!pendingShape}
        autoRotate={autoRotate}
        autoRotateSpeed={3}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={10}
        maxDistance={80}
      />

      {/* Decorative text */}
      {shapes.length === 0 && (
        <Text
          position={[0, 0.5, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={2.5}
          color="#B8860B"
          anchorX="center"
          anchorY="middle"
        >
          Click a shape to start building!
        </Text>
      )}
    </Canvas>
  )
}
