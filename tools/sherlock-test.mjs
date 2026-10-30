/** Model integration smoke test and inspection render (software GPU; no timing claims). */
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startVite } from './vite-server.mjs';
const server = await startVite(5180);
const browser = await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  await page.setViewport({width:800,height:650});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',r=>r.isNavigationRequest()?r.respond({status:200,contentType:'text/html',body:'<body style="margin:0"></body>'}):r.continue());
  await page.goto('http://localhost:5180/kart-royale/');
  const result = await page.evaluate(async()=>{
    const T=await import('/kart-royale/node_modules/three/build/three.module.js');
    const {loadSherlock}=await import('/kart-royale/src/kart/Sherlock.ts');
    const {buildKart}=await import('/kart-royale/src/kart/KartModel.ts');
    await loadSherlock();
    const kart=buildKart({name:'Sherlock',color:new T.Color('#ff3b5c')}).root;
    const rig=kart.userData.driver;
    const character=kart.getObjectByName('sherlock');
    const oldRotation=character.parent.rotation.z;
    rig.setPose(1,1,0,0,0);rig.update(0.1);
    const leans=character.parent.rotation.z!==oldRotation;
    rig.setPose(0,0,0,0,0);for(let i=0;i<120;i++) rig.update(1/60);
    const scene=new T.Scene();scene.background=new T.Color('#bbc6d0');
    scene.add(new T.HemisphereLight(0xffffff,0x685040,3));
    const light=new T.DirectionalLight(0xffffff,4);light.position.set(3,5,4);scene.add(light);
    scene.add(kart);kart.userData.impostor.visible=false;
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,650);renderer.toneMapping=T.ACESFilmicToneMapping;
    const camera=new T.PerspectiveCamera(35,800/650,.01,100);camera.position.set(3,2.4,4);camera.lookAt(0,.8,0);
    document.body.replaceChildren(renderer.domElement);
    window.preview={scene,renderer,camera};renderer.render(scene,camera);
    return {character:!!character,leans,oldDriverRemoved:!kart.getObjectByName('driverHelmet'),wheel:!!kart.getObjectByName('steeringWheel')};
  });
  assert.deepEqual(result,{character:true,leans:true,oldDriverRemoved:true,wheel:true});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'/tmp/sherlock-kart-front.png'});
  await page.evaluate(()=>{const p=window.preview;p.camera.position.set(-3,2.2,-4);p.camera.lookAt(0,.8,0);p.renderer.render(p.scene,p.camera)});
  await page.screenshot({path:'/tmp/sherlock-kart-back.png'});
  console.log('PASS',result);
} finally {await browser.close();server.stop();}
