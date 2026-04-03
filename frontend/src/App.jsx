import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, ShieldAlert, CheckCircle2, LockKeyhole, FileKey, Users, Hexagon } from 'lucide-react'

const API = "https://project-citadel-xiqp.onrender.com"

function AdminPanel({ token }) {
  const [users, setUsers] = useState([])
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [pwdForm, setPwdForm] = useState({ current: '', new: '' })
  const [pwdStatus, setPwdStatus] = useState('')

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdStatus('UPDATING...')
    try {
      const res = await fetch(`${API}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.new })
      })
      if (!res.ok) throw new Error()
      setPwdStatus('SUCCESS')
      setPwdForm({ current: '', new: '' })
      setTimeout(() => setPwdStatus(''), 3000)
    } catch (err) {
      setPwdStatus(`ERROR`)
      setTimeout(() => setPwdStatus(''), 3000)
    }
  }

  const fetchData = async () => {
    try {
      const uRes = await fetch(`${API}/api/v1/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      const tRes = await fetch(`${API}/api/v1/admin/tokens`, { headers: { Authorization: `Bearer ${token}` } })
      setUsers(await uRes.json()); setTokens(await tRes.json())
    } catch (e) { } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const generateToken = async () => {
    await fetch(`${API}/api/v1/admin/tokens/generate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    fetchData()
  }
  const revokeToken = async (id) => {
    await fetch(`${API}/api/v1/admin/tokens/${id}/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    fetchData()
  }

  const deleteUser = async (id) => {
    const res = await fetch(`${API}/api/v1/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) fetchData()
  }

  if (loading) return <div className="p-8 text-primary animate-pulse tracking-widest uppercase">Initializing...</div>

  return (
    <div className="p-8 text-[#e2e2e2] font-mono h-full overflow-y-auto">
      <div className="mb-10 flex gap-4"><Hexagon className="text-primary" /><h2 className="text-2xl font-black uppercase tracking-[0.2em]">Citadel Master Control</h2></div>

      <div className="mb-12">
        <div className="flex justify-between border-b border-[#454747] pb-4 mb-4 items-end">
          <div>
            <h3 className="text-lg font-bold tracking-widest">ACTIVE HARDWARE TOKENS</h3>
            <p className="text-[10px] text-[#5d5f5f] mt-1 tracking-widest uppercase">Gated Access Keys for System Registration</p>
          </div>
          <button onClick={generateToken} className="bg-primary text-black px-6 py-2 font-bold text-xs uppercase tracking-widest">Forge Key</button>
        </div>
        <div className="grid gap-2">
          {tokens.map(t => (
            <div key={t.id} className="bg-[#0e0e0e] border border-[#2a2a2a] p-4 flex justify-between items-center group hover:border-[#454747] transition-all">
              <div>
                <span className={`text-xl font-bold tracking-[0.1em] ${t.is_active && !t.used_by_id ? 'text-primary' : 'text-[#5d5f5f]'}`}>{t.token}</span>
                <p className="text-[10px] tracking-widest mt-2 uppercase">Status: <span className={t.is_active ? 'text-[#919191]' : 'text-[#ffb4ab]'}>{t.is_active ? 'ACTIVE' : 'REVOKED (KILLSWITCH)'}</span> | Burned: <span className={t.used_by_id ? 'text-[#ffb4ab]' : 'text-[#919191]'}>{t.used_by_id ? t.used_by_email : 'NO'}</span></p>
              </div>
              {t.is_active && !t.used_by_id && <button onClick={() => revokeToken(t.id)} className="border border-[#93000a] text-[#ffb4ab] hover:bg-[#93000a] hover:text-white px-4 py-2 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors">Revoke Signature</button>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex border-b border-[#454747] pb-4 mb-4 gap-2 items-end">
          <h3 className="text-lg tracking-widest font-bold uppercase flex gap-2"><Users /> Enrolled Tenants</h3>
        </div>
        <div className="grid gap-2">
          {users.map(u => (
            <div key={u.id} className="bg-[#131313] border border-[#2a2a2a] p-5 flex justify-between items-center group">
              <div>
                <span className="text-sm font-bold tracking-widest">{u.email}</span>
                <p className="text-[10px] tracking-[0.2em] text-[#919191] uppercase mt-2">Tier: <span className={u.role === 'ADMIN' ? 'text-primary' : 'text-[#e2e2e2]'}>{u.role}</span></p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-2xl text-white block font-light">{u.total_trades}</span>
                  <span className="text-[10px] tracking-[0.3em] text-[#5d5f5f] uppercase">Operations</span>
                </div>
                {u.role !== 'ADMIN' && (
                  <button onClick={() => deleteUser(u.id)} className="border border-[#93000a] text-[#ffb4ab] hover:bg-[#93000a] hover:text-white px-4 py-2 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors opacity-0 group-hover:opacity-100">
                    Purge Tenant
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold tracking-widest border-b border-[#454747] pb-4 mb-4 mt-12 uppercase flex gap-2">Update Master Signature</h3>
        <form onSubmit={handlePasswordChange} className="bg-[#131313] border border-[#2a2a2a] p-5 flex items-end gap-4 shadow-lg">
          <div className="flex flex-col flex-1">
            <label className="text-[10px] tracking-widest text-[#919191] uppercase mb-2">Current Password</label>
            <input type="password" value={pwdForm.current} onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))} required className="bg-transparent border-b border-[#454747] px-2 py-1 text-sm tracking-widest outline-none focus:border-primary transition-colors text-white" />
          </div>
          <div className="flex flex-col flex-1">
            <label className="text-[10px] tracking-widest text-[#919191] uppercase mb-2">New Password</label>
            <input type="password" value={pwdForm.new} onChange={e => setPwdForm(p => ({ ...p, new: e.target.value }))} required className="bg-transparent border-b border-[#454747] px-2 py-1 text-sm tracking-widest outline-none focus:border-primary transition-colors text-white" />
          </div>
          <button type="submit" disabled={pwdStatus === 'UPDATING...'} className="border border-[#454747] px-6 py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors self-end w-48 text-center h-10 flex items-center justify-center disabled:opacity-50">{pwdStatus || 'UPDATE SIGNATURE'}</button>
        </form>
      </div>

    </div>
  )
}

function UserSettingsPanel({ token, onLogout }) {
  const [pwdForm, setPwdForm] = useState({ current: '', new: '' })
  const [pwdStatus, setPwdStatus] = useState('')

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdStatus('UPDATING...')
    try {
      const res = await fetch(`${API}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.new })
      })
      if (!res.ok) throw new Error()
      setPwdStatus('SUCCESS')
      setPwdForm({ current: '', new: '' })
      setTimeout(() => setPwdStatus(''), 3000)
    } catch (err) {
      setPwdStatus(`ERROR`)
      setTimeout(() => setPwdStatus(''), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to permanently purge this terminal node? This action cannot be reversed.")) return
    const res = await fetch(`${API}/api/v1/auth/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) onLogout()
  }

  return (
    <div className="p-8 md:p-12 text-[#e2e2e2] font-mono h-full overflow-y-auto">
      <div className="mb-10 flex gap-4 items-center">
        <Hexagon className="text-[#919191]" />
        <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Terminal Configuration</h2>
      </div>

      <div className="max-w-2xl">
        <h3 className="text-lg font-bold tracking-widest border-b border-[#454747] pb-4 mb-6 mt-8 uppercase text-white">Update Signature</h3>
        <form onSubmit={handlePasswordChange} className="bg-[#131313] border border-[#2a2a2a] p-6 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col">
            <label className="text-[10px] tracking-widest text-[#919191] uppercase mb-2">Current Authentication Signature</label>
            <input type="password" value={pwdForm.current} onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))} required className="bg-[#0e0e0e] border border-[#454747] px-4 py-3 text-sm tracking-widest outline-none focus:border-primary transition-colors text-white" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] tracking-widest text-[#919191] uppercase mb-2">New Authentication Signature</label>
            <input type="password" value={pwdForm.new} onChange={e => setPwdForm(p => ({ ...p, new: e.target.value }))} required className="bg-[#0e0e0e] border border-[#454747] px-4 py-3 text-sm tracking-widest outline-none focus:border-primary transition-colors text-white" />
          </div>
          <button type="submit" disabled={pwdStatus === 'UPDATING...'} className="border border-[#454747] px-6 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-colors text-center disabled:opacity-50">{pwdStatus || 'ENGAGE SIGNATURE PROTOCOL'}</button>
        </form>
      </div>

      <div className="max-w-2xl mt-12 mb-12">
        <h3 className="text-lg font-bold tracking-widest border-b border-[#93000a]/50 pb-4 mb-6 uppercase text-[#ffb4ab]">Danger Zone</h3>
        <div className="bg-[#131313] border border-[#93000a]/30 p-6 flex justify-between items-center shadow-lg">
          <div>
            <h4 className="text-sm font-bold tracking-widest text-[#ffb4ab] uppercase">Purge Terminal Node</h4>
            <p className="text-[10px] text-[#919191] mt-2 tracking-widest uppercase">Permanently erase all identity footprint & session logs.</p>
          </div>
          <button onClick={handleDeleteAccount} className="border border-[#93000a] bg-[#93000a]/10 text-[#ffb4ab] hover:bg-[#93000a] hover:text-white px-6 py-3 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors">
            Purge Data
          </button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ sessionToken, user, onLogout }) {
  const [msgs, setMsgs] = useState([])
  const [inputState, setInput] = useState('')
  const [assetState, setAsset] = useState('SPY')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('CHAT')
  const endRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { if (view === 'CHAT') endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, view, loading])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/v1/history`, { headers: { Authorization: `Bearer ${sessionToken}` } })
        if (res.ok) {
          const hist = await res.json()
          setMsgs(hist.flatMap(h => [
            { type: 'user', text: h.user_query, time: h.timestamp, isHist: true },
            { type: 'ai', data: h.data, isHist: true }
          ]))
        }
      } catch (e) { }
    })()
  }, [sessionToken])

  const clearHistory = async () => {
    try {
      const res = await fetch(`${API}/api/v1/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        setMsgs([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const send = async () => {
    if (!inputState.trim() && !file) return
    const text = inputState.trim()
    const currentFileUrl = file ? URL.createObjectURL(file) : null

    setMsgs(p => [...p, { type: 'user', text: text || (file ? `[Attached Chart: ${file.name}]` : ""), fileUrl: currentFileUrl, time: new Date().toLocaleTimeString() }])
    setInput(''); setLoading(true); setFile(null);

    const fd = new FormData()
    fd.append('live_data', JSON.stringify({ asset: assetState, user_query: text }))

    if (file) {
      fd.append('chart_image', file)
    } else {
      const c = document.createElement('canvas'); c.width = 1; c.height = 1;
      const b = await new Promise(r => c.toBlob(r, 'image/png'))
      fd.append('chart_image', b, 'd.png')
    }

    try {
      const res = await fetch(`${API}/api/v1/analyze-trade`, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` }, body: fd })
      if (res.status === 401 || res.status === 403) return onLogout()
      const data = await res.json()
      setMsgs(p => [...p, { type: 'ai', data: data }])
    } catch (e) {
      setMsgs(p => [...p, { type: 'ai', data: { verdict: 'ERROR', ai_reasoning: 'API LOST CONNECTION OR DATA CORRUPTED.' } }])
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-surface text-[#e2e2e2] h-screen flex font-body selection:bg-primary selection:text-black">
      <aside className="w-64 bg-[#1b1b1b] flex flex-col py-6 border-r border-[#454747]/30 shadow-2xl relative z-50">
        <div className="px-6 mb-12"><h1 className="text-xl font-black text-white uppercase tracking-tighter">CITADEL</h1><p className="text-[10px] text-[#919191] tracking-widest mt-1">{user?.email}</p></div>
        <nav className="flex-1">
          <a onClick={() => setView('CHAT')} className={`flex items-center gap-3 px-6 py-4 cursor-pointer border-l-4 transition-all ${view === 'CHAT' ? 'bg-white text-black font-bold border-primary' : 'text-[#919191] border-transparent hover:text-white hover:bg-[#2a2a2a]'}`}><span className="material-symbols-outlined">dashboard</span> <span className="font-mono text-sm tracking-tight uppercase">Dashboard</span></a>
        </nav>
        <div className="flex flex-col mt-auto pb-4">
          <a onClick={() => setView('SETTINGS')} className={`flex items-center gap-3 px-6 py-4 cursor-pointer border-l-4 transition-all mb-2 ${view === 'SETTINGS' ? 'bg-white text-black font-bold border-primary' : 'text-[#919191] border-transparent hover:text-white hover:bg-[#2a2a2a]'}`}><span className={`material-symbols-outlined text-[20px]`}>{user?.role === 'ADMIN' ? 'admin_panel_settings' : 'settings'}</span> <span className="font-mono text-xs tracking-widest font-bold uppercase">{user?.role === 'ADMIN' ? 'Super Settings' : 'Settings'}</span></a>
          <a onClick={onLogout} className="flex items-center gap-3 px-6 py-4 text-[#ffb4ab] cursor-pointer border-l-4 border-transparent hover:border-[#ffb4ab] hover:bg-[#93000a]/20 transition-all"><span className="material-symbols-outlined">logout</span> <span className="font-mono text-xs uppercase tracking-tight font-bold">Disconnect</span></a>
          <div className="mt-6 px-6 text-[#454747] text-[9px] tracking-[0.2em] font-mono uppercase leading-relaxed font-bold">Developed by<br /><span className="text-primary mt-1 block">The True Brightlence</span></div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
        <header className="bg-[#131313]/90 backdrop-blur-md px-8 py-4 flex justify-between border-b border-[#2a2a2a] z-40 items-center shadow-xl">
          <div className="flex gap-4 items-center">
            <span className="text-lg font-black text-white tracking-tighter uppercase">{view === 'SETTINGS' ? 'ADMINISTRATIVE OVERRIDE' : 'PROJECT SECURE-NET'}</span>
            {user?.role === 'ADMIN' && <span className="text-[10px] bg-primary/20 text-primary border border-primary/50 tracking-widest px-2 py-0.5 font-mono shadow-[0_0_10px_rgba(255,255,255,0.1)]">ROOT_ACCESS</span>}
          </div>
          {view === 'CHAT' && (
            <button onClick={clearHistory} className="flex gap-2 items-center text-[#ffb4ab] border border-[#93000a]/50 bg-[#93000a]/10 hover:bg-[#93000a] hover:text-white px-4 py-1.5 transition-colors font-mono">
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span className="text-[10px] tracking-widest font-bold uppercase">Clear Chat</span>
            </button>
          )}
        </header>

        {view === 'SETTINGS' ? (user?.role === 'ADMIN' ? <AdminPanel token={sessionToken} /> : <UserSettingsPanel token={sessionToken} onLogout={onLogout} />) : (
          <>
            <section className="flex-1 overflow-y-auto p-12 pb-40 space-y-12">
              {msgs.length === 0 && <div className="flex flex-col justify-center items-center h-full text-[#454747] opacity-60"><Terminal size={48} className="mb-4" /><span className="font-mono text-sm tracking-widest uppercase">AWAITING COMMAND</span></div>}
              {msgs.map((m, i) => m.type === 'user' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex flex-col items-end gap-2 w-full max-w-[90%] mx-auto ${m.isHist ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
                  <div className="bg-[#1b1b1b] p-6 border-l-[3px] border-primary max-w-6xl text-[15px] w-full shadow-lg leading-relaxed"><p>{m.text}</p>
                    {m.fileUrl && <div className="aspect-video w-[400px] bg-[#0e0e0e] mt-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] p-0"><img src={m.fileUrl} className="w-full h-full object-cover" /></div>}
                  </div>
                  <span className="font-mono text-[9px] text-[#5d5f5f] tracking-[0.2em]">{m.isHist ? 'HISTORICAL RECORD' : `SENT ${m.time}`}</span>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex flex-col items-start gap-2 w-full max-w-[90%] mx-auto ${m.isHist ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
                  <div className="flex gap-2 items-center font-mono text-[9px] font-bold text-[#e2e2e2] tracking-[0.3em] uppercase"><div className={`w-2.5 h-2.5 shadow-[0_0_8px_${m.data?.verdict === 'EXECUTE' ? '#fff' : '#93000a'}] ${m.data?.verdict === 'EXECUTE' ? 'bg-primary' : m.data?.verdict === 'WAIT' ? 'bg-[#c6c6c7]' : 'bg-[#ffb4ab]'}`}></div>CITADEL_COGNITION</div>
                  <div className="bg-[#0e0e0e] p-8 border border-[#2a2a2a] w-full text-[15px] leading-loose whitespace-pre-wrap shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#454747] to-transparent opacity-50"></div>
                    <p className="text-[#c6c6c6]">{m.data?.ai_reasoning}</p>
                    {m.data?.trade_plan ? (
                      <div className="grid grid-cols-4 gap-[2px] bg-[#2a2a2a] border border-[#2a2a2a] mt-8 font-mono shadow-inner">
                        {['ENTRY', 'VERDICT', 'STOPLOSS', 'TAKE_PROFIT'].map((k, j) => (
                          <div key={k} className="bg-[#131313] p-5 text-center hover:bg-[#1b1b1b] transition-colors">
                            <p className={`text-[10px] tracking-[0.2em] mb-2 ${j === 2 ? 'text-[#ffb4ab]' : j === 3 ? 'text-primary' : 'text-[#919191]'}`}>{k}</p>
                            <p className={`text-2xl font-light tracking-widest ${j === 1 && m.data.verdict === 'EXECUTE' ? 'text-primary font-bold' : j === 1 ? 'text-[#ffb4ab] font-bold' : 'text-white'}`}>
                              {j === 0 ? m.data.trade_plan.entry : j === 1 ? m.data.verdict : j === 2 ? m.data.trade_plan.sl : m.data.trade_plan.tp}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : m.data?.verdict && m.data?.verdict !== 'CHAT' && m.data?.verdict !== '' && (
                      <div className="mt-8 border border-[#2a2a2a] inline-block px-8 py-4 font-mono bg-[#131313] shadow-md"><p className="text-[10px] text-[#919191] tracking-[0.2em] mb-1">FINAL VERDICT</p><p className={`text-2xl font-bold tracking-[0.1em] ${m.data?.verdict === 'EXECUTE' ? 'text-primary' : 'text-[#ffb4ab]'}`}>{m.data?.verdict}</p></div>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && <div className="flex items-center gap-3 p-6 border border-[#2a2a2a] bg-[#0e0e0e] max-w-4xl mx-auto shadow-2xl relative overflow-hidden"><div className="w-2.5 h-2.5 bg-primary animate-ping"></div><span className="font-mono text-primary text-[10px] tracking-[0.3em] font-bold uppercase z-10">Synthesizing Protocols...</span><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 animate-pulse"></div></div>}
              <div ref={endRef} />
            </section>
            <footer className="absolute bottom-10 left-10 right-10 z-40 flex flex-col items-stretch gap-2">
              {file && (
                <div className="relative p-2 bg-[#131313] border border-[#454747] shadow-xl flex items-start gap-4 w-full transition-all duration-300">
                  <div className="h-20 aspect-video bg-[#0e0e0e] shadow-inner p-1">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover border border-[#2a2a2a]" />
                  </div>
                  <div className="flex flex-col mt-2">
                    <span className="text-[10px] text-[#e2e2e2] font-bold tracking-widest uppercase truncate max-w-[300px]">{file.name}</span>
                    <span className="text-[8px] text-[#919191] tracking-[0.2em] uppercase mt-1">Ready for upload</span>
                  </div>
                  <button onClick={() => setFile(null)} className="ml-auto text-[#ffb4ab] hover:bg-[#93000a] hover:text-white border border-transparent hover:border-[#93000a] p-1 transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                </div>
              )}
              <div className="w-full bg-[#1b1b1b]/95 backdrop-blur-xl p-2 border border-[#474747]/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex gap-2 transition-all hover:border-[#919191]">
                <button className="p-4 text-[#919191] hover:text-white hover:bg-[#2a2a2a] transition-colors" onClick={() => fileRef.current?.click()}><span className="material-symbols-outlined">attachment</span></button>
                <input type="file" ref={fileRef} className="hidden" onChange={e => setFile(e.target.files[0])} />
                <input type="text" className="w-24 bg-transparent border-r border-[#454747] text-primary px-4 outline-none font-mono text-sm tracking-widest uppercase placeholder-[#454747]" placeholder="SYM" value={assetState} onChange={e => setAsset(e.target.value.toUpperCase())} maxLength={8} />
                <input type="text" className="flex-1 bg-transparent border-none text-[#e2e2e2] px-4 outline-none font-body text-sm tracking-wide" placeholder={file ? `Directive for ${file.name}...` : "Command AI or attach market chart..."} value={inputState} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
                <button className="bg-primary text-black px-6 hover:bg-white transition-colors font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]" onClick={send}><span className="material-symbols-outlined">arrow_forward</span></button>
              </div>
            </footer>
          </>
        )}
      </main>
    </motion.div>
  )
}

function AuthGate({ onAuth }) {
  const [m, setM] = useState('L')
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [t, setT] = useState('')
  const [s, setS] = useState('i'); const [err, setErr] = useState('')

  const submit = async (ev) => {
    ev.preventDefault(); setS('c')
    try {
      if (m === 'R') {
        const res = await fetch(`${API}/api/v1/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p, access_token: t }) })
        if (!res.ok) throw new Error((await res.json()).detail)
      }
      const data = new URLSearchParams()
      data.append('username', e); data.append('password', p)
      const res2 = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', body: data })
      if (!res2.ok) throw new Error("Invalid decryption signature.")
      const jd = await res2.json()
      setS('g'); setTimeout(() => onAuth(jd.access_token, { email: e, role: jd.role }), 1200)
    } catch (er) { setErr(er.message); setS('d'); setTimeout(() => setS('i'), 2500) }
  }

  return (
    <div className="bg-[#0a0a0a] text-[#e2e2e2] h-screen flex justify-center items-center font-mono relative selection:bg-primary selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ ease: "easeOut", duration: 0.8 }} className="bg-[#0e0e0e]/95 backdrop-blur-3xl border border-[#2a2a2a] p-12 shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-lg z-10 relative">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-40"></div>
        <LockKeyhole size={42} className={`mb-6 mx-auto ${s === 'c' ? 'text-primary animate-pulse' : 'text-[#919191]'}`} />
        <h1 className="text-center text-3xl font-black tracking-[0.3em] uppercase mb-2 text-white">CITADEL</h1>
        <p className="text-center text-[10px] tracking-[0.4em] uppercase text-[#5d5f5f] mb-8">Secure Hardware Node</p>
        <div className="flex gap-4 justify-center text-[9px] tracking-[0.2em] font-bold uppercase mb-8">
          <button type="button" onClick={() => setM('L')} className={m === 'L' ? 'text-primary border-b border-primary pb-1' : 'text-[#5d5f5f] pb-1 hover:text-white transition-colors'}>Decrypt Stream</button>
          <button type="button" onClick={() => setM('R')} className={m === 'R' ? 'text-primary border-b border-primary pb-1' : 'text-[#5d5f5f] pb-1 hover:text-white transition-colors'}>Register Terminal</button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-8">
          <input type="email" placeholder="OPERATOR_EMAIL" className="bg-transparent border-b border-[#454747] text-center p-3 outline-none focus:border-primary tracking-widest text-[15px] transition-colors" value={e} onChange={x => setE(x.target.value)} required />
          <input type="password" placeholder="SIGNATURE_PASSWORD" className="bg-transparent border-b border-[#454747] text-center p-3 outline-none focus:border-primary tracking-widest text-[15px] transition-colors" value={p} onChange={x => setP(x.target.value)} required />
          <AnimatePresence>{m === 'R' && <motion.input initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} type="password" placeholder="MASTER_KEY_TOKEN" className="bg-transparent border-b-2 border-primary text-center p-3 outline-none focus:border-primary tracking-[0.3em] text-lg text-primary overflow-hidden" value={t} onChange={x => setT(x.target.value)} required />}</AnimatePresence>

          <div className="h-6 flex items-center justify-center font-bold text-[10px] tracking-widest uppercase">
            {s === 'c' && <span className="text-primary animate-pulse flex items-center gap-3"><div className="w-1.5 h-1.5 bg-primary animate-ping"></div>AUTHENTICATING...</span>}
            {s === 'g' && <span className="text-primary flex items-center gap-2"><CheckCircle2 size={14} />ACCESS GRANTED</span>}
            {s === 'd' && <span className="text-[#ffb4ab] flex items-center gap-2"><ShieldAlert size={14} />{err}</span>}
          </div>
          <button type="submit" disabled={s === 'c' || s === 'g'} className="border border-[#454747] py-5 text-xs font-bold tracking-[0.2em] uppercase transition-all text-[#919191] hover:text-white hover:border-white">
            {m === 'L' ? 'INITIATE LINK' : 'BURN KEY & ENABLE NODE'}
          </button>
        </form>
      </motion.div>
      <div className="absolute bottom-8 left-0 w-full text-center text-[#454747] text-[10px] tracking-[0.4em] font-mono uppercase font-bold z-0">Developed by <span className="text-primary">The True Brightlence</span></div>
    </div>
  )
}

export default function App() {
  const [s, setS] = useState({ t: null, u: null })
  useEffect(() => {
    const at = localStorage.getItem('citadel_jwt'); const au = localStorage.getItem('citadel_user')
    if (at && au) setS({ t: at, u: JSON.parse(au) })
  }, [])
  const login = (token, user) => { localStorage.setItem('citadel_jwt', token); localStorage.setItem('citadel_user', JSON.stringify(user)); setS({ t: token, u: user }) }
  const logout = () => { localStorage.clear(); setS({ t: null, u: null }) }
  return <AnimatePresence mode="wait">{!s.t ? <AuthGate key="auth" onAuth={login} /> : <Dashboard key="dash" sessionToken={s.t} user={s.u} onLogout={logout} />}</AnimatePresence>
}
