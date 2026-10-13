import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {motion} from 'motion/react';
import {Activity,ArrowRight,ClipboardCheck,Clock3,HeartPulse,ShieldCheck,Stethoscope,UserRoundPlus,UsersRound,Radio,Info,Timer,BarChart3} from 'lucide-react';
import {useApp} from '../App';
import {api,errorMessage,dateText,Patient} from '../lib/api';
import {Header,Badge,Empty,Stat,Alert,Loading} from '../components/UI';

// The nurse is the only role that creates patient intake and verifies triage.
export function NurseDashboard(){
 const {refresh,user}=useApp();
 const [patients,setPatients]=useState<Patient[]>([]);const [queue,setQueue]=useState<any[]>([]);
 const [metrics,setMetrics]=useState<any>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useEffect(()=>{let valid=true;setError('');Promise.all([api.get('/patients'),api.get('/queue'),api.get('/dashboard')]).then(([p,q,d])=>{
  if(!valid)return;setPatients(p.data);setQueue(q.data);setMetrics(d.data);
 }).catch(e=>{if(valid)setError(errorMessage(e))}).finally(()=>{if(valid)setLoading(false)});return()=>{valid=false};},[refresh]);
 const awaiting=patients.filter(p=>p.status==='AWAITING_ASSESSMENT');
 const waiting=queue.filter(p=>p.status==='WAITING');
 return <>
  <Header eyebrow="NURSING STATION · LIVE" title={`Nurse dashboard${user?.name?', '+user.name.split(' ')[0]:''}`} sub="Register patients, record clinical observations, confirm priority, and monitor the live care queue." action={<Link to="/app/register" className="button button-primary"><UserRoundPlus size={17}/> Register patient</Link>}/>
  <div className="role-intro role-intro-nurse"><div><div className="role-kicker"><Radio size={15}/> NURSE-LED INTAKE</div><h2>One entry point.<br/><em>One connected care team.</em></h2><p>Only nurses create patient records and confirm triage recommendations. Doctors receive a read-only view of intake as soon as it is saved.</p><div className="role-actions"><Link className="button button-primary" to="/app/register">New patient <ArrowRight size={16}/></Link></div></div><div className="role-decor"><HeartPulse size={100} strokeWidth={.8}/></div></div>
  <Alert message={error} onClose={()=>setError('')}/>
  <div className="stats-grid"><Stat icon={UsersRound} label="Registered patients" value={metrics?.patients??'—'} sub="All entries"/><Stat icon={ClipboardCheck} label="Awaiting assessment" value={awaiting.length} sub="Next nursing actions" tone="orange"/><Stat icon={Clock3} label="Waiting for doctor" value={waiting.length} tone="blue"/><Stat icon={HeartPulse} label="Critical in queue" value={metrics?.critical??'—'} tone="red"/></div>
  <div className="role-grid">
    <section className="card table-card"><div className="card-title"><div><div className="eyebrow">STEP 01 · NURSE INTAKE</div><h3>New registrations awaiting triage</h3></div><span className="soft-tag">{awaiting.length} to assess</span></div>
      {loading?<Loading/>:awaiting.length?<div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>COMPLAINT</th><th>REGISTERED</th><th>ACTION</th></tr></thead><tbody>{awaiting.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.patient_code}</small></td><td>{p.complaint}</td><td>{dateText(p.created_at)}</td><td><Link to={`/app/triage?patient=${p.id}`} className="button button-soft button-sm">Finish saved review <ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div>:<Empty title="No patients awaiting triage" sub="Patients registered by a nurse will appear here immediately."/>}
    </section>
    <section className="card role-guide"><div className="eyebrow">YOUR RESPONSIBILITIES</div><h3>Patient intake to priority</h3><div className="guide-step"><span>01</span><div><b>Register</b><p>Enter patient details and reported symptoms.</p></div></div><div className="guide-step"><span>02</span><div><b>Assess</b><p>Record available observations and vital signs.</p></div></div><div className="guide-step"><span>03</span><div><b>Confirm</b><p>Review the demo recommendation, confirm priority, and make it available in both staff queues.</p></div></div><Link to="/app/patients" className="text-link">Open patient directory <ArrowRight size={16}/></Link></section>
  </div>
  <section className="card table-card top-gap"><div className="card-title"><div><div className="eyebrow">STEP 02 · SHARED PRIORITY LIST</div><h3>Clinician-confirmed queue</h3></div><Link to="/app/queue" className="text-link">Full queue <ArrowRight size={16}/></Link></div>
  {waiting.length?<div className="table-wrap"><table><thead><tr><th>POSITION</th><th>PATIENT</th><th>PRIORITY</th><th>WAITING</th><th>STATUS</th></tr></thead><tbody>{waiting.map((p,i)=><tr key={p.id} className={`priority-row priority-row-${String(p.priority||"pending").toLowerCase()}`}><td><span className="queue-position">{String(i+1).padStart(2,'0')}</span></td><td><b>{p.name}</b><small>{p.patient_code}</small></td><td><Badge value={p.priority}/></td><td>{Math.max(0,Number(p.waiting_minutes)||0)} min</td><td><Badge value={p.status}/></td></tr>)}</tbody></table></div>:<Empty title="No confirmed priorities yet" sub="Once you confirm an assessment, the patient appears here and on the doctor's dashboard."/>}
  </section><div className="safety-strip"><ShieldCheck size={18}/> Clinical categories require nurse confirmation; waiting duration alone never changes priority.</div>
 </>;
}

