'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {messages,Locale} from '../../i18n/messages';
type Ctx={locale:Locale;setLocale:(v:Locale)=>void;t:(key:string)=>string};
const C=createContext<Ctx>({locale:'ru',setLocale:()=>{},t:(k)=>k});
export function I18nProvider({children}:{children:React.ReactNode}){const [locale,setLocaleState]=useState<Locale>('ru');useEffect(()=>{const v=localStorage.getItem('li-locale');if(v==='en'||v==='ru')setLocaleState(v)},[]);const setLocale=(v:Locale)=>{setLocaleState(v);localStorage.setItem('li-locale',v);document.documentElement.lang=v};const t=(key:string)=>key.split('.').reduce<any>((o,k)=>o?.[k],messages[locale])??key;return <C.Provider value={{locale,setLocale,t}}>{children}</C.Provider>};export const useI18n=()=>useContext(C);
