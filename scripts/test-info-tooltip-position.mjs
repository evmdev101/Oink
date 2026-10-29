import {test} from 'node:test';
import assert from 'node:assert/strict';
import {infoTooltipPosition} from '../src/lib/infoTooltipPosition.ts';
const viewport={width:1000,height:700},size={width:350,height:200};
test('tooltip appears below a trigger with enough room',()=>{
  assert.deepEqual(infoTooltipPosition({left:480,right:500,top:100,bottom:120,width:20},size,viewport),{left:315,top:129,side:'bottom',arrow:175});
});
test('tooltip flips above a trigger near the bottom edge',()=>{
  const result=infoTooltipPosition({left:480,right:500,top:650,bottom:670,width:20},size,viewport);
  assert.equal(result.side,'top');assert.equal(result.top,441);
});
test('tooltip stays inside the left and right viewport edges',()=>{
  for(const anchor of [{left:0,right:17,top:100,bottom:117,width:17},{left:983,right:1000,top:100,bottom:117,width:17}]){
    const p=infoTooltipPosition(anchor,size,viewport);assert.ok(p.left>=12);assert.ok(p.left+size.width<=988);assert.ok(p.arrow>=12&&p.arrow<=338);
  }
});
test('long explanations are constrained to a short phone viewport',()=>{
  const p=infoTooltipPosition({left:275,right:292,top:150,bottom:167,width:17},{width:350,height:600},{width:320,height:280});
  assert.equal(p.left,12);assert.equal(p.top,12);assert.ok(p.arrow<=284);
});
