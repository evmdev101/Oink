type Anchor = { left:number; top:number; right:number; bottom:number; width:number };
/** Viewport coordinates keep explanations out of clipped cards and scroll areas. */
export function infoTooltipPosition(anchor:Anchor, size:{width:number;height:number}, viewport:{width:number;height:number}) {
  const margin=12, gap=9;
  const width=Math.min(size.width,Math.max(0,viewport.width-margin*2));
  const height=Math.min(size.height,Math.max(0,viewport.height-margin*2));
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(value,Math.max(min,max)));
  const below=viewport.height-margin-anchor.bottom-gap, above=anchor.top-margin-gap;
  const side=below>=height || below>=above?"bottom":"top";
  const left=clamp(anchor.left+anchor.width/2-width/2,margin,viewport.width-margin-width);
  const top=clamp(side==="bottom"?anchor.bottom+gap:anchor.top-gap-height,margin,viewport.height-margin-height);
  return {left,top,side,arrow:clamp(anchor.left+anchor.width/2-left,12,width-12)} as const;
}
