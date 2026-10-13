import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Inbox, LoaderCircle } from 'lucide-react';
export function Header({eyebrow,title,sub,action}:{eyebrow?:string;title:string;sub?:string;action?:ReactNode}){return <div className="section-head"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{action&&<div className="head-actions">{action}</div>}</div>}
export function Badge({value}:{value?:string|null}){const v=value||'PENDING';return <span className={`badge badge-${v.toLowerCase().replaceAll('_','-')}`}><span className="badge-dot"/>{v.replaceAll('_',' ')}</span>}
export function Empty({title='Nothing here yet',sub='Data will appear as you create records.'}:{title?:string;sub?:string}){return <div className="empty"><div className="empty-icon"><Inbox size={25}/></div><h3>{title}</h3><p>{sub}</p></div>}
export function Loading(){return <div className="loading"><LoaderCircle size={24} className="spin"/><span>Loading data…</span></div>}
export function Stat({icon:Icon,label,value,sub,tone='cyan',delay=0}:{icon:any;label:string;value:string|number;sub?:string;tone?:string;delay?:number}){return <motion.div className={`stat-card accent-${tone}`} initial={{opacity:0,y:22}} animate={{opacity:1,y:0}} transition={{delay,duration:.5}}><div className="stat-top"><span className="stat-icon"><Icon size={21}/></span><ArrowUpRight size={16} className="stat-corner"/></div><strong>{value}</strong><span className="stat-label">{label}</span>{sub&&<small>{sub}</small>}</motion.div>}
export function Alert({message,onClose}:{message:string;onClose?:()=>void}){return message?<div className="alert-inline" role="alert"><span>{message}</span>{onClose&&<button onClick={onClose}>Dismiss</button>}</div>:null}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
