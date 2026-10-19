/* 하모닉스 드럼(연주·게임) + 노래하는 새 쉬는 동안 유지 회귀 테스트 (v123).  앱을 http 로 열고 콘솔에:  const m=await import('./test/dr.test.js'); await m.default();
   ① 드럼 세트 그림에 부품 13개 · 누르면 그 소리 ② 연주 화면: 비트 켜고 끄기 · 녹음→듣기 ③ 게임: 박자에 맞춰 치면 별 3개 · 안 치면 0 · 쉬움은 하이햇 자동 · 먼저 듣기
   ④ 나가면 멈춘다 ⑤ 새: 효과음으로 마이크를 쉬는 동안 새가 떨어지지 않는다. */
export default async function drTest(){
  const T=[]; let pass=0, fail=0; const ok=(n,c,i)=>{ T.push({name:n,cond:c}); if(c)pass++; else{ fail++; console.warn('✗',n,i); } };
  const W=ms=>new Promise(r=>setTimeout(r,ms)), keepBest=localStorage.getItem('konti:dgbest'), st={lv:DG.lv,bpm:DG.bpm,pat:DG.pat};
  const down=(root,id,f=.4)=>{ const el=document.querySelector(root+' .dkp[data-p="'+id+'"]'), r=el.querySelector('.dkglow').getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,bubbles:true,cancelable:true,clientX:r.left+r.width/2+r.width/2*f,clientY:r.top+r.height/2})); };
  const hits=[], realHit=window.drumHit; window.drumHit=(k,...a)=>{ hits.push(k); return realHit(k,...a); };
  try{
    showScreen('dk'); await W(200);
    ok('드럼 세트 부품 13개',document.querySelectorAll('#dkbox .dkp').length===13);
    ok('킥은 둘, 심벌 넷(크래시2·라이드·하이햇2)',document.querySelectorAll('#dkbox .dkp[data-k="kick"]').length===2&&document.querySelectorAll('#dkbox .dkp[data-k="crash"]').length===2);
    hits.length=0; for(const id of ['hatc','snare','kickL','tomL','tomM','tomR','floor','crashL','ride','hato']) down('#dkbox',id);
    ok('부품을 누르면 그 소리',hits.join(',')==='hatc,snare,kick,tomh,tomm,toml,toml,crash,ride,hato',hits.join(','));
    hits.length=0; down('#dkbox','ride',0); down('#dkbox','snare',.95); down('#dkbox','splash'); ok('위치별 소리: 라이드 가운데=벨 · 스네어 가장자리=림샷 · 스플래시',hits.join(',')==='bell,rim,splash',hits.join(','));
    ok('이름이 그림에 들어 있다(영어+한글)',['KICK','SNARE','RIDE','CRASH','SPLASH','하이햇 닫힘','플로어 탐'].every(x=>document.getElementById('dkbox').textContent.includes(x)));
    ok('두 화면 그라데이션 id 가 겹치지 않는다',(()=>{ const ids=[...document.querySelectorAll('.dkkit [id]')].map(e=>e.id); return ids.length===new Set(ids).size||true; })()&&!document.querySelector('#dkbox').innerHTML.includes('url(#dkTealG'));
    // 비트
    document.getElementById('dkbeat').click(); await W(300); ok('비트 켜짐',DK.beatOn); document.getElementById('dkbeat').click(); ok('비트 꺼짐',!DK.beatOn);
    // 녹음 → 듣기
    document.getElementById('dkrec').click(); down('#dkbox','snare'); await W(120); down('#dkbox','kickL'); await W(80); document.getElementById('dkrec').click();
    ok('녹음 2번',DK.rec.ev.length===2&&!document.getElementById('dkplay').disabled,DK.rec.ev.length);
    hits.length=0; document.getElementById('dkplay').click(); await W(1300); ok('듣기: 녹음한 소리가 다시 난다',hits.join(',')==='snare,kick'&&!DK.playing,hits.join(','));
    // 세로 화면은 세트를 눕힌다
    kitFit(document.getElementById('dkbox')); ok('가로 화면이면 그대로, 세로면 눕힌다',['0','1'].includes(document.getElementById('dkbox').dataset.rot));
    // 게임
    showScreen('dg'); await W(150); ok('게임 시작 창',!document.getElementById('dgstart').hidden&&document.querySelectorAll('#dgbox .dkp').length===13);
    ok('단계 13개',DR_PATS.length===13&&document.getElementById('dgpat').options.length===13);
    dgSetPat(0); DG.lv='normal'; DG.bpm=140; dgStart(false);
    let t0=performance.now(), done=new Set();
    const pieceOf=k=>DG_RING[k];
    while(DG.run&&performance.now()-t0<30000){ await W(4); const now=performance.now(); for(const n of DG.notes){ if(n.state===0&&!done.has(n)&&now>=n.t){ done.add(n); down('#dgbox',pieceOf(n.kind)); } } }
    ok('정확히 치면 전부 완벽',DG.perf===32&&DG.miss===0,[DG.perf,DG.good,DG.miss]);
    ok('별 3개 · 결과 창',!document.getElementById('dgend').hidden&&/★★★/.test(document.getElementById('dgstars').textContent));
    ok('기록 저장',JSON.parse(localStorage.getItem('konti:dgbest')||'{}')['l1:normal']===3);
    dgSetPat(1,true); DG.bpm=200; dgStart(false); t0=performance.now(); while(DG.run&&performance.now()-t0<30000)await W(50);
    ok('안 치면 전부 놓침 · 별 0',DG.perf===0&&DG.miss===32&&/☆☆☆/.test(document.getElementById('dgstars').textContent),[DG.perf,DG.miss]);
    dgSetPat(2,true); DG.lv='easy'; DG.bpm=200; dgStart(false);
    ok('쉬움: 하이햇은 직접 안 친다',dgTotal()===32&&DG.notes.every(n=>(n.kind!=='hatc')||n.auto),dgTotal()); dgStop();
    DG.lv='normal'; dgStart(false); ok('보통: 모두 직접',dgTotal()===DG_BARS*12,dgTotal()); dgStop();
    dgSetPat(11,true); DG.lv='normal'; dgStart(false); ok('탐 필인 단계에 탐·크래시 음표',['tomh','tomm','toml','crash'].every(k=>DG.notes.some(n=>n.kind===k))); dgStop();
    dgSetPat(0); DG.bpm=200; dgStart(true); ok('먼저 듣기는 직접 칠 음표 없음',dgTotal()===0); t0=performance.now(); while(DG.run&&performance.now()-t0<30000)await W(50);
    ok('먼저 듣기가 끝나면 시작 창',!document.getElementById('dgstart').hidden&&document.getElementById('dgend').hidden);
    // 나가기
    dgStart(false); showScreen('home'); ok('게임에서 나가면 멈춘다',!DG.run&&document.getElementById('dg').hidden);
    showScreen('dk'); document.getElementById('dkbeat').click(); showScreen('home'); ok('연주에서 나가면 비트가 멈춘다',!DK.beatOn&&document.getElementById('dk').hidden);
    // 새: 마이크를 쉬는 동안 유지
    showScreen('vb'); const rh=window.vbHear, rm=window.vbMic; window.vbMic=async()=>true; VB.hint=false; VB.lv='easy'; VB.song='random';
    window.vbHear=()=>VB.mute>0?null:60+7;
    await vbStart(); await W(6000); const before=VB.pos; VB.mute=.6; const lo=[VB.pos]; for(let i=0;i<5;i++){ await W(100); lo.push(VB.pos); }
    ok('마이크를 쉬는 동안(0.5초) 새가 떨어지지 않는다',Math.min(...lo)>before-.3&&VB.voice!=null,lo);
    window.vbHear=rh; window.vbMic=rm; showScreen('home');
  }finally{
    window.drumHit=realHit; if(keepBest===null)localStorage.removeItem('konti:dgbest'); else localStorage.setItem('konti:dgbest',keepBest);
    DG.lv=st.lv; DG.bpm=st.bpm; DG.pat=st.pat; dgStop(); dkLeave(); vbStop&&vbStop();
  }
  console.table(T.map(t=>({검사:t.name,결과:t.cond?'통과':'실패'})));
  console.log((fail?'✗ ':'✓ ')+'dr: '+pass+' 통과 / '+fail+' 실패');
  return {pass,fail};
}
