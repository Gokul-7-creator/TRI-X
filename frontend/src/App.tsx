import { useEffect, useState, createContext, useContext, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Client } from '@stomp/stompjs';
import { Activity, LayoutDashboard, UsersRound, UserRoundPlus, ListOrdered, HeartPulse, ChartNoAxesCombined, LogOut, Bell, Menu, X } from 'lucide-react';
import { api, csrf, User } from './lib/api';
import { Landing, SignIn, SignUp } from './pages/Public';
import { Analytics } from './pages/Dashboard';
import { AdminDashboard, NurseDashboard, PatientDashboard } from './pages/Roles';
import { Patients, Register } from './pages/Patients';
import { Triage, SmartQueue, Monitoring, Doctor } from './pages/Workflow';

type AppContext = {user:User|null;setUser:(v:User|null)=>void;refresh:number;bump:()=>void};
const Ctx=createContext<AppContext>({user:null,setUser:()=>{},refresh:0,bump:()=>{}});
export const useApp=()=>useContext(Ctx);
const nav=[
  {name:'My Dashboard',url:'/app',icon:LayoutDashboard,roles:'ADMIN,DOCTOR,NURSE,PATIENT'},
  {name:'Register Patient',url:'/app/register',icon:UserRoundPlus,roles:'NURSE'},
  {name:'Patient Directory',url:'/app/patients',icon:UsersRound,roles:'DOCTOR,NURSE'},
  {name:'Priority Queue',url:'/app/queue',icon:ListOrdered,roles:'DOCTOR,NURSE'},
  {name:'Re-Triage Watch',url:'/app/monitoring',icon:HeartPulse,roles:'NURSE'},
  {name:'Operations Analytics',url:'/app/analytics',icon:ChartNoAxesCombined,roles:'ADMIN'},
];
const can=(role:string|undefined,...roles:string[])=>roles.includes(role||'');
function Roles({roles,children}:{roles:string[];children:ReactNode}){const {user}=useApp();return can(user?.role,...roles)?<>{children}</>:<Navigate to="/app" replace/>;}
function RoleHome(){const {user}=useApp();switch(user?.role){case 'NURSE':return <NurseDashboard/>;case 'DOCTOR':return <Doctor/>;case 'ADMIN':return <AdminDashboard/>;default:return <PatientDashboard/>;}}

function Shell(){
  const {user,setUser,refresh,bump}=useApp(); const [open,setOpen]=useState(false);const [queueCount,setQueueCount]=useState(0);
  const loc=useLocation();const go=useNavigate();
  useEffect(()=>setOpen(false),[loc.pathname]);
  useEffect(()=>{if(!user || !can(user.role,'ADMIN','DOCTOR','NURSE'))return;api.get('/dashboard').then(x=>setQueueCount(x.data.critical||0)).catch(()=>{});},[refresh,user]);
  async function logout(){try{await csrf();await api.post('/auth/logout');}catch{}setUser(null);go('/login');}
  const active=nav.find(n=>n.url===loc.pathname);
  return <div className="app-shell">
    <aside className={`sidebar ${open?'mobile-open':''}`}>
      <div className="brand"><div className="brand-icon"><Activity size={24} strokeWidth={2.7}/></div><div><b>TRIAGE<span>-X</span></b><small>INTELLIGENT CARE PLATFORM</small></div></div>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav>{nav.filter(n=>n.roles.split(',').includes(user?.role||'')).map(n=><NavLink key={n.url} to={n.url} end={n.url==='/app'} className={({isActive})=>`nav-item ${isActive?'active':''}`}><n.icon size={19} strokeWidth={1.9}/><span>{n.name}</span>{n.name==='Re-Triage Watch'&&<span className="nav-pulse"/>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-support"><div className="support-dot"/> <span>System connected</span><small>LOCAL ENVIRONMENT</small></div><button className="profile-card" onClick={logout}><span className="avatar">{user?.name?.charAt(0)}</span><span><b>{user?.name}</b><small>{user?.role}</small></span><LogOut size={18}/></button></div>
    </aside>
    {open&&<button className="mobile-overlay" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
    <div className="main-shell">
      <header className="topbar"><div className="topbar-left"><button onClick={()=>setOpen(!open)} className="mobile-menu" aria-label="Open navigation">{open?<X size={20}/>:<Menu size={20}/>}</button><div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>{active?.name||'Overview'}</strong></div></div><div className="topbar-right"><span className="live-pill"><span/> LIVE SYSTEM</span>{queueCount>0&&<span className="critical-indicator"><HeartPulse size={15}/> {queueCount} critical</span>}{user?.role==='NURSE'&&<button className="icon-button" onClick={()=>go('/app/monitoring')} aria-label="Monitoring notifications"><Bell size={19}/></button>}<div className="top-avatar">{user?.name?.charAt(0)}</div></div></header>
      <main className="page-content"><AnimatePresence mode="wait"><motion.div key={loc.pathname} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.25}}>
        <Routes>
          <Route index element={<RoleHome/>}/>
          <Route path="patients" element={<Roles roles={['NURSE','DOCTOR']}><Patients/></Roles>}/>
          <Route path="register" element={<Roles roles={['NURSE']}><Register/></Roles>}/>
          <Route path="triage" element={<Roles roles={['NURSE']}><Triage/></Roles>}/>
          <Route path="queue" element={<Roles roles={['NURSE','DOCTOR']}><SmartQueue/></Roles>}/>
          <Route path="monitoring" element={<Roles roles={['NURSE']}><Monitoring/></Roles>}/>
          <Route path="doctor" element={<Roles roles={['DOCTOR']}><Doctor/></Roles>}/>
          <Route path="analytics" element={<Roles roles={['ADMIN']}><Analytics/></Roles>}/>
          <Route path="*" element={<Navigate to="/app" replace/>}/>
        </Routes></motion.div></AnimatePresence></main>
    </div>
  </div>;
}
export default function App(){
  const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false); const [refresh,setRefresh]=useState(0);
  useEffect(()=>{csrf().then(()=>api.get('/auth/me')).then(r=>setUser(r.data)).catch(()=>{}).finally(()=>setReady(true));},[]);
  useEffect(()=>{if(!user)return;const client=new Client({brokerURL:`${window.location.protocol==='https:'?'wss':'ws'}://${window.location.host}/ws`,reconnectDelay:5000,onConnect:()=>client.subscribe('/topic/changes',()=>setRefresh(n=>n+1))});client.activate();const poll=setInterval(()=>setRefresh(n=>n+1),15000);return()=>{clearInterval(poll);void client.deactivate();};},[user]);
  if(!ready)return <div className="splash"><div className="brand-icon big"><Activity/></div><h2>TRIAGE-X</h2><p>Initializing intelligent care workspace…</p><div className="splash-bar"/></div>;
  return <Ctx.Provider value={{user,setUser,refresh,bump:()=>setRefresh(n=>n+1)}}><BrowserRouter><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={user?<Navigate to="/app"/>:<SignIn/>}/>
    <Route path="/signup" element={user?<Navigate to="/app"/>:<SignUp/>}/>
    <Route path="/app/*" element={user?<Shell/>:<Navigate to="/login"/>}/>
    <Route path="*" element={<Navigate to="/"/>}/>
  </Routes></BrowserRouter></Ctx.Provider>;
}