export function PatientDashboard(){
 const {refresh}=useApp();const [data,setData]=useState<any>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let valid=true;api.get('/patient-portal/summary').then(r=>{if(valid){setData(r.data);setError('')}}).catch(e=>{if(valid)setError(errorMessage(e))}).finally(()=>{if(valid)setLoading(false)});return()=>{valid=false};},[refresh]);
 const wait=data?.approximateWaitMinutes;
 return <><Header eyebrow="PATIENT VIEW · READ ONLY" title="Hospital waiting overview" sub="A simple view of the current waiting-room load and approximate wait. No other patients' personal information is displayed."/>
   <div className="patient-hero"><div className="patient-hero-glow"/><div className="patient-pulse"><HeartPulse size={64} strokeWidth={1.25}/><div className="patient-pulse-ring"/></div><div className="patient-hero-copy"><div className="role-kicker"><span className="online-dot"/> LIVE HOSPITAL STATUS</div><h2>Know the queue.<br/><em>Feel more prepared.</em></h2><p>Current hospital-wide estimates update automatically as staff manage the queue.</p></div></div>
   <Alert message={error}/>{loading?<Loading/>:<>
    <div className="patient-metrics"><motion.div className="patient-metric" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.5}}><span className="patient-metric-icon"><UsersRound size={25}/></span><div className="eyebrow">TOTAL PATIENTS WAITING</div><strong>{data?.patientsWaiting??0}</strong><p>Including patients awaiting initial assessment</p></motion.div>
      <motion.div className="patient-metric accent" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:.12,duration:.5}}><span className="patient-metric-icon"><Clock3 size={25}/></span><div className="eyebrow">APPROXIMATE WAIT</div><strong>{wait==null?'—':`~${wait}`}<small>{wait==null?'':' min'}</small></strong><p>Estimated queue delay for a new arrival; not a personal appointment time</p></motion.div></div>
    <div className="card patient-explain"><Info size={21}/><div><h3>How is this estimate calculated?</h3><p>{data?.estimateNote}</p><p>Urgent cases may be seen sooner and wait times can change. Ask hospital staff for personal care or timing information.</p></div></div>
   </>}
  </>;
}

