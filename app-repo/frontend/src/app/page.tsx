'use client'

import { useEffect, useState } from 'react'

interface HealthStatus {
  status: string
  timestamp: string
  version: string
  environment: string
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/health`)
      .then(r => r.json())
      .then(data => { setHealth(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '800px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', padding: '0.3rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#818cf8' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Production System Online
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          WDP301 Enterprise Platform
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '3rem', lineHeight: 1.6 }}>
          Full-stack system powered by Next.js · NestJS · MongoDB<br />
          Deployed on Kubernetes with ArgoCD GitOps
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'CI/CD', value: 'Jenkins + ArgoCD', icon: '🔄' },
            { label: 'Container', value: 'Docker + k3s', icon: '🐳' },
            { label: 'Cloud', value: 'AWS EC2 t3.small', icon: '☁️' },
            { label: 'IaC', value: 'Terraform', icon: '🏗️' },
          ].map(item => (
            <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginTop: '0.25rem' }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Backend Health Status</div>
          {loading ? (
            <div style={{ color: '#94a3b8' }}>Checking backend...</div>
          ) : health ? (
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <span><strong style={{ color: '#10b981' }}>✓ {health.status}</strong></span>
              <span style={{ color: '#94a3b8' }}>v{health.version}</span>
              <span style={{ color: '#94a3b8' }}>{health.environment}</span>
            </div>
          ) : (
            <div style={{ color: '#ef4444' }}>⚠ Backend unreachable</div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </main>
  )
}
