import { useEffect,useState } from 'react';
import { Link,useNavigate,useSearchParams } from 'react-router-dom';
import { api,errorMessage,dateText,Patient } from '../lib/api';
import {useApp} from '../App';
import {Header,Badge,Empty,Field,Alert,Loading} from '../components/UI';
import { Search,ArrowRight,UserRoundPlus,ChevronLeft,ShieldCheck } from 'lucide-react';
export function Patients(){const {refresh,user}=useApp();const [items,setItems]=useState<Patient[]>([]);const [selected,setSelected]=useState<Patient|null>(null);const [query,setQuery]=useState('');const [busy,setBusy]=useState(true);const [error,setError]=useState('');useEffect(()=>{setBusy(true);api.get('/patients',{params:{q:query}}).then(r=>setItems(r.data)).catch(e=>setError(errorMessage(e))).finally(()=>setBusy(false));},[refresh,query]);async function open(id:number){try{const r=await api.get(`/patients/${id}`);setSelected(r.data)}catch(e){setError(errorMessage(e));}}
 return <><Header eyebrow="PATIENT MANAGEMENT" title="Patient directory" sub="A unified view of registered patients and their care journey." action={user?.role==='NURSE'?<Link className="button button-primary" to="/app/register"><UserRoundPlus size={17}/> New patient</Link>:<span className="soft-tag"><ShieldCheck size={14}/> Read-only intake</span>}/><div className="card"><div className="card-title"><h3>{items.length} patients</h3><div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search patient name or ID…"/></div></div>{error&&<Alert message={error} onClose={()=>setError('')}/>} {busy?<Loading/>:items.length?<div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>AGE</th><th>COMPLAINT</th><th>STATUS</th><th>PRIORITY</th><th>REGISTERED</th><th/></tr></thead><tbody>{items.map(p=><tr key={p.id} className={`priority-row priority-row-${String(p.priority||"pending").toLowerCase()}`}><td><b>{p.name}</b><small>{p.patient_code}</small></td><td>{p.age}</td><td className="truncate">{p.complaint}</td><td><Badge value={p.status}/></td><td>{p.priority?<Badge value={p.priority}/>:<span className="muted">Not assessed</span>}</td><td>{dateText(p.created_at)}</td><td><button className="row-action" onClick={()=>open(p.id)}><ArrowRight size={17}/></button></td></tr>)}</tbody></table></div>:<Empty title="No patients registered yet" sub="The directory starts empty. Register your first patient to begin."/>}</div>{selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="modal patient-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><div className="eyebrow">PATIENT PROFILE · {selected.patient_code}</div><h2>{selected.name}</h2><div className="patient-details"><p><b>Age:</b> {selected.age}</p><p><b>Sex:</b> {selected.sex||'Not recorded'}</p><p><b>Chief complaint:</b> {selected.complaint}</p><p><b>Symptoms:</b> {selected.symptoms||'Not recorded'}</p></div><h3>Assessment history</h3>{selected.assessments?.length?selected.assessments.map((a:any)=><div key={a.id} className="history-item"><Badge value={a.confirmed||a.recommended}/><span>Recommended {a.recommended} · {a.confirmed?'Confirmed by '+a.reviewer_name:'Awaiting review'}</span><small>{dateText(a.created_at)}</small></div>):<p className="muted">No assessments recorded.</p>}</div></div>}</>}
const symptomOptions = [
  {icon:'🫀',name:'Chest Pain'}, {icon:'🫁',name:'Breathing Difficulty'}, {icon:'🌡️',name:'Fever'},
  {icon:'🤕',name:'Severe Headache'}, {icon:'💫',name:'Dizziness'}, {icon:'⭕',name:'Abdominal Pain'},
  {icon:'🤢',name:'Vomiting'}, {icon:'🩸',name:'Bleeding'}, {icon:'⚡',name:'Seizure'},
  {icon:'😵',name:'Unconsciousness'}, {icon:'🚶',name:'Weakness'}, {icon:'😷',name:'Cough'}, {icon:'➕',name:'Other'},
];
const historyOptions = ['Diabetes','Hypertension','Cardiac History','Asthma','Previous Hospitalization','Previous Surgery','On Medication','Allergies','Other','None Known'];
type Severity = 'Mild' | 'Moderate' | 'Severe';
type IntakeVitals = 'temperature'|'heartRate'|'systolic'|'diastolic'|'spo2'|'respiratoryRate'|'pain';
const stages = ['Patient Info','Symptoms','Vitals','History','Review'];

