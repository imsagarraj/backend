import { useEffect, useRef } from 'react'

const LINE_COUNT = 4
const NODES_PER_LINE = 5

function rand(a, b) {
  return a + Math.random() * (b - a)
}

export default function LineAnimation() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    // each "line" is a chain of nodes connected by straight segments
    // nodes drift with constant velocity and bounce off walls
    let lines

    function init(w, h) {
      lines = Array.from({ length: LINE_COUNT }, (_, li) => {
        const nodes = Array.from({ length: NODES_PER_LINE }, () => ({
          x: rand(60, w - 60),
          y: rand(60, h - 60),
          vx: rand(-0.6, 0.6),
          vy: rand(-0.6, 0.6),
        }))
        return { nodes }
      })
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth / 2
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!lines) init(w, h)
    }

    resize()
    window.addEventListener('resize', resize)

    function draw() {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr

      ctx.clearRect(0, 0, w, h)

      // update nodes
      for (const line of lines) {
        for (const n of line.nodes) {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 20 || n.x > w - 20) n.vx *= -1
          if (n.y < 20 || n.y > h - 20) n.vy *= -1
        }
      }

      // draw intra-line connections (straight segments)
      for (const line of lines) {
        const nodes = line.nodes
        ctx.beginPath()
        ctx.moveTo(nodes[0].x, nodes[0].y)
        for (let i = 1; i < nodes.length; i++) {
          ctx.lineTo(nodes[i].x, nodes[i].y)
        }
        ctx.strokeStyle = 'rgba(200, 90, 26, 0.2)'
        ctx.lineWidth = 0.8
        ctx.stroke()

        // draw nodes
        for (const n of nodes) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(200, 90, 26, 0.3)'
          ctx.fill()
        }
      }

      // draw inter-line connections (between nearby nodes of different lines)
      for (let a = 0; a < lines.length; a++) {
        for (let b = a + 1; b < lines.length; b++) {
          // find closest pair of nodes between these two lines
          let minDist = Infinity
          let pair = [null, null]
          for (const na of lines[a].nodes) {
            for (const nb of lines[b].nodes) {
              const dx = na.x - nb.x
              const dy = na.y - nb.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < minDist) {
                minDist = dist
                pair = [na, nb]
              }
            }
          }
          const maxDist = 250
          if (minDist < maxDist) {
            const alpha = (1 - minDist / maxDist) * 0.12
            ctx.beginPath()
            ctx.moveTo(pair[0].x, pair[0].y)
            ctx.lineTo(pair[1].x, pair[1].y)
            ctx.strokeStyle = `rgba(200, 90, 26, ${alpha})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
