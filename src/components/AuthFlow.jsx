import { useState } from 'react'
import { api } from '../lib/api'
import { Shield, Phone, KeyRound, Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthFlow({ authState }) {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (authState === 'waitPhoneNumber') {
        await api.submitPhone(phone)
      } else if (authState === 'waitCode') {
        await api.submitCode(code)
      } else if (authState === 'waitPassword') {
        await api.submitPassword(password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = {
    waitPhoneNumber: {
      icon: Phone,
      title: 'Sign in to Telegram',
      description: 'Enter your phone number in international format',
    },
    waitCode: {
      icon: KeyRound,
      title: 'Verification code',
      description: 'We sent a code to your Telegram app',
    },
    waitPassword: {
      icon: Lock,
      title: 'Two-factor authentication',
      description: 'Enter your cloud password to continue',
    },
  }

  const step = steps[authState] || { icon: Shield, title: 'Connecting...', description: '' }
  const StepIcon = step.icon

  return (
    <div className="h-screen flex items-center justify-center bg-p2-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-p2-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-p2-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm px-6 animate-fade-in-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-p2-accent/10 border border-p2-accent/20 mb-5">
            <Shield className="w-8 h-8 text-p2-accent" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold text-p2-text tracking-tight">P2Chat</h1>
          <p className="text-p2-muted mt-1.5 text-sm">Encrypted Telegram Client</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-p2-surface mb-1">
              <StepIcon className="w-5 h-5 text-p2-text-secondary" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-medium text-p2-text">{step.title}</h2>
            <p className="text-p2-muted text-sm">{step.description}</p>
          </div>

          {authState === 'waitPhoneNumber' && (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="input-field text-center"
              autoFocus
            />
          )}

          {authState === 'waitCode' && (
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345"
              className="input-field text-center tracking-[0.3em] text-xl font-medium"
              autoFocus
              maxLength={6}
            />
          )}

          {authState === 'waitPassword' && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Cloud password"
              className="input-field"
              autoFocus
            />
          )}

          {error && (
            <div className="flex items-center gap-2 text-p2-danger text-sm bg-p2-danger-dim rounded-xl px-4 py-2.5">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Please wait...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
