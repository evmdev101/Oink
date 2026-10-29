import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { startDecorativeFrameLoop } from '../src/themes/backgroundAnimation.ts';

function clock() {
  let next = 0, visible = true, reduced = false;
  const frames = new Map(), visibility = new Set(), motion = new Set();
  const environment = {
    requestFrame: callback => { frames.set(++next,callback); return next; },
    cancelFrame: id => frames.delete(id),
    visible: () => visible,
    reducedMotion: () => reduced,
    onVisibilityChange: callback => { visibility.add(callback); return () => visibility.delete(callback); },
    onMotionChange: callback => { motion.add(callback); return () => motion.delete(callback); },
  };
  return {
    environment, frames, visibility, motion,
    step(time) { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(time)); },
    hide(value) { visible = !value; visibility.forEach(callback => callback()); },
    reduce(value) { reduced = value; motion.forEach(callback => callback()); },
  };
}

test('hidden tabs do no decorative work and resume one animation loop',()=>{
  const c = clock(); let draws = 0;
  const loop = startDecorativeFrameLoop(()=>draws++,c.environment);
  assert.equal(c.frames.size,1);
  c.hide(true);
  assert.equal(c.frames.size,0);
  const paused = draws;
  c.step(300000);
  loop.redraw();
  assert.equal(draws,paused);
  c.hide(false);
  assert.equal(draws,paused+1);
  assert.equal(c.frames.size,1);
  loop.stop();
});

test('reduced motion leaves a still theme and responds to preference changes',()=>{
  const c = clock(); c.reduce(true); let draws = 0;
  const loop = startDecorativeFrameLoop(()=>draws++,c.environment);
  assert.equal(draws,1);
  assert.equal(c.frames.size,0);
  loop.redraw();
  assert.equal(draws,2);
  c.reduce(false);
  assert.equal(c.frames.size,1);
  c.reduce(true);
  assert.equal(c.frames.size,0);
  loop.stop();
});

test('120 Hz screens do not double animation speed or drawing work',()=>{
  const c = clock(); let draws = 0;
  const loop = startDecorativeFrameLoop(()=>draws++,c.environment);
  for(let frame=0;frame<120;frame++)c.step(frame*1000/120);
  assert.equal(draws,61);
  loop.stop();
});

test('disposal removes listeners and prevents a queued callback from reviving an old loop',()=>{
  const c = clock(); let draws = 0;
  const loop = startDecorativeFrameLoop(()=>draws++,c.environment);
  const oldCallback = [...c.frames.values()][0];
  loop.stop(); loop.stop();
  oldCallback(50); loop.redraw(); c.hide(false); c.reduce(false);
  assert.equal(draws,1);
  assert.equal(c.frames.size,0);
  assert.equal(c.visibility.size,0);
  assert.equal(c.motion.size,0);
});

registerHooks({resolve(specifier,context,next){try{return next(specifier,context)}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error}}});
test('adjusting the same background reuses its canvas and stops all work when replaced',async()=>{
  const c = clock(), canvases = new Map(), resize = new Set(), classes = new Set(), properties = new Map();
  let styleReads = 0, created = 0;
  const originals = Object.fromEntries(['window','document','getComputedStyle'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const noOp = ()=>{};
  const context = new Proxy({}, {get:(_,key)=>String(key).startsWith('create')?()=>({addColorStop:noOp}):noOp,set:()=>true});
  const body = {dataset:{},classList:{add:(...items)=>items.forEach(item=>classes.add(item)),remove:(...items)=>items.forEach(item=>classes.delete(item)),toggle:(item,on)=>on?classes.add(item):classes.delete(item)},prepend:canvas=>canvases.set(canvas.id,canvas)};
  globalThis.window = {innerWidth:1000,innerHeight:700,devicePixelRatio:1,
    requestAnimationFrame:c.environment.requestFrame,cancelAnimationFrame:c.environment.cancelFrame,
    matchMedia:()=>({matches:false,addEventListener:(_,callback)=>c.motion.add(callback),removeEventListener:(_,callback)=>c.motion.delete(callback)}),
    addEventListener:(_,callback)=>resize.add(callback),removeEventListener:(_,callback)=>resize.delete(callback)};
  globalThis.document = {hidden:false,body,documentElement:{style:{setProperty:(key,value)=>properties.set(key,value)}},
    getElementById:id=>canvases.get(id),querySelectorAll:()=>[...canvases.values()],
    createElement:()=>{created++;return {id:'',style:{},getContext:()=>context,remove(){canvases.delete(this.id)}};},
    addEventListener:(_,callback)=>c.visibility.add(callback),removeEventListener:(_,callback)=>c.visibility.delete(callback)};
  globalThis.getComputedStyle = ()=>{styleReads++;return {getPropertyValue:key=>properties.get(key)??'#ffffff'}};
  try {
    const {applyBackground,backgroundDefaults} = await import('../src/themes/backgroundEffects.ts');
    const settings = backgroundDefaults('oink');
    applyBackground(settings,false);
    const originalCanvas = canvases.get('sparkles-canvas');
    for(let i=0;i<50;i++)applyBackground({...settings,size:0.5+i/50},false);
    assert.equal(created,1);
    assert.equal(canvases.get('sparkles-canvas'),originalCanvas);
    assert.equal(c.frames.size,1);
    assert.equal(resize.size,1);
    assert.equal(c.visibility.size,1);
    const before = styleReads;
    for(let i=0;i<120;i++)c.step(i*1000/120);
    assert.equal(styleReads,before,'frames must not query computed styles');
    applyBackground({...settings,pattern:'rain'},false);
    assert.equal(canvases.size,1);
    assert.ok(canvases.has('rain-canvas'));
    assert.equal(c.frames.size,1);
    assert.equal(resize.size,1);
    applyBackground({...settings,pattern:'none'},false);
    assert.equal(canvases.size,0);
    assert.equal(c.frames.size,0);
    assert.equal(resize.size,0);
    assert.equal(c.visibility.size,0);
    assert.equal(c.motion.size,0);
  } finally {
    for(const [key,descriptor] of Object.entries(originals)){
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
    }
  }
});
