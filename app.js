const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- hours + live status (Zurich time) ---------- */
(function(){
  const days=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
  const OPEN=18, CLOSE=23;
  function now(){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Zurich",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date());
    const g=t=>parts.find(p=>p.type===t).value;
    return {wd:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(g("weekday")), h:parseInt(g("hour"),10)%24, m:parseInt(g("minute"),10)};
  }
  function render(){
    const n=now();
    document.getElementById("board").innerHTML=days.map((d,i)=>{
      const closed=i===6;
      return `<div class="row${closed?" closed":""}${i===n.wd?" today":""}"><span class="d">${d}</span><span class="t">${closed?"geschlossen":"18:00 – 23:00"}</span></div>`;
    }).join("");
    const mins=n.h*60+n.m, isOpen=n.wd<6 && n.h>=OPEN && n.h<CLOSE;
    const st=document.getElementById("status"), tx=document.getElementById("statusText"),
          cd=document.getElementById("countdown"), neon=document.getElementById("neon");
    st.classList.toggle("open",isOpen);
    neon.className="neon "+(isOpen?"on":"off");
    neon.textContent=isOpen?"Jetzt offen":"Geschlossen";
    if(isOpen){
      const left=CLOSE*60-mins;
      tx.textContent="Jetzt offen";
      cd.innerHTML=`Noch <strong>${Math.floor(left/60)} h ${left%60} min</strong> bis 23:00`;
    }else{
      let wd=n.wd, add=0;
      if(!(wd<6 && mins<OPEN*60)){ do{ wd=(wd+1)%7; add++; }while(wd===6); }
      const when=add===0?"heute um 18:00":add===1?"morgen um 18:00":`${days[wd]} um 18:00`;
      tx.textContent="Öffnet "+(add===0?"heute 18:00":add===1?"morgen 18:00":days[wd].slice(0,2)+" 18:00");
      cd.innerHTML=`Nächste Öffnung <strong>${when}</strong>`;
    }
  }
  render(); setInterval(render,30000);

  const btn=document.getElementById("copyBtn");
  btn.addEventListener("click",()=>{
    navigator.clipboard.writeText("079 859 65 65")
      .then(()=>{btn.textContent="Kopiert ✓";setTimeout(()=>btn.textContent="Nummer kopieren",1600);})
      .catch(()=>{const r=document.createRange();r.selectNodeContents(document.getElementById("phone"));const s=getSelection();s.removeAllRanges();s.addRange(r);});
  });
})();

