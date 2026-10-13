import axios from 'axios';
export const api = axios.create({baseURL:'/api',withCredentials:true,withXSRFToken:true,xsrfCookieName:'XSRF-TOKEN',xsrfHeaderName:'X-XSRF-TOKEN'});
export const csrf = async () => {await api.get('/auth/csrf');};
export function errorMessage(e:unknown):string {
  if(axios.isAxiosError(e)) return e.response?.data?.error || e.response?.data?.message || (e.response?.status === 403 ? 'Access denied, or your session expired.' : e.message);
  return e instanceof Error ? e.message : 'Something went wrong';
}
export const dateText = (d:string) => d ? new Date(d).toLocaleString() : '—';
export const waitText = (m:any) => `${Math.max(0,Number(m)||0)} min`;
export type User = {id:number;name:string;email:string;role:string;approved:boolean};
export type Patient = {id:number;patient_code:string;name:string;age:number;sex:string;complaint:string;symptoms?:string;status:string;created_at:string;priority?:string;queue_status?:string;assessments?:any[];consultations?:any[]};