export function Register(){
 const navigate=useNavigate();const {bump}=useApp();
 const [step,setStep]=useState(0);const [maxStep,setMaxStep]=useState(0);
 const [details,setDetails]=useState({name:'',age:'',sex:'',phone:'',emergencyContact:'',complaint:''});
 const [selectedSymptoms,setSelectedSymptoms]=useState<Record<string,Severity>>({});
 const [symptomNotes,setSymptomNotes]=useState('');
 const [vitals,setVitals]=useState<Record<IntakeVitals,string>>({temperature:'',heartRate:'',systolic:'',diastolic:'',spo2:'',respiratoryRate:'',pain:''});
 const [tempUnit,setTempUnit]=useState<'C'|'F'>('C');
 const [historyFlags,setHistoryFlags]=useState<string[]>([]);
 const [historyNotes,setHistoryNotes]=useState('');const [allergies,setAllergies]=useState('');
 const [assessment,setAssessment]=useState<any>(null);const [createdId,setCreatedId]=useState<number|null>(null);
 const [priority,setPriority]=useState('');const [overrideReason,setOverrideReason]=useState('');
 const [aiExplanation, setAiExplanation] = useState('');
 const [aiLoading, setAiLoading] = useState(false);
 const [aiSource, setAiSource] = useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const updateVitals=(key:IntakeVitals,value:string)=>setVitals(current=>({...current,[key]:value}));
 function toggleSymptom(name:string){setSelectedSymptoms(prev=>{const next={...prev};if(next[name])delete next[name];else next[name]='Moderate';return next})}
 function toggleHistory(name:string){setHistoryFlags(prev=>name==='None Known'?prev.includes(name)?[]:[name]:prev.includes(name)?prev.filter(v=>v!==name):[...prev.filter(v=>v!=='None Known'),name]);}
 function validateStage(index:number):string {
  if(index===0){if(!details.name.trim()||!details.complaint.trim()||details.age==='')return 'Full name, age and main complaint are required.';if(!Number.isInteger(Number(details.age))||Number(details.age)<0||Number(details.age)>125)return 'Enter a valid age from 0 to 125.';}
  if(index===1&&!Object.keys(selectedSymptoms).length&&!symptomNotes.trim())return 'Choose at least one symptom or describe the symptoms in the notes.';
  if(index===2){const ranges:Record<IntakeVitals,[number,number]>={temperature:tempUnit==='C'?[25,45]:[77,113],heartRate:[0,260],systolic:[0,350],diastolic:[0,250],spo2:[0,100],respiratoryRate:[0,100],pain:[0,10]};for(const [key,value] of Object.entries(vitals)){if(value.trim()!==''){const n=Number(value),[min,max]=ranges[key as IntakeVitals];if(!Number.isFinite(n)||n<min||n>max)return `Check ${key}: expected ${min}–${max}.`;}}}
  return '';
 }
 function next(){const warning=validateStage(step);if(warning){setError(warning);return;}setError('');const n=Math.min(4,step+1);setStep(n);setMaxStep(Math.max(maxStep,n));}
 function previous(){setError('');setStep(s=>Math.max(0,s-1));}
 const temperatureC=vitals.temperature===''?null:tempUnit==='C'?Number(vitals.temperature):Math.round(((Number(vitals.temperature)-32)*5/9)*10)/10;
 function numeric(key:IntakeVitals){return vitals[key].trim()===''?null:Number(vitals[key]);}
 const symptomString=[...Object.entries(selectedSymptoms).map(([name,severity])=>`${name} (${severity})`),symptomNotes.trim()].filter(Boolean).join('; ');
 const medicalHistory=[...historyFlags.filter(x=>x!=='Allergies'),historyNotes.trim()].filter(Boolean).join('; ');
 async function saveAndAssess(){
  if(busy)return;for(const i of [0,1,2]){const warning=validateStage(i);if(warning){setStep(i);setError(warning);return;}}setBusy(true);setError('');
  try{
   let id=createdId;
   if(id===null){const r=await api.post('/patients',{...details,age:Number(details.age),symptoms:symptomString,medicalHistory,allergies,historyFlags,symptomSeverities:selectedSymptoms});id=r.data.id;setCreatedId(id);bump();}
   const result=await api.post('/triage/assess',{patientId:id,temperature:temperatureC,heartRate:numeric('heartRate'),systolic:numeric('systolic'),diastolic:numeric('diastolic'),spo2:numeric('spo2'),respiratoryRate:numeric('respiratoryRate'),pain:numeric('pain'),notes:`Nurse intake. ${symptomNotes} ${historyNotes}`.trim()});
   setAssessment(result.data);setPriority(result.data.recommended);bump();
   // Automatically generate explanation after priority assignment

setAiLoading(true);
setAiExplanation('');
setAiSource('');

void api.post(`/triage/${result.data.id}/explain`)

    .then((response) => {

        setAiExplanation(response.data.explanation);
        setAiSource(response.data.source);

    })

    .catch(() => {

        setAiExplanation(
            'AI explanation is unavailable. ' +
            'Please review the priority rule flags above.'
        );

        setAiSource('RULES');

    })

    .finally(() => {

        setAiLoading(false);

    });
  }catch(e){setError(errorMessage(e));}finally{setBusy(false)}
 }
 async function confirm(){
  if(!assessment||busy)return;setBusy(true);setError('');
  try{await api.post(`/triage/${assessment.id}/confirm`,{priority,reason:overrideReason});bump();navigate('/app/queue');}
  catch(e){setError(errorMessage(e));}finally{setBusy(false)}
 }
 return <>
 <Header eyebrow="NURSE STATION · GUIDED INTAKE" title="Patient check-in" sub="Five clear steps to capture a nurse-entered patient intake, followed by professional priority confirmation." action={<Link className="button button-soft" to="/app/patients"><ChevronLeft size={17}/> Patient directory</Link>}/>
 <div className="intake-progress">{stages.map((name,i)=><button key={name} type="button" disabled={!!assessment||i>maxStep} onClick={()=>{setStep(i);setError('')}} className={`intake-progress-step ${i===step?'current':''} ${i<step?'complete':''}`}><span>{i<step?'✓':i+1}.</span> {name}</button>)}</div>
 <Alert message={error} onClose={()=>setError('')}/>
 {createdId!==null&&!assessment&&<div className="success-message"><ShieldCheck size={17}/> Patient record saved. If the assessment did not complete, choose <strong>Retry assessment</strong> below to continue here without registering a duplicate patient.</div>}
 {assessment? <div className="card intake-panel"><div className="intake-panel-heading"><div className="eyebrow">NURSE REVIEW · FINAL STEP</div><h2>Confirm patient priority</h2><p>Patient details are saved and visible to doctors. This is a provisional, rule-based demonstration recommendation — review the flags and confirm the priority before adding the patient to the queue.</p></div>
  <div className={`priority-hero priority-hero-${String(assessment.recommended).toLowerCase()}`} role="status" aria-live="polite">
   <div className="priority-hero-symbol" aria-hidden="true"><ShieldCheck size={31} strokeWidth={2.4}/></div>
   <div className="priority-hero-copy"><span className="priority-hero-overline">PROVISIONAL PRIORITY · REQUIRES NURSE CONFIRMATION</span><strong>{String(assessment.recommended).replaceAll('_',' ')}</strong><span className="priority-hero-caption">{assessment.recommended==='CRITICAL'?'Highest queue priority after professional review':assessment.recommended==='URGENT'?'Prioritized review after nurse confirmation':'Standard queue priority; continue observation'}</span></div>
   <Badge value={assessment.recommended}/>
  </div>
  <div className="flags-list">{assessment.flags?assessment.flags.split(' | ').map((x:string,i:number)=><div key={i}>{x}</div>):<p className="muted">No demonstration flags triggered. Professional review is still required.</p>}</div>
  <div className="priority-review-guide">

    <ShieldCheck size={18} />

    <div>

        <strong>
            {aiLoading
                ? '🤖 Generating AI Explanation...'
                : aiSource === 'AI'
                    ? '🤖 AI-Generated Priority Explanation'
                    : 'Priority Explanation'}
        </strong>

        <span>
            {aiLoading
                ? 'Please wait while the LLM explains the assigned priority.'
                : aiExplanation}
        </span>

    </div>

</div>
  <div className="priority-review-guide"><ShieldCheck size={18}/><div><strong>Nurse confirmation required</strong><span>Screening flags are for demonstration only. Review recorded symptoms and vital signs before confirming the final queue category.</span></div></div>
  <div className="form-grid"><Field label="Nurse-confirmed priority"><select className={`priority-select priority-select-${priority.toLowerCase()}`} value={priority} onChange={e=>setPriority(e.target.value)}><option value="CRITICAL">Critical</option><option value="URGENT">Urgent</option><option value="NORMAL">Normal</option></select></Field>{priority!==assessment.recommended&&<Field label="Override reason (required, at least 8 characters)"><textarea value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} rows={2} minLength={8}/></Field>}</div>
  <div className="intake-footer"><button className="button button-primary" disabled={busy||!priority||(priority!==assessment.recommended&&overrideReason.trim().length<8)} onClick={confirm}>{busy?'Saving…':'Confirm & add to priority queue'} <ArrowRight size={17}/></button></div>
 </div> : <div className="card intake-panel">
 {step===0&&<><div className="intake-panel-heading"><div className="eyebrow">01 · PATIENT INFORMATION</div><h2>Patient information</h2><p>Only nurses can enter patient intake data. Doctors can view it once saved.</p></div><div className="form-grid">
  <Field label="Full name *"><input maxLength={160} value={details.name} onChange={e=>setDetails({...details,name:e.target.value})} placeholder="Patient full name" autoComplete="off"/></Field>
  <Field label="Age *"><input type="number" min="0" max="125" value={details.age} onChange={e=>setDetails({...details,age:e.target.value})} placeholder="Age in years"/></Field>
  <Field label="Sex"><select value={details.sex} onChange={e=>setDetails({...details,sex:e.target.value})}><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></Field>
  <Field label="Phone"><input value={details.phone} maxLength={40} onChange={e=>setDetails({...details,phone:e.target.value})} placeholder="Optional phone number"/></Field>
  <Field label="Emergency contact"><input value={details.emergencyContact} maxLength={80} onChange={e=>setDetails({...details,emergencyContact:e.target.value})} placeholder="Optional emergency contact"/></Field>
  <Field label="Main complaint *"><input value={details.complaint} onChange={e=>setDetails({...details,complaint:e.target.value})} placeholder="Reason for visit"/></Field>
 </div></>}
 {step===1&&<><div className="intake-panel-heading"><div className="eyebrow">02 · REPORTED SYMPTOMS</div><h2>Symptoms</h2><p>Select reported symptoms and choose severity for each. These are patient-reported observations, not diagnoses.</p></div>
 <div className="intake-symptom-grid">{symptomOptions.map(item=><div className={`intake-symptom ${selectedSymptoms[item.name]?'selected':''}`} key={item.name}>
  <button type="button" className="intake-symptom-toggle" onClick={()=>toggleSymptom(item.name)} aria-pressed={!!selectedSymptoms[item.name]}><span className="intake-emoji">{item.icon}</span><span className="intake-check">{selectedSymptoms[item.name]?'✓':''}</span><strong>{item.name}</strong></button>
  {selectedSymptoms[item.name]&&<select aria-label={`${item.name} severity`} className="intake-severity" value={selectedSymptoms[item.name]} onChange={e=>setSelectedSymptoms(prev=>({...prev,[item.name]:e.target.value as Severity}))}><option>Mild</option><option>Moderate</option><option>Severe</option></select>}
 </div>)}</div><Field label="Additional symptom description (optional)"><textarea value={symptomNotes} onChange={e=>setSymptomNotes(e.target.value)} rows={3} placeholder="Patient or family remarks…"/></Field></>}
 {step===2&&<><div className="intake-panel-heading"><div className="eyebrow">03 · VITAL SIGNS</div><h2>Vitals</h2><p>Enter measured readings. Leave a field blank if it was not measured; blank does not mean normal.</p></div>
 <div className="intake-vital-grid"><div className="intake-vital"><label htmlFor="temp">Temperature</label><div className="intake-vital-inline"><input id="temp" type="number" inputMode="decimal" min={tempUnit==='C'?25:77} max={tempUnit==='C'?45:113} step="0.1" placeholder={tempUnit==='C'?'37.0':'98.6'} value={vitals.temperature} onChange={e=>updateVitals('temperature',e.target.value)}/><select aria-label="Temperature unit" value={tempUnit} onChange={e=>{const newUnit=e.target.value as 'C'|'F';setVitals(v=>({...v,temperature:v.temperature===''?'':String(Math.round((newUnit==='F'?(Number(v.temperature)*9/5+32):(Number(v.temperature)-32)*5/9)*10)/10)}));setTempUnit(newUnit)}}><option value="C">°C</option><option value="F">°F</option></select></div></div>
 {([{key:'heartRate',label:'Heart rate',unit:'bpm',placeholder:'80'},{key:'systolic',label:'Systolic BP',unit:'mmHg',placeholder:'120'},{key:'diastolic',label:'Diastolic BP',unit:'mmHg',placeholder:'80'},{key:'spo2',label:'SpO₂',unit:'%',placeholder:'98'},{key:'respiratoryRate',label:'Respiratory rate',unit:'br/min',placeholder:'16'},{key:'pain',label:'Pain score',unit:'/ 10',placeholder:'3'}] as {key:IntakeVitals,label:string,unit:string,placeholder:string}[]).map(v=><div className="intake-vital" key={v.key}><label htmlFor={v.key}>{v.label}</label><div className="intake-vital-inline"><input id={v.key} type="number" min="0" step={v.key==='spo2'?'0.1':'1'} value={vitals[v.key]} onChange={e=>updateVitals(v.key,e.target.value)} placeholder={v.placeholder}/><span>{v.unit}</span></div></div>)}
 </div><div className="intake-info-note"><ShieldCheck size={17}/> Vitals are captured for clinical review. TRIAGE-X does not make diagnoses.</div></>}
 {step===3&&<><div className="intake-panel-heading"><div className="eyebrow">04 · MEDICAL HISTORY</div><h2>Medical history</h2><p>Record only what the patient or available records confirm. Multiple conditions can be selected.</p></div><div className="intake-history-grid">{historyOptions.map(name=><button type="button" key={name} className={`intake-history-option ${historyFlags.includes(name)?'selected':''}`} aria-pressed={historyFlags.includes(name)} onClick={()=>toggleHistory(name)}><span className="intake-check">{historyFlags.includes(name)?'✓':''}</span>{name}</button>)}</div><div className="form-grid top-gap"><div className="span-2"><Field label="Known allergies (if any)"><input value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Describe reported allergies, or leave blank"/></Field></div><div className="span-2"><Field label="Additional medical history (optional)"><textarea rows={3} value={historyNotes} onChange={e=>setHistoryNotes(e.target.value)} placeholder="Relevant medications, prior care, other notes…"/></Field></div></div></>}
 {step===4&&<><div className="intake-panel-heading"><div className="eyebrow">05 · REVIEW</div><h2>Review patient check-in</h2><p>Verify what was recorded before saving the intake and generating a provisional recommendation.</p></div>
 <div className="intake-review-grid"><section><div className="eyebrow">PATIENT</div><h3>{details.name}</h3><p>{details.age} years · {details.sex||'Not specified'}</p><p>{details.complaint}</p><p>{details.phone||'No phone'} · {details.emergencyContact||'No emergency contact'}</p></section><section><div className="eyebrow">SYMPTOMS</div>{Object.entries(selectedSymptoms).length?Object.entries(selectedSymptoms).map(([name,severity])=><span key={name} className="intake-review-chip">{name} · {severity}</span>):<p>None selected</p>}<p>{symptomNotes}</p></section><section><div className="eyebrow">VITAL SIGNS</div><div className="intake-review-vitals">{[{label:'Temperature',value:vitals.temperature===''?'—':`${vitals.temperature} °${tempUnit}`},{label:'Heart rate',value:vitals.heartRate?`${vitals.heartRate} bpm`:'—'},{label:'Blood pressure',value:`${vitals.systolic||'—'}/${vitals.diastolic||'—'} mmHg`},{label:'SpO₂',value:vitals.spo2?`${vitals.spo2} %`:'—'},{label:'Resp. rate',value:vitals.respiratoryRate?`${vitals.respiratoryRate} br/min`:'—'},{label:'Pain',value:vitals.pain?`${vitals.pain} /10`:'—'}].map(x=><div key={x.label}><small>{x.label}</small><strong>{x.value}</strong></div>)}</div></section><section><div className="eyebrow">MEDICAL HISTORY</div>{historyFlags.length?historyFlags.map(name=><span className="intake-review-chip" key={name}>{name}</span>):<p>Not recorded</p>}<p>{allergies||'No allergies recorded'}</p><p>{historyNotes}</p></section></div>
 <div className="intake-info-note"><ShieldCheck size={17}/> Saving patient intake makes the information visible to doctors. A nurse must confirm the provisional priority before the patient is placed in the queue.</div>
</>}
 <div className="intake-footer"><button type="button" className="button button-soft" disabled={step===0||busy} onClick={previous}>Back</button>{step<4?<button type="button" className="button button-primary" onClick={next}>Next <ArrowRight size={17}/></button>:<button type="button" className="button button-primary" disabled={busy} onClick={saveAndAssess}>{busy?'Processing intake…':createdId?'Retry assessment':'Save intake & review priority'} <ArrowRight size={17}/></button>}</div>
 </div>}
 <div className="safety-strip"><ShieldCheck size={18}/> Educational prototype: screening rules are not validated clinical protocols. Do not enter real patient information in an unapproved demonstration environment.</div>
 </>;
}