/* ---------- CSS 3D: tilt cards, rising sections, hero headline ---------- */
(function(){
  if(REDUCE) return;
  if(FINE){
    document.querySelectorAll(".tilt").forEach(el=>{
      el.addEventListener("pointermove",e=>{
        const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
        el.style.transform=`perspective(900px) rotateX(${(.5-y)*14}deg) rotateY(${(x-.5)*16}deg) scale(1.02)`;
        el.style.setProperty("--gx",x*100+"%"); el.style.setProperty("--gy",y*100+"%");
      });
      el.addEventListener("pointerleave",()=>{el.style.transform="";});
    });
    const ht=document.getElementById("heroText");
    addEventListener("pointermove",e=>{
      ht.style.setProperty("--px",(e.clientX/innerWidth-.5).toFixed(3));
      ht.style.setProperty("--py",(e.clientY/innerHeight-.5).toFixed(3));
    });
  }
  // sections tilt back in perspective as they enter, flat at center (always visible)
  const rises=[...document.querySelectorAll(".rise")];
  function tick(){
    const vh=innerHeight;
    for(const el of rises){
      const r=el.getBoundingClientRect();
      const d=Math.max(-1,Math.min(1,(r.top+r.height/2-vh/2)/vh));
      el.style.transform=`rotateX(${d*16}deg) translateZ(${-Math.abs(d)*120}px)`;
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ---------- WebGL night scene ---------- */
(function(){
  const canvas=document.getElementById("scene");
  if(typeof THREE==="undefined"){document.body.classList.add("no3d");canvas.remove();return;}
  let renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"}); }
  catch(e){ document.body.classList.add("no3d"); canvas.remove(); return; }
  const mobile=()=>innerWidth<820;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile()?1.5:1.75));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x080b15,1);

  const scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0x080b15,10,26);
  const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);
  camera.position.set(0,0,10);

  /* environment: a dark room with amber, blue and white light panels, so chrome reflects the night */
  (function(){
    const env=new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial({color:0x05070e,side:THREE.BackSide})));
    const panel=(w,h,col,x,y,z,ry,rx)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:col,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,0);env.add(m);};
    panel(14,1.2,0xffffff,0,9.5,0,0,Math.PI/2);
    panel(6,10,0xff9f2e,9.5,0,0,-Math.PI/2);
    panel(6,10,0x2f56d6,-9.5,0,0,Math.PI/2);
    panel(10,.8,0xe2343f,0,-6,9.5,Math.PI);
    panel(3,3,0xffe2b0,4,4,-9.5,0);
    const pm=new THREE.PMREMGenerator(renderer);
    scene.environment=pm.fromScene(env,.03).texture;
  })();

  /* helpers */
  function gradTex(stops,w=64,h=256,vertical=true){
    const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");
    const g=vertical?x.createLinearGradient(0,0,0,h):x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    stops.forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,w,h);
    return new THREE.CanvasTexture(c);
  }

  /* ---- barber pole rig (follows camera) ---- */
  const rig=new THREE.Group(); scene.add(rig);
  const pole=new THREE.Group(); rig.add(pole);

  const sc=document.createElement("canvas"); sc.width=sc.height=512;
  const sx=sc.getContext("2d"); sx.fillStyle="#f4f1ea"; sx.fillRect(0,0,512,512);
  const cols=["#e2343f","#f4f1ea","#2f56d6","#f4f1ea"];
  sx.save(); sx.translate(256,256); sx.rotate(-Math.PI/4.2); sx.translate(-512,-512);
  for(let i=0;i<40;i++){ sx.fillStyle=cols[i%4]; sx.fillRect(0,i*32,1024,32); }
  sx.restore();
  const stripe=new THREE.CanvasTexture(sc);
  stripe.wrapS=stripe.wrapT=THREE.RepeatWrapping; stripe.repeat.set(1,2.4);
  stripe.encoding=THREE.sRGBEncoding; stripe.anisotropy=renderer.capabilities.getMaxAnisotropy();

  const chrome=new THREE.MeshStandardMaterial({color:0xe6e8ef,metalness:1,roughness:.12});
  const brass=new THREE.MeshStandardMaterial({color:0xffb547,metalness:1,roughness:.22,emissive:0x3a2000,emissiveIntensity:.3});

  const core=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,3.4,72,1,true),
    new THREE.MeshPhysicalMaterial({map:stripe,roughness:.3,clearcoat:1,clearcoatRoughness:.1,emissive:0xffffff,emissiveMap:stripe,emissiveIntensity:.35}));
  pole.add(core);
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.64,.64,3.5,72,1,true),
    new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:0,transparent:true,opacity:.18,envMapIntensity:2.2,clearcoat:1,side:THREE.DoubleSide}));
  pole.add(glass);
  const add=(geo,mat,y,rx)=>{const m=new THREE.Mesh(geo,mat);m.position.y=y;if(rx)m.rotation.x=rx;pole.add(m);return m;};
  add(new THREE.CylinderGeometry(.76,.76,.24,72),chrome,1.87);
  add(new THREE.SphereGeometry(.58,64,32,0,Math.PI*2,0,Math.PI/2),chrome,1.99);
  add(new THREE.SphereGeometry(.17,32,16),brass,2.66);
  add(new THREE.CylinderGeometry(.76,.76,.24,72),chrome,-1.87);
  add(new THREE.CylinderGeometry(.42,.66,.4,64),chrome,-2.18);
  add(new THREE.TorusGeometry(.7,.04,16,80),brass,1.73,Math.PI/2);
  add(new THREE.TorusGeometry(.7,.04,16,80),brass,-1.73,Math.PI/2);

  // halo + spotlight beam behind / above the pole
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:gradTex([[0,"rgba(255,181,71,.55)"],[.4,"rgba(255,140,40,.15)"],[1,"rgba(0,0,0,0)"]],256,256,false),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  halo.scale.set(7,7,1); halo.position.z=-1.2; rig.add(halo);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.25,2.1,9,48,1,true),
    new THREE.MeshBasicMaterial({map:gradTex([[0,"rgba(255,200,120,.38)"],[.6,"rgba(255,170,70,.08)"],[1,"rgba(0,0,0,0)"]]),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.set(0,3.2,-.6); rig.add(beam);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.4,64),
    new THREE.MeshBasicMaterial({map:gradTex([[0,"rgba(255,181,71,.35)"],[1,"rgba(0,0,0,0)"]],256,256,false),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-2.45; rig.add(floor);

  /* ---- logo head as a neon sign in the scene, drawn on top to bottom ---- */
  const HEAD=getComputedStyle(document.documentElement).getPropertyValue("--head").trim().replace(/^url\(["']?/,"").replace(/["']?\)$/,"");
  const headGroup=new THREE.Group(); scene.add(headGroup);
  const neonMat=(tex,op)=>new THREE.ShaderMaterial({
    uniforms:{map:{value:tex},color:{value:new THREE.Color(0xffb547)},hot:{value:new THREE.Color(0xfff0cc)},opacity:{value:op},reveal:{value:REDUCE?1.2:0}},
    vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:"uniform sampler2D map;uniform vec3 color;uniform vec3 hot;uniform float opacity;uniform float reveal;varying vec2 vUv;"+
      "void main(){float a=texture2D(map,vUv).a;float d=1.-vUv.y;float shown=1.-smoothstep(reveal-.02,reveal,d);"+
      "float edge=smoothstep(reveal-.08,reveal,d)*shown;vec3 c=mix(color,hot,.35+edge*.65);gl_FragColor=vec4(c*(1.+edge*2.),a*opacity*shown);}",
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const img=new Image();
  img.onload=()=>{
    const sharp=new THREE.Texture(img); sharp.needsUpdate=true;
    const bc=document.createElement("canvas"); bc.width=img.width/2; bc.height=img.height/2;
    const bx=bc.getContext("2d"); bx.filter="blur(10px)"; bx.drawImage(img,0,0,bc.width,bc.height);
    const blur=new THREE.CanvasTexture(bc);
    const geo=new THREE.PlaneGeometry(3.44,5.2);
    const glowM=new THREE.Mesh(geo,neonMat(blur,1.1)); glowM.scale.setScalar(1.02); glowM.position.z=-.05;
    const lineM=new THREE.Mesh(geo,neonMat(sharp,.9));
    headGroup.add(glowM,lineM);
    headGroup.userData.mats=[glowM.material,lineM.material];
    headGroup.userData.t0=clockStart();
  };
  img.src=HEAD;
  let _t0=performance.now(); const clockStart=()=>performance.now();

  /* ---- lights ---- */
  scene.add(new THREE.AmbientLight(0x5a6590,.35));
  const amber=new THREE.PointLight(0xffb547,3,18); scene.add(amber);
  const blue=new THREE.PointLight(0x3a63e0,3,18); scene.add(blue);
  const key=new THREE.DirectionalLight(0xffffff,.7); key.position.set(3,5,8); scene.add(key);

  /* ---- scissors ---- */
  const bladeShape=new THREE.Shape();
  bladeShape.moveTo(-.12,-.07); bladeShape.lineTo(2.3,.01); bladeShape.quadraticCurveTo(1.3,.24,-.12,.13); bladeShape.closePath();
  const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{depth:.03,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2,curveSegments:16});
  const ringGeo=new THREE.TorusGeometry(.26,.055,16,48);
  const armGeo=new THREE.BoxGeometry(.5,.09,.05);
  function makeScissors(handleMat){
    const g=new THREE.Group(), halves=[];
    for(let s=0;s<2;s++){
      const h=new THREE.Group();
      const blade=new THREE.Mesh(bladeGeo,chrome); h.add(blade);
      const arm=new THREE.Mesh(armGeo,chrome); arm.position.set(-.35,-.1,.015); arm.rotation.z=.35; h.add(arm);
      const ring=new THREE.Mesh(ringGeo,handleMat); ring.position.set(-.82,-.28,.015); h.add(ring);
      if(s){ h.scale.y=-1; h.position.z=.05; }
      g.add(h); halves.push(h);
    }
    const screw=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.14,20),brass); screw.rotation.x=Math.PI/2; screw.position.z=.03; g.add(screw);
    g.userData.halves=halves;
    return g;
  }
  /* ---- combs ---- */
  const toothGeo=new THREE.BoxGeometry(.035,.42,.05);
  function makeComb(mat){
    const g=new THREE.Group();
    const spine=new THREE.Mesh(new THREE.BoxGeometry(1.9,.22,.06),mat); spine.position.y=.3; g.add(spine);
    const teeth=new THREE.InstancedMesh(toothGeo,mat,30), m=new THREE.Matrix4();
    for(let i=0;i<30;i++){ m.makeTranslation(-.88+i*(1.76/29),0,0); teeth.setMatrixAt(i,m); }
    g.add(teeth); return g;
  }
  const blackGloss=new THREE.MeshPhysicalMaterial({color:0x12141c,metalness:.2,roughness:.18,clearcoat:1});
  const amberAcrylic=new THREE.MeshPhysicalMaterial({color:0xffa53a,roughness:.1,clearcoat:1,transparent:true,opacity:.82,emissive:0x5a2e00,emissiveIntensity:.4});
  const redHandle=new THREE.MeshPhysicalMaterial({color:0xe2343f,roughness:.25,clearcoat:1});

  const props=[];
  const recipe=[
    ()=>makeScissors(blackGloss),()=>makeComb(blackGloss),()=>makeScissors(redHandle),()=>makeComb(amberAcrylic),
    ()=>makeScissors(brass),()=>makeComb(blackGloss),()=>makeScissors(blackGloss),()=>makeComb(amberAcrylic),()=>makeScissors(redHandle)
  ];
  recipe.forEach((fn,i)=>{
    const o=fn(); scene.add(o);
    const side=i%2?1:-1;
    props.push({o,frac:i/(recipe.length-1),x:side*(2.4+Math.random()*2.2),z:-2.5-Math.random()*4,
      sp:new THREE.Vector3((Math.random()-.5)*.6,(Math.random()-.5)*.8,(Math.random()-.5)*.5),ph:Math.random()*6.28,
      base:new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6)});
  });

  /* ---- dust / clippings ---- */
  const N=mobile()?450:900, pos=new Float32Array(N*3), colr=new Float32Array(N*3), drift=new Float32Array(N);
  const ca=new THREE.Color(0xffb547), cb=new THREE.Color(0x6f8cff), cw=new THREE.Color(0xffffff);
  for(let i=0;i<N;i++){
    pos[i*3]=(Math.random()-.5)*16; pos[i*3+1]=(Math.random()-.5)*16; pos[i*3+2]=-8+Math.random()*10;
    const c=Math.random()<.6?ca:Math.random()<.7?cb:cw; colr.set([c.r,c.g,c.b],i*3);
    drift[i]=.002+Math.random()*.006;
  }
  const pg=new THREE.BufferGeometry();
  pg.setAttribute("position",new THREE.BufferAttribute(pos,3));
  pg.setAttribute("color",new THREE.BufferAttribute(colr,3));
  const dot=gradTex([[0,"rgba(255,255,255,1)"],[.3,"rgba(255,255,255,.6)"],[1,"rgba(255,255,255,0)"]],64,64,false);
  scene.add(new THREE.Points(pg,new THREE.PointsMaterial({size:.07,map:dot,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})));

  /* ---- scroll choreography from section data attributes ---- */
  const K=.0065; // world units per scrolled pixel
  const stops=[...document.querySelectorAll("[data-px]")];
  let marks=[];
  function measure(){
    marks=stops.map(el=>({
      at:Math.max(0,el.offsetTop+el.offsetHeight/2-innerHeight/2),
      x:+el.dataset.px, mx:+(el.dataset.mx||0), y:+(el.dataset.py||0), my:+(el.dataset.my||el.dataset.py||0),
      z:+(el.dataset.pz||0), rz:+(el.dataset.rz||0), s:+(el.dataset.s||1), ms:+(el.dataset.ms||el.dataset.s||1)
    }));
    marks[0].at=0;
    const range=(document.documentElement.scrollHeight-innerHeight)*K;
    props.forEach(p=>{p.y=1.5-p.frac*(range+3);});
  }
  const ease=t=>t*t*(3-2*t), lerp=(a,b,t)=>a+(b-a)*t;
  function target(sy){
    const m=mobile(); let a=marks[0], b=marks[0], t=0;
    for(let i=0;i<marks.length-1;i++){ if(sy>=marks[i].at){a=marks[i];b=marks[i+1];t=(sy-a.at)/Math.max(1,b.at-a.at);} }
    if(sy>=marks[marks.length-1].at){a=b=marks[marks.length-1];t=0;}
    t=ease(Math.min(1,Math.max(0,t)));
    return {x:lerp(m?a.mx:a.x,m?b.mx:b.x,t), y:lerp(m?a.my:a.y,m?b.my:b.y,t), z:lerp(a.z,b.z,t)+(m?-1.5:0),
            rz:lerp(a.rz,b.rz,t), s:lerp(m?a.ms:a.s,m?b.ms:b.s,t), spin:(b===a?0:t)};
  }

  function resize(){
    renderer.setSize(innerWidth,innerHeight,false);
    camera.aspect=innerWidth/innerHeight;
    camera.fov=mobile()?48:35;
    camera.updateProjectionMatrix();
    measure();
  }
  addEventListener("resize",resize); resize();
  addEventListener("load",measure);
  setTimeout(measure,800);

  let mx=0,my=0,tmx=0,tmy=0;
  addEventListener("pointermove",e=>{tmx=e.clientX/innerWidth-.5;tmy=e.clientY/innerHeight-.5;});

  const cur={x:3,y:0,z:0,rz:.12,s:1,camY:0};
  let spinAcc=0, lastSy=scrollY;
  const clock=new THREE.Clock();
  function frame(){
    const dt=Math.min(clock.getDelta(),.05), t=REDUCE?0:clock.elapsedTime;
    const sy=scrollY, tg=target(sy), k=REDUCE?1:1-Math.pow(.0015,dt);
    const vel=sy-lastSy; lastSy=sy; if(!REDUCE) spinAcc+=vel*.004;

    cur.camY=lerp(cur.camY,-sy*K,k);
    for(const p of ["x","y","z","rz","s"]) cur[p]=lerp(cur[p],tg[p],k*.8);
    mx=lerp(mx,tmx,.05); my=lerp(my,tmy,.05);

    camera.position.set(mx*.8,cur.camY-my*.5,mobile()?11:10);
    camera.lookAt(mx*.2,cur.camY,0);

    rig.position.set(cur.x,cur.camY+cur.y,cur.z);
    rig.scale.setScalar(cur.s);
    pole.rotation.set(my*.2,t*.35+spinAcc+mx*.6,cur.rz);
    pole.position.y=Math.sin(t*.9)*.08;
    stripe.offset.y=-t*.35-spinAcc*.3;
    halo.material.opacity=.85+Math.sin(t*2.1)*.15;
    const mob=mobile();
    headGroup.position.set(mob?0:1.45, mob?2.0:.15, mob?-3.2:-2.4);
    headGroup.scale.setScalar(mob?.78:1);
    headGroup.rotation.set(my*.12,-.18+mx*.35,0);
    if(headGroup.userData.mats){
      const el=(performance.now()-headGroup.userData.t0)/1000;
      const rv=REDUCE?1.2:Math.min(1.2,el/2.4);
      const flick=rv<1.1?1:(.92+Math.sin(t*3.1)*.05+(Math.sin(t*17)>.97?-.35:0));
      headGroup.userData.mats.forEach(m=>{m.uniforms.reveal.value=rv;});
      headGroup.userData.mats[0].uniforms.opacity.value=1.1*flick;
      headGroup.userData.mats[1].uniforms.opacity.value=.9*flick;
    }

    amber.position.set(cur.x+3,cur.camY+2.5,4);
    blue.position.set(cur.x-4,cur.camY-1.5,3);
    amber.intensity=3+Math.sin(t*2.3)*.4;

    props.forEach((p,i)=>{
      p.o.position.set(p.x+Math.sin(t*.4+p.ph)*.3,p.y+Math.sin(t*.6+p.ph)*.25,p.z);
      p.o.rotation.set(p.base.x+t*p.sp.x+spinAcc*.2,p.base.y+t*p.sp.y,p.base.z+t*p.sp.z);
      const h=p.o.userData.halves;
      if(h){ const a=.12+.18*(.5+.5*Math.sin(t*2.4+p.ph)); h[0].rotation.z=a; h[1].rotation.z=-a; }
    });

    const arr=pg.attributes.position.array, top=cur.camY+8, bot=cur.camY-8;
    for(let i=0;i<N;i++){
      let y=arr[i*3+1]+(REDUCE?0:drift[i]);
      if(y>top) y-=16; else if(y<bot) y+=16;
      arr[i*3+1]=y;
    }
    pg.attributes.position.needsUpdate=true;

    renderer.render(scene,camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
