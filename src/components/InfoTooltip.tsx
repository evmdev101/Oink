import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { infoTooltipPosition } from "../lib/infoTooltipPosition";

export function InfoTooltip({label,children,className=""}:{label:string;children:ReactNode;className?:string}) {
  const id=useId(), trigger=useRef<HTMLButtonElement>(null), bubble=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[position,setPosition]=useState<ReturnType<typeof infoTooltipPosition>|null>(null);
  const closing=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const pinned=useRef(false);
  const cancelClose=()=>{clearTimeout(closing.current);closing.current=undefined;};
  const show=()=>{cancelClose();setOpen(true);};
  const close=()=>{cancelClose();pinned.current=false;setOpen(false);setPosition(null);};
  const leave=()=>{cancelClose();closing.current=setTimeout(()=>{
    if(!pinned.current&&!trigger.current?.matches(":focus-visible"))close();
  },160);};
  useEffect(()=>()=>cancelClose(),[]);
  useLayoutEffect(()=>{
    if(!open)return;
    const button=trigger.current,popup=bubble.current;
    if(!button||!popup)return;
    let frame:number|undefined;
    const place=()=>{
      const rect=button.getBoundingClientRect();
      if(rect.bottom<0||rect.top>innerHeight||rect.right<0||rect.left>innerWidth){close();return;}
      const next=infoTooltipPosition(rect,{width:popup.offsetWidth,height:popup.offsetHeight},{width:document.documentElement.clientWidth,height:innerHeight});
      setPosition(previous=>previous&&previous.left===next.left&&previous.top===next.top&&previous.side===next.side&&previous.arrow===next.arrow?previous:next);
    };
    const schedule=()=>{if(frame!==undefined)cancelAnimationFrame(frame);frame=requestAnimationFrame(place);};
    place();
    const observer=new ResizeObserver(schedule);observer.observe(popup);
    window.addEventListener("resize",schedule);window.addEventListener("scroll",schedule,true);
    return()=>{if(frame!==undefined)cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("resize",schedule);window.removeEventListener("scroll",schedule,true);};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const other=(event:Event)=>{if((event as CustomEvent<string>).detail!==id)close();};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){close();event.preventDefault();event.stopPropagation();}};
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!trigger.current?.contains(event.target)&&!bubble.current?.contains(event.target))close();};
    window.dispatchEvent(new CustomEvent("oink-info-tooltip-open",{detail:id}));
    window.addEventListener("oink-info-tooltip-open",other);
    document.addEventListener("keydown",escape,true);document.addEventListener("pointerdown",outside,true);
    return()=>{window.removeEventListener("oink-info-tooltip-open",other);document.removeEventListener("keydown",escape,true);document.removeEventListener("pointerdown",outside,true);};
  },[open,id]);
  const host=trigger.current?.closest("dialog[open]")??(typeof document!=="undefined"?document.body:null);
  return <span className={"info-tooltip "+className} onPointerEnter={event=>{if(event.pointerType!=="touch")show();}} onPointerLeave={event=>{if(event.pointerType!=="touch")leave();}}>
    <button ref={trigger} type="button" className="info-tooltip-trigger" aria-label={label} aria-expanded={open} aria-describedby={open?id:undefined}
      onFocus={event=>{if(event.currentTarget.matches(":focus-visible"))show();}}
      onBlur={event=>{if(!(event.relatedTarget instanceof Node)||!bubble.current?.contains(event.relatedTarget)){pinned.current=false;leave();}}}
      onClick={event=>{event.preventDefault();event.stopPropagation();cancelClose();if(pinned.current)close();else{pinned.current=true;show();}}}><span aria-hidden="true">!</span></button>
    {open&&host&&createPortal(<div ref={bubble} id={id} role="tooltip" className="info-tooltip-popover" data-side={position?.side}
      style={{left:position?.left??0,top:position?.top??0,visibility:position?"visible":"hidden","--info-arrow-x":(position?.arrow??24)+"px"} as CSSProperties}
      onPointerEnter={cancelClose} onPointerLeave={event=>{if(event.pointerType!=="touch")leave();}}>
      <strong className="info-tooltip-title">{label}</strong><div className="info-tooltip-content">{children}</div>
    </div>,host)}
  </span>;
}
