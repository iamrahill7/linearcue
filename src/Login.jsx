
import { useState } from 'react'
import { signInWithEmail } from './lib/supabase'
import './App.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1 className="login-logo">LinearCue</h1>
        <p className="login-tagline">Your invisible AI copilot for every call</p>

        {!sent ? (
          <>
            <input
              className="login-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              autoFocus
            />
            <button
              className="login-btn"
              onClick={handleSend}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
          </>
        ) : (
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:'32px', marginBottom:'12px'}}>📧</p>
            <p style={{fontSize:'13px', color:'#333', fontWeight:'500'}}>Check your email</p>
            <p style={{fontSize:'12px', color:'#666', marginTop:'8px', lineHeight:'1.5'}}>
              We sent a login link to<br/><strong>{email}</strong><br/>
              Click the link to open LinearCue
            </p>
            <button
              className="login-back"
              style={{marginTop:'16px'}}
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Use different email
            </button>
          </div>
        )}

        {error && <p className="login-error">{error}</p>}
        <p className="login-footer">₹199/month after free trial</p>
      </div>
    </div>
  )
}