export function AdminDashboard(){
 const {refresh}=useApp();
 const [stats,setStats]=useState<any>(null);const [ops,setOps]=useState<any>(null);const [error,setError]=useState('');
 useEffect(()=>{let live=true;Promise.all([api.get('/dashboard'),api.get('/admin-operations')]).then(([s,o])=>{if(live){setStats(s.data);setOps(o.data);setError('')}}).catch(e=>{if(live)setError(errorMessage(e))});return()=>{live=false}},[refresh]);
 const events=ops?.recentActivity||[];
 const friendly=(action:string)=>({REGISTER_PATIENT:'New patient registered',CREATE_ASSESSMENT:'Assessment recorded',CONFIRM_PRIORITY:'Priority confirmed',START_CONSULTATION:'Consultation started',FINISH_CONSULTATION:'Consultation completed',SELF_REGISTER:'New user account created'} as Record<string,string>)[action]||action.replaceAll('_',' ').toLowerCase();
 return <>
 <Header eyebrow="ADMIN · READ-ONLY OPERATIONS" title="Hospital overview" sub="Watch patient flow, staffing and activity in real time. Account approval and clinical editing are not part of the admin role." action={<Link to="/app/analytics" className="button button-primary"><BarChart3 size={17}/> View analytics <ArrowRight size={17}/></Link>}/>
 <div className="role-intro role-intro-admin"><div><div className="role-kicker"><span className="online-dot"/> OPERATIONS · LIVE</div><h2>Clear visibility.<br/><em>Better coordination.</em></h2><p>See what is happening across nurse intake, priority-based queues and doctor consultations. Admin access is intentionally read-only.</p></div><div className="role-decor"><ShieldCheck size={100} strokeWidth={.8}/></div></div>
 <Alert message={error}/>
 <div className="stats-grid"><Stat icon={UsersRound} label="Registered patients" value={stats?.patients??'—'}/><Stat icon={Timer} label="Patients waiting" value={(Number(stats?.waiting)||0)+(Number(ops?.awaitingAssessment)||0)} tone="blue"/><Stat icon={HeartPulse} label="Critical priority" value={stats?.critical??'—'} tone="red"/><Stat icon={Stethoscope} label="In consultation" value={stats?.inConsultation??'—'} tone="violet"/></div>
 <div className="stats-grid top-gap"><Stat icon={ClipboardCheck} label="Awaiting assessment" value={ops?.awaitingAssessment??'—'} tone="orange"/><Stat icon={Stethoscope} label="Doctor accounts" value={ops?.doctors??'—'}/><Stat icon={HeartPulse} label="Nurse accounts" value={ops?.nurses??'—'} tone="blue"/><Stat icon={UsersRound} label="Patient accounts" value={ops?.patientAccounts??'—'} tone="violet"/></div>
 <div className="role-grid top-gap"><section className="card table-card"><div className="card-title"><div><div className="eyebrow">RECENT SYSTEM ACTIVITY</div><h3>Hospital activity feed</h3></div><span className="soft-tag">Read only</span></div>
 {events.length?<div className="admin-requests">{events.map((event:any,i:number)=><div className="admin-request" key={i}><div className="admin-avatar"><Activity size={18}/></div><div><b>{friendly(event.action)}</b><small>{event.actor_role||'SYSTEM'} · {dateText(event.created_at)}</small></div></div>)}</div>:<Empty title="No hospital activity yet" sub="Registration, assessment and consultation events will appear here."/>}</section>
 <section className="card role-guide"><div className="eyebrow">HOW TRIAGE-X WORKS</div><h3>Four clear roles</h3><div className="guide-step"><span>01</span><div><b>Nurse</b><p>Only nurses register patients, record intake and confirm triage priority.</p></div></div><div className="guide-step"><span>02</span><div><b>Doctor</b><p>Doctors view saved intake and priority lists, and manage consultations.</p></div></div><div className="guide-step"><span>03</span><div><b>Patient</b><p>Patients see only waiting count and approximate waiting time.</p></div></div><div className="guide-step"><span>04</span><div><b>Admin</b><p>Administrators observe aggregate statistics and operational activity.</p></div></div></section></div>
 <div className="safety-strip"><ShieldCheck size={18}/> No approval required for new user accounts. Admins cannot modify patient records or clinical decisions.</div>
 </>;
}
