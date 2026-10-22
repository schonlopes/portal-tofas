import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDoc,collection,getDocs} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyAnUbSgslv4cvhm2BjZMdLJvWBCbO0UqY0',authDomain:'portal-tofas-guarapuava.firebaseapp.com',projectId:'portal-tofas-guarapuava',storageBucket:'portal-tofas-guarapuava.firebasestorage.app',messagingSenderId:'139129124560',appId:'1:139129124560:web:2a3cb559c944f124ee10d5',measurementId:'G-553Q9Z4KXW'};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account',hd:'escola.pr.gov.br'});
const $=id=>document.getElementById(id);const nf=new Intl.NumberFormat('pt-BR');let profile=null,schools=[],stats=[],students=[],filtered=[],page=0,loadedSchool=null,selectionVersion=0,studentLoadVersion=0;const PAGE_SIZE=40;
function error(message){$('alert').textContent=message;$('alert').classList.remove('hidden')}
function clearError(){$('alert').classList.add('hidden');$('alert').textContent=''}
function busy(button,on,label){button.disabled=on;if(on){button.dataset.old=button.textContent;button.textContent=label}else{button.textContent=button.dataset.old||button.textContent}}
function fmt(n){return nf.format(n||0)}
function codeSchool(){return $('school').value}
function seriesLabel(s){return s==='8_Ano'?'8º ano':s==='2_Serie'?'2ª série':s}
function currentStats(){return stats.filter(s=>($('serie').value==='all'||s.serie===$('serie').value)&&(codeSchool()==='all'||s.codigo_escola===codeSchool()))}
function sum(a,k){return a.reduce((t,x)=>t+(Number(x[k])||0),0)}
function levelSum(a,k,i){return a.reduce((t,x)=>t+(Number((x[k]||[])[i])||0),0)}
function paintStats(){const a=currentStats();$('mStudents').textContent=fmt(sum(a,'estudantes_com_registro'));$('mCerts').textContent=fmt(sum(a,'total_certificados'));$('mTriple').textContent=fmt(sum(a,'tres_certificados'));$('mReports').textContent=fmt(a.reduce((t,x)=>t+(x.com_relatorio_por_nivel||[]).reduce((s,n)=>s+n,0),0));const levels=$('levels');levels.replaceChildren();const counts=[0,1,2].map(i=>levelSum(a,'certificados_por_nivel',i)),max=Math.max(1,...counts);counts.forEach((n,i)=>{const wrapper=document.createElement('div');const head=document.createElement('div');head.className='levelHead';const left=document.createElement('span');left.textContent=`Nível ${i+1}`;const right=document.createElement('strong');right.textContent=fmt(n);head.append(left,right);const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('div');fill.className='barFill';fill.style.width=`${n/max*100}%`;bar.append(fill);wrapper.append(head,bar);levels.append(wrapper)});const body=$('seriesRows');body.replaceChildren();for(const s of ['8_Ano','2_Serie']){const rows=a.filter(x=>x.serie===s);const tr=document.createElement('tr');for(const val of [seriesLabel(s),fmt(sum(rows,'estudantes_com_registro')),fmt(sum(rows,'total_certificados')),fmt(sum(rows,'tres_certificados'))]){const td=document.createElement('td');td.textContent=val;tr.append(td)}body.append(tr)}}
async function loadPackages(){
  const box=$('packageRows'),hint=$('packagesHint');box.replaceChildren();
  const code=codeSchool();
  if(!code||code==='all'){hint.textContent='Selecione uma escola para consultar seus pacotes.';return;}
  hint.textContent='Consultando pacotes disponíveis...';
  try{
    const snap=await getDocs(collection(db,'escolas',code,'pacotes'));
    const packages=snap.docs.map(d=>d.data()).filter(p=>p.codigo_escola===code && ['8_Ano','2_Serie'].includes(p.serie) && ['Certificados','Relatorios'].includes(p.tipo) && /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view$/.test(p.url));
    const series=$('serie').value;
    const selected=packages.filter(p=>series==='all'||p.serie===series).sort((a,b)=>a.serie.localeCompare(b.serie)||a.tipo.localeCompare(b.tipo));
    hint.textContent=selected.length?`${selected.length} pacote(s) disponível(is) para a seleção atual. O Drive verificará seu acesso.`:'Nenhum pacote disponível para a seleção atual.';
    for(const p of selected){
      const card=document.createElement('article');card.className='packageCard';
      const title=document.createElement('strong');title.textContent=`${seriesLabel(p.serie)} · ${p.tipo==='Certificados'?'Certificados':'Relatórios'}`;
      const detail=document.createElement('span');detail.className='muted';detail.textContent=`${Number(p.pdfs||0).toLocaleString('pt-BR')} PDF(s) · ${(Number(p.bytes||0)/1048576).toFixed(1).replace('.',',')} MiB`;
      const fileId=p.url.match(/^https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view$/)?.[1];
      if(!fileId)continue;
      // O endpoint /uc?export=download pode devolver 403 para arquivos privados,
      // mesmo quando o usuário consegue abri-los no Google Drive.
      // Abrir o link oficial preserva a verificação de permissões do Drive.
      const link=document.createElement('a');
      link.className='downloadLink';
      link.textContent='Abrir pacote no Drive ↗';
      link.href=p.url;
      link.target='_blank';
      link.rel='noopener noreferrer';
      card.append(title,detail,link);box.append(card);
    }
  }catch(e){console.error(e);hint.textContent='Não foi possível carregar os pacotes. Confira as regras do Firestore.';}
}
function isAdmin(){return profile?.perfil==='admin'}
function studentColSpan(){return isAdmin()?8:6}
function setStudentMessage(message){const body=$('studentRows');body.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=studentColSpan();td.className='empty';td.textContent=message;tr.append(td);body.append(tr)}
function configureStudentView(){const admin=isAdmin();$('adminStudentFilters').classList.toggle('hidden',!admin);$('schoolColumn').classList.toggle('hidden',!admin);$('totalColumn').classList.toggle('hidden',!admin);$('studentsTitle').textContent=admin?'Estudantes certificados — Administração':'Estudantes';$('studentsDescription').textContent=admin?'Estudantes com ao menos um certificado. Selecione todas as escolas para a consulta regional.':'Consulta nominal disponível somente para escolas autorizadas.'}
function resetStudents(){students=[];filtered=[];page=0;loadedSchool=null;studentLoadVersion++;$('search').value='';$('search').disabled=true;$('studentCount').textContent='';setStudentMessage('Carregando estudantes...');$('pageText').textContent='';$('prev').disabled=true;$('next').disabled=true;}
function certificateTotal(s){return [0,1,2].reduce((n,i)=>n+(s.certificados?.[i]?1:0),0)}
function paintStudents(){const q=$('search').value.trim().toLocaleLowerCase('pt-BR'),admin=isAdmin(),count=$('certificateCount').value;filtered=students.filter(s=>($('serie').value==='all'||s.serie===$('serie').value)&&(!admin||(certificateTotal(s)>0&&(count==='all'||certificateTotal(s)===Number(count))))&&(!q||[s.nome,s.cgm,admin?s.nome_escola:''].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(q))));page=Math.min(page,Math.max(0,Math.ceil(filtered.length/PAGE_SIZE)-1));$('studentCount').textContent=`${fmt(filtered.length)} ${admin?'estudante(s) certificado(s)':'registro(s)'}`;const body=$('studentRows');body.replaceChildren();for(const s of filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE)){const tr=document.createElement('tr');const values=[s.nome,s.cgm,...(admin?[s.nome_escola||s.codigo_escola||'—']:[]),seriesLabel(s.serie),...[0,1,2].map(i=>admin?(s.certificados?.[i]?'Certificado':'—'):(s.certificados?.[i]?'Certificado':s.relatorios?.[i]?'Relatório':'—')),...(admin?[certificateTotal(s)]:[])];values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=String(v??'—');const levelStart=admin?4:3;if(i>=levelStart&&i<levelStart+3)td.className=s.certificados?.[i-levelStart]?'ok':'no';if(admin&&i===2)td.classList.add('schoolNameCell');if(admin&&i===7)td.classList.add('certificateTotal');tr.append(td)});body.append(tr)}if(!filtered.length)setStudentMessage(admin?'Nenhum estudante certificado encontrado para os filtros selecionados.':'Nenhum estudante encontrado.');$('prev').disabled=page===0;$('next').disabled=(page+1)*PAGE_SIZE>=filtered.length;$('pageText').textContent=filtered.length?`Página ${page+1} de ${Math.ceil(filtered.length/PAGE_SIZE)}`:''}
async function loadSchoolStats(code){const ref=collection(db,'escolas',code,'estatisticas');const snap=await getDocs(ref);return snap.docs.map(d=>d.data())}
async function selectSchool(){
  const version=++selectionVersion;
  clearError();resetStudents();
  try{
    if(codeSchool()==='all'){
      const all=await Promise.all(schools.map(s=>loadSchoolStats(s.codigo_escola)));
      if(version!==selectionVersion)return;
      stats=all.flat();
    }else{
      const data=await loadSchoolStats(codeSchool());
      if(version!==selectionVersion)return;
      stats=data;
    }
    paintStats();
    await Promise.all([loadPackages(),loadStudents(version)]);
  }catch(e){
    if(version!==selectionVersion)return;
    console.error(e);error('Não foi possível consultar os dados da escola. Verifique as permissões do Firestore.');
    stats=[];paintStats();
  }
}
async function loadStudents(version=selectionVersion){
  const code=codeSchool(),admin=isAdmin(),token=++studentLoadVersion;
  const targets=admin&&code==='all'?schools.map(s=>s.codigo_escola):code&&code!=='all'?[code]:[];
  if(!targets.length){setStudentMessage('Selecione uma escola para consultar estudantes.');return}
  $('search').disabled=true;
  setStudentMessage(admin&&targets.length>1?'Carregando estudantes certificados das escolas do NRE...':'Carregando estudantes...');
  const names=new Map(schools.map(s=>[String(s.codigo_escola),s.nome||s.codigo_escola]));
  const collected=[];
  try{
    // Lotes pequenos evitam sobrecarregar o navegador e respeitam as regras por escola.
    for(let i=0;i<targets.length;i+=6){
      const group=targets.slice(i,i+6);
      const results=await Promise.all(group.map(async schoolCode=>{
        const snap=await getDocs(collection(db,'escolas',schoolCode,'estudantes'));
        return snap.docs.map(d=>({...d.data(),codigo_escola:schoolCode,nome_escola:names.get(String(schoolCode))||schoolCode}));
      }));
      if(version!==selectionVersion||token!==studentLoadVersion)return;
      collected.push(...results.flat());
      if(targets.length>6)setStudentMessage(`Carregando escolas: ${Math.min(i+6,targets.length)} de ${targets.length}...`);
    }
    if(version!==selectionVersion||token!==studentLoadVersion)return;
    students=admin?collected.filter(s=>certificateTotal(s)>0):collected;
    loadedSchool=code;$('search').disabled=false;page=0;paintStudents();
  }catch(e){
    if(version!==selectionVersion||token!==studentLoadVersion)return;
    console.error(e);error('Não foi possível carregar todos os estudantes. Confira as permissões por escola.');
    students=[];setStudentMessage('Falha ao carregar estudantes. Nenhum resultado parcial foi exibido.');
  }
}
async function enter(user){clearError();const email=(user.email||'').toLowerCase();if(!email.endsWith('@escola.pr.gov.br')||!user.emailVerified){await signOut(auth);error('Utilize uma conta Google institucional verificada (@escola.pr.gov.br).');return}const snap=await getDoc(doc(db,'usuarios',email));if(!snap.exists()||snap.data().ativo!==true){await signOut(auth);error('Esta conta não está autorizada. Solicite o cadastro ao NRE Guarapuava.');return}profile=snap.data();const admin=profile.perfil==='admin';if(!admin&&profile.perfil!=='professor'){await signOut(auth);error('Perfil não reconhecido.');return}const codes=admin?null:(Array.isArray(profile.escolas)?profile.escolas:[]);if(!admin&&!codes.length){await signOut(auth);error('Seu cadastro não possui escolas autorizadas.');return}let result;if(admin){const all=await getDocs(collection(db,'escolas'));result=all.docs.map(d=>d.data())}else{result=(await Promise.all(codes.map(async code=>{const s=await getDoc(doc(db,'escolas',code));return s.exists()?s.data():null}))).filter(Boolean)}schools=result.sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));if(!schools.length){await signOut(auth);error('Não há escolas disponíveis para este perfil.');return}configureStudentView();$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('identity').classList.remove('hidden');$('userName').textContent=user.displayName||email;$('roleTag').textContent=admin?'Administração NRE':'Professor(a)';$('welcome').textContent=admin?`Visão consolidada das ${schools.length} escolas autorizadas.`:`${schools.length} escola(s) vinculada(s) ao seu cadastro.`;const sel=$('school');sel.replaceChildren();if(admin){const o=new Option('Todas as escolas — NRE Guarapuava','all');sel.add(o)}for(const s of schools)sel.add(new Option(`${s.nome||s.codigo_escola} · ${s.codigo_escola}`,s.codigo_escola));await selectSchool()}
function leave(){profile=null;schools=[];stats=[];students=[];$('appView').classList.add('hidden');$('identity').classList.add('hidden');$('loginView').classList.remove('hidden')}
$('login').addEventListener('click',async()=>{clearError();busy($('login'),true,'Abrindo Google...');try{await signInWithPopup(auth,provider)}catch(e){console.error(e);if(e.code==='auth/popup-blocked'){try{await signInWithRedirect(auth,provider)}catch(err){error('Falha ao abrir login Google: '+err.code)}}else if(e.code!=='auth/popup-closed-by-user'){error('Falha no login: '+(e.code||'erro desconhecido'))}}finally{busy($('login'),false)}});
$('logout').addEventListener('click',()=>signOut(auth));$('school').addEventListener('change',selectSchool);$('serie').addEventListener('change',()=>{loadPackages();paintStats();page=0;if(loadedSchool===codeSchool())paintStudents()});$('reload').addEventListener('click',selectSchool);$('refreshPackages').addEventListener('click',loadPackages);$('search').addEventListener('input',()=>{page=0;paintStudents()});$('certificateCount').addEventListener('change',()=>{page=0;if(isAdmin())paintStudents()});$('prev').addEventListener('click',()=>{page--;paintStudents()});$('next').addEventListener('click',()=>{page++;paintStudents()});
getRedirectResult(auth).catch(e=>{console.error(e);error('Falha ao concluir login Google: '+e.code)});onAuthStateChanged(auth,async user=>{if(!user){leave();return}try{await enter(user)}catch(e){console.error(e);leave();error('Não foi possível abrir seu painel. Verifique as permissões e a conexão com o Firestore.')}});
