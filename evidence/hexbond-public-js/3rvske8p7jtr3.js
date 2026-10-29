(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,405414,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={assign:function(){return l},searchParamsToUrlQuery:function(){return a},urlQueryToSearchParams:function(){return i}};for(var n in o)Object.defineProperty(r,n,{enumerable:!0,get:o[n]});function a(e){let t={};for(let[r,o]of e.entries()){let e=t[r];void 0===e?t[r]=o:Array.isArray(e)?e.push(o):t[r]=[e,o]}return t}function s(e){return"string"==typeof e?e:("number"!=typeof e||isNaN(e))&&"boolean"!=typeof e?"":String(e)}function i(e){let t=new URLSearchParams;for(let[r,o]of Object.entries(e))if(Array.isArray(o))for(let e of o)t.append(r,s(e));else t.set(r,s(o));return t}function l(e,...t){for(let r of t){for(let t of r.keys())e.delete(t);for(let[t,o]of r.entries())e.append(t,o)}return e}},477493,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={DecodeError:function(){return w},MiddlewareNotFoundError:function(){return k},MissingStaticPage:function(){return v},NormalizeError:function(){return b},PageNotFoundError:function(){return g},SP:function(){return m},ST:function(){return y},WEB_VITALS:function(){return a},execOnce:function(){return s},getDisplayName:function(){return p},getLocationOrigin:function(){return c},getURL:function(){return u},isAbsoluteUrl:function(){return l},isResSent:function(){return h},loadGetInitialProps:function(){return f},normalizeRepeatedSlashes:function(){return d},stringifyError:function(){return x}};for(var n in o)Object.defineProperty(r,n,{enumerable:!0,get:o[n]});let a=["CLS","FCP","FID","INP","LCP","TTFB"];function s(e){let t,r=!1;return(...o)=>(r||(r=!0,t=e(...o)),t)}let i=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>i.test(e);function c(){let{protocol:e,hostname:t,port:r}=window.location;return`${e}//${t}${r?":"+r:""}`}function u(){let{href:e}=window.location,t=c();return e.substring(t.length)}function p(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function h(e){return e.finished||e.headersSent}function d(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function f(e,t){let r=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await f(t.Component,t.ctx)}:{};let o=await e.getInitialProps(t);if(r&&h(r))return o;if(!o)throw Object.defineProperty(Error(`"${p(e)}.getInitialProps()" should resolve to an object. But found "${o}" instead.`),"__NEXT_ERROR_CODE",{value:"E1025",enumerable:!1,configurable:!0});return o}let m="u">typeof performance,y=m&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class w extends Error{}class b extends Error{}class g extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class v extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class k extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function x(e){return JSON.stringify({message:e.message,stack:e.stack})}},169078,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"warnOnce",{enumerable:!0,get:function(){return o}});let o=e=>{}},260220,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={formatUrl:function(){return i},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var n in o)Object.defineProperty(r,n,{enumerable:!0,get:o[n]});let a=e.r(519728)._(e.r(405414)),s=/https?|ftp|gopher|file/;function i(e){let{auth:t,hostname:r}=e,o=e.protocol||"",n=e.pathname||"",i=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:r&&(c=t+(~r.indexOf(":")?`[${r}]`:r),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(a.urlQueryToSearchParams(l)));let u=e.search||l&&`?${l}`||"";return o&&!o.endsWith(":")&&(o+=":"),e.slashes||(!o||s.test(o))&&!1!==c?(c="//"+(c||""),n&&"/"!==n[0]&&(n="/"+n)):c||(c=""),i&&"#"!==i[0]&&(i="#"+i),u&&"?"!==u[0]&&(u="?"+u),n=n.replace(/[?#]/g,encodeURIComponent),u=u.replace("#","%23"),`${o}${c}${n}${u}${i}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return i(e)}},134222,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"useMergedRef",{enumerable:!0,get:function(){return n}});let o=e.r(192451);function n(e,t){let r=(0,o.useRef)(null),n=(0,o.useRef)(null);return(0,o.useCallback)(o=>{if(null===o){let e=r.current;e&&(r.current=null,e());let t=n.current;t&&(n.current=null,t())}else e&&(r.current=a(e,o)),t&&(n.current=a(t,o))},[e,t])}function a(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let r=e(t);return"function"==typeof r?r:()=>e(null)}}("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},27103,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"isLocalURL",{enumerable:!0,get:function(){return a}});let o=e.r(477493),n=e.r(375130);function a(e){if(!(0,o.isAbsoluteUrl)(e))return!0;try{let t=(0,o.getLocationOrigin)(),r=new URL(e,t);return r.origin===t&&(0,n.hasBasePath)(r.pathname)}catch(e){return!1}}},889210,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"errorOnce",{enumerable:!0,get:function(){return o}});let o=e=>{}},931902,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0});var o={default:function(){return w},useLinkStatus:function(){return g}};for(var n in o)Object.defineProperty(r,n,{enumerable:!0,get:o[n]});let a=e.r(519728),s=e.r(380363),i=a._(e.r(192451)),l=e.r(260220),c=e.r(601651),u=e.r(134222),p=e.r(477493),h=e.r(224022);e.r(169078);let d=e.r(319308),f=e.r(253641),m=e.r(27103),y=e.r(730746);function w(t){var r,o;let n,a,w,[g,v]=(0,i.useOptimistic)(f.IDLE_LINK_STATUS),k=(0,i.useRef)(null),{href:x,as:_,children:C,prefetch:j=null,passHref:P,replace:W,shallow:S,scroll:E,onClick:O,onMouseEnter:R,onTouchStart:I,legacyBehavior:A=!1,onNavigate:T,transitionTypes:q,ref:N,unstable_dynamicOnHover:B,...D}=t;n=C,A&&("string"==typeof n||"number"==typeof n)&&(n=(0,s.jsx)("a",{children:n}));let L=i.default.useContext(c.AppRouterContext),M=!1!==j,F=!1!==j?null===(o=j)||"auto"===o?y.FetchStrategy.PPR:y.FetchStrategy.Full:y.FetchStrategy.PPR,H="string"==typeof(r=_||x)?r:(0,l.formatUrl)(r);if(A){if(n?.$$typeof===Symbol.for("react.lazy"))throw Object.defineProperty(Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag."),"__NEXT_ERROR_CODE",{value:"E863",enumerable:!1,configurable:!0});a=i.default.Children.only(n)}let U=A?a&&"object"==typeof a&&a.ref:N,z=i.default.useCallback(e=>(null!==L&&(k.current=(0,f.mountLinkInstance)(e,H,L,F,M,v)),()=>{k.current&&((0,f.unmountLinkForCurrentNavigation)(k.current),k.current=null),(0,f.unmountPrefetchableInstance)(e)}),[M,H,L,F,v]),$={ref:(0,u.useMergedRef)(z,U),onClick(t){A||"function"!=typeof O||O(t),A&&a.props&&"function"==typeof a.props.onClick&&a.props.onClick(t),!L||t.defaultPrevented||function(t,r,o,n,a,s,l){if("u">typeof window){let c,{nodeName:u}=t.currentTarget;if("A"===u.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,m.isLocalURL)(r)){n&&(t.preventDefault(),location.replace(r));return}if(t.preventDefault(),s){let e=!1;if(s({preventDefault:()=>{e=!0}}),e)return}let{dispatchNavigateAction:p}=e.r(571759);i.default.startTransition(()=>{p(r,n?"replace":"push",!1===a?d.ScrollBehavior.NoScroll:d.ScrollBehavior.Default,o.current,l)})}}(t,H,k,W,E,T,q)},onMouseEnter(e){A||"function"!=typeof R||R(e),A&&a.props&&"function"==typeof a.props.onMouseEnter&&a.props.onMouseEnter(e),L&&M&&(0,f.onNavigationIntent)(e.currentTarget,!0===B)},onTouchStart:function(e){A||"function"!=typeof I||I(e),A&&a.props&&"function"==typeof a.props.onTouchStart&&a.props.onTouchStart(e),L&&M&&(0,f.onNavigationIntent)(e.currentTarget,!0===B)}};return(0,p.isAbsoluteUrl)(H)?$.href=H:A&&!P&&("a"!==a.type||"href"in a.props)||($.href=(0,h.addBasePath)(H)),w=A?i.default.cloneElement(a,$):(0,s.jsx)("a",{...D,...$,children:n}),(0,s.jsx)(b.Provider,{value:g,children:w})}e.r(889210);let b=(0,i.createContext)(f.IDLE_LINK_STATUS),g=()=>(0,i.useContext)(b);("function"==typeof r.default||"object"==typeof r.default&&null!==r.default)&&void 0===r.default.__esModule&&(Object.defineProperty(r.default,"__esModule",{value:!0}),Object.assign(r.default,r),t.exports=r.default)},549495,e=>{"use strict";var t=e.i(380363);let r=["3000","4000","5000","6000","7000","8000"];e.s(["TokenIcon",0,function({symbol:e,size:o=14}){if("HEX"===e||"pHEX"===e||"eHEX"===e)return(0,t.jsx)("img",{src:"/hex-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("PLS"===e||"WPLS"===e)return(0,t.jsx)("img",{src:"/pls-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("PLSX"===e)return(0,t.jsx)("img",{src:"/plsx-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("INC"===e)return(0,t.jsx)("img",{src:"/inc-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("HDRN"===e)return(0,t.jsx)("img",{src:"/hdrn-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("DIVX"===e)return(0,t.jsx)("img",{src:"/divx-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if("GSX"===e)return(0,t.jsx)("img",{src:"/gsx-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if("DISTROX"===e)return(0,t.jsx)("img",{src:"/distrox-logo.jpg",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if("HBMC"===e)return(0,t.jsx)("img",{src:"/hbmc-logo.jpg",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if("PRVX"===e)return(0,t.jsx)("img",{src:"/prvx-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("DAI"===e)return(0,t.jsx)("img",{src:"/dai-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0"});if("HBRP"===e)return(0,t.jsx)("img",{src:"/hbrp-hero.jpg",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full object-cover"});if("HBMC"===e)return(0,t.jsx)("img",{src:"/hbmc-logo.jpg",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full object-cover"});if("CASHX"===e)return(0,t.jsx)("img",{src:"/cashx-logo.png",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if("HBR"===e||e.startsWith("HB-"))return(0,t.jsx)("img",{src:"/hexbond-logo.jpg",alt:"",width:o,height:o,className:"inline-block shrink-0 rounded-full"});if(e.startsWith("HTT-")){let n=e.slice(4);return r.includes(n)?(0,t.jsx)("img",{src:`/htt-${n}-logo.png`,alt:"",width:o,height:o,className:"inline-block shrink-0"}):(0,t.jsx)("svg",{width:o,height:o,viewBox:"0 0 24 24","aria-hidden":!0,className:"inline-block shrink-0",children:(0,t.jsx)("path",{d:"M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z",fill:"none",stroke:"#71717a",strokeWidth:"2"})})}return null}])},640476,e=>{"use strict";let t=["0x4718CCe87Ca01fC5B5B3Aecb7b37df98B7D384F6","0xDBA19652f7Ed3f3AE6266c91669C6083ba8cE557","0xA6eDaa6155B5cbC47f7f54d2951645c13f6DfB04","0x050536Cc4a4f46d3bFeB8c8fED33A3E2ADe280D4"].map(e=>e.toLowerCase());function r(e){return!!e&&t.includes(e.toLowerCase())}let o=["0x4718CCe87Ca01fC5B5B3Aecb7b37df98B7D384F6","0xE2E5B7bDA48376bD5FbA0fdF2E6aFd7bf1918f84"].map(e=>e.toLowerCase()),n=["0x4718CCe87Ca01fC5B5B3Aecb7b37df98B7D384F6","0xE2E5B7bDA48376bD5FbA0fdF2E6aFd7bf1918f84","0x246B12491c3301476Da1CBAF6b71a1330180084d","0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","0x1f8285Df17810002d103328647BB8d10d5498299"].map(e=>e.toLowerCase());e.s(["isAdminWallet",0,r,"isHbmcWallet",0,function(e){return!!e&&(n.includes(e.toLowerCase())||r(e)||!!e&&o.includes(e.toLowerCase()))}])},12709,e=>{"use strict";function t(e=Date.now()){return Math.floor((e-15753312e5)/864e5)}e.s(["HEX_LAUNCH_SECONDS",0,0x5de5a580,"currentHexDay",0,t,"formatRedemption",0,function(e){return new Date(15753312e5+864e5*e).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"})},"redemptionDayOf",0,e=>e-1,"yearsUntil",0,function(e,r=Date.now()){return(e-t(r))/365.25}])},903700,183202,e=>{"use strict";var t=e.i(984106),r=e.i(414668),o=e.i(696205),n=e.i(371567);e.s(["hashMessage",0,function(e,a){let s,i;return(0,t.keccak256)((s="string"==typeof e?(0,n.stringToHex)(e):"string"==typeof e.raw?e.raw:(0,n.bytesToHex)(e.raw),i=(0,n.stringToHex)(`\x19Ethereum Signed Message:
${(0,o.size)(s)}`),(0,r.concat)([i,s])),a)}],903700);var a=e.i(698925),s=e.i(261297),i=e.i(144077),l=e.i(157445),c=e.i(137261);class u extends c.BaseError{constructor({domain:e}){super(`Invalid domain "${(0,l.stringify)(e)}".`,{metaMessages:["Must be a valid EIP-712 domain."]})}}class p extends c.BaseError{constructor({primaryType:e,types:t}){super(`Invalid primary type \`${e}\` must be one of \`${JSON.stringify(Object.keys(t))}\`.`,{docsPath:"/api/glossary/Errors#typeddatainvalidprimarytypeerror",metaMessages:["Check that the primary type is a key in `types`."]})}}class h extends c.BaseError{constructor({type:e}){super(`Struct type "${e}" is invalid.`,{metaMessages:["Struct type must not be a Solidity type."],name:"InvalidStructTypeError"})}}var d=e.i(64945),f=e.i(517402);function m({data:e,primaryType:r,types:o}){let s=function e({data:r,primaryType:o,types:s}){let i=[{type:"bytes32"}],l=[function({primaryType:e,types:r}){let o=(0,n.toHex)(function({primaryType:e,types:t}){let r="",o=function e({primaryType:t,types:r},o=new Set){let n=t.match(/^\w*/u),a=n?.[0];if(o.has(a)||void 0===r[a])return o;for(let t of(o.add(a),r[a]))e({primaryType:t.type,types:r},o);return o}({primaryType:e,types:t});for(let n of(o.delete(e),[e,...Array.from(o).sort()]))r+=`${n}(${t[n].map(({name:e,type:t})=>`${t} ${e}`).join(",")})`;return r}({primaryType:e,types:r}));return(0,t.keccak256)(o)}({primaryType:o,types:s})];for(let c of s[o]){let[o,u]=function r({types:o,name:s,type:i,value:l}){if(void 0!==o[i])return[{type:"bytes32"},(0,t.keccak256)(e({data:l,primaryType:i,types:o}))];if("bytes"===i)return[{type:"bytes32"},(0,t.keccak256)(l)];if("string"===i)return[{type:"bytes32"},(0,t.keccak256)((0,n.toHex)(l))];if(i.lastIndexOf("]")===i.length-1){let e=i.slice(0,i.lastIndexOf("[")),n=l.map(t=>r({name:s,type:e,types:o,value:t}));return[{type:"bytes32"},(0,t.keccak256)((0,a.encodeAbiParameters)(n.map(([e])=>e),n.map(([,e])=>e)))]}return[{type:i},l]}({types:s,name:c.name,type:c.type,value:r[c.name]});i.push(o),l.push(u)}return(0,a.encodeAbiParameters)(i,l)}({data:e,primaryType:r,types:o});return(0,t.keccak256)(s)}e.s(["hashTypedData",0,function(e){let{domain:a={},message:l,primaryType:c}=e,y={EIP712Domain:function({domain:e}){return["string"==typeof e?.name&&{name:"name",type:"string"},e?.version&&{name:"version",type:"string"},("number"==typeof e?.chainId||"bigint"==typeof e?.chainId)&&{name:"chainId",type:"uint256"},e?.verifyingContract&&{name:"verifyingContract",type:"address"},e?.salt&&{name:"salt",type:"bytes32"}].filter(Boolean)}({domain:a}),...e.types};!function(e){let{domain:t,message:r,primaryType:a,types:l}=e,c=(e,t)=>{for(let r of e){let{name:e,type:a}=r,u=t[e],p=a.match(f.integerRegex);if(p&&("number"==typeof u||"bigint"==typeof u)){let[e,t,r]=p;(0,n.numberToHex)(u,{signed:"int"===t,size:Number.parseInt(r,10)/8})}if("address"===a&&"string"==typeof u&&!(0,d.isAddress)(u))throw new i.InvalidAddressError({address:u});let m=a.match(f.bytesRegex);if(m){let[e,t]=m;if(t&&(0,o.size)(u)!==Number.parseInt(t,10))throw new s.BytesSizeMismatchError({expectedSize:Number.parseInt(t,10),givenSize:(0,o.size)(u)})}let y=l[a];y&&(function(e){if("address"===e||"bool"===e||"string"===e||e.startsWith("bytes")||e.startsWith("uint")||e.startsWith("int"))throw new h({type:e})}(a),c(y,u))}};if(l.EIP712Domain&&t){if("object"!=typeof t)throw new u({domain:t});c(l.EIP712Domain,t)}if("EIP712Domain"!==a)if(l[a])c(l[a],r);else throw new p({primaryType:a,types:l})}({domain:a,message:l,primaryType:c,types:y});let w=["0x1901"];return a&&w.push(function({domain:e,types:t}){return m({data:e,primaryType:"EIP712Domain",types:t})}({domain:a,types:y})),"EIP712Domain"!==c&&w.push(m({data:l,primaryType:c,types:y})),(0,t.keccak256)((0,r.concat)(w))}],183202)},338576,e=>{"use strict";var t=e.i(428980);async function r(e,{address:o,blockHash:n,blockNumber:a,blockTag:s="latest",requireCanonical:i}){let l=(0,t.formatBlockParameter)({blockHash:n,blockNumber:a,blockTag:s,requireCanonical:i}),c=await e.request({method:"eth_getCode",params:[o,l]},{dedupe:"bigint"==typeof a||void 0!==n});if("0x"!==c)return c}e.s(["getCode",0,r])},558777,380947,e=>{"use strict";var t=e.i(432753),r=e.i(392324),o=e.i(261297),n=e.i(349944),a=e.i(446766),s=e.i(395428),i=e.i(981845);function l(e){let{abi:t,data:r}=e,l=(0,n.slice)(r,0,4),c=t.find(e=>"function"===e.type&&l===(0,a.toFunctionSelector)((0,i.formatAbiItem)(e)));if(!c)throw new o.AbiFunctionSignatureNotFoundError(l,{docsPath:"/docs/contract/decodeFunctionData"});return{functionName:c.name,args:"inputs"in c&&c.inputs&&c.inputs.length>0?(0,s.decodeAbiParameters)(c.inputs,(0,n.slice)(r,4)):void 0}}e.s(["decodeFunctionData",0,l],380947);var c=e.i(414668),u=e.i(698925),p=e.i(66087);let h="/docs/contract/encodeErrorResult";function d(e){let{abi:t,errorName:r,args:n}=e,s=t[0];if(r){let e=(0,p.getAbiItem)({abi:t,args:n,name:r});if(!e)throw new o.AbiErrorNotFoundError(r,{docsPath:h});s=e}if("error"!==s.type)throw new o.AbiErrorNotFoundError(void 0,{docsPath:h});let l=(0,i.formatAbiItem)(s),d=(0,a.toFunctionSelector)(l),f="0x";if(n&&n.length>0){if(!s.inputs)throw new o.AbiErrorInputsNotFoundError(s.name,{docsPath:h});f=(0,u.encodeAbiParameters)(s.inputs,n)}return(0,c.concatHex)([d,f])}let f="/docs/contract/encodeFunctionResult",m="x-batch-gateway:true";async function y(e){let{data:n,ccipRequest:a}=e,{args:[s]}=l({abi:t.batchGatewayAbi,data:n}),i=[],c=[];return await Promise.all(s.map(async(e,o)=>{try{c[o]=e.urls.includes(m)?await y({data:e.data,ccipRequest:a}):await a(e),i[o]=!1}catch(e){var n;i[o]=!0,c[o]="HttpRequestError"===(n=e).name&&n.status?d({abi:t.batchGatewayAbi,errorName:"HttpError",args:[n.status,n.shortMessage]}):d({abi:[r.solidityError],errorName:"Error",args:["shortMessage"in n?n.shortMessage:n.message]})}})),function(e){let{abi:t,functionName:r,result:n}=e,a=t[0];if(r){let e=(0,p.getAbiItem)({abi:t,name:r});if(!e)throw new o.AbiFunctionNotFoundError(r,{docsPath:f});a=e}if("function"!==a.type)throw new o.AbiFunctionNotFoundError(void 0,{docsPath:f});if(!a.outputs)throw new o.AbiFunctionOutputsNotFoundError(a.name,{docsPath:f});let s=(()=>{if(0===a.outputs.length)return[];if(1===a.outputs.length)return[n];if(Array.isArray(n))return n;throw new o.InvalidArrayError(n)})();return(0,u.encodeAbiParameters)(a.outputs,s)}({abi:t.batchGatewayAbi,functionName:"query",result:[i,c]})}e.s(["localBatchGatewayRequest",0,y,"localBatchGatewayUrl",0,m],558777)},657674,e=>{"use strict";var t=e.i(985539);function r(e,o={}){let n=function(e,t={}){try{return e.getClient(t)}catch{return}}(e,o);return n?.extend(t.publicActions)}var o=e.i(250274),n=e.i(522316);e.s(["usePublicClient",0,function(e={}){let t=(0,n.useConfig)(e);return(0,o.useSyncExternalStoreWithSelector)(e=>(function(e,t){let{onChange:o}=t;return e.subscribe(()=>r(e),o,{equalityFn:(e,t)=>e?.uid===t?.uid})})(t,{onChange:e}),()=>r(t,e),()=>r(t,e),e=>e,(e,t)=>e?.uid===t?.uid)}],657674)},285672,549250,e=>{"use strict";var t=e.i(956683),r=e.i(575526),o=e.i(439651),n=e.i(977867);let a=(e,t)=>void 0===e?void 0:Number((0,n.formatUnits)(e,t));function s(e,t){let r=void 0===e.priceHex?void 0:e.amount*e.priceHex,o=void 0===t.priceHex?void 0:t.amount*t.priceHex;if(void 0!==r&&void 0!==o)return r+o;let n=r??o;return void 0===n?void 0:2*n}function i(e,t){if(void 0===e||void 0===t||!(t>0)||!Number.isFinite(e))return;let r=e/t*100;return Number.isFinite(r)?r:void 0}function l(e,t){if(!e)return;let r=e.address.toLowerCase();return r===o.HEX_ADDRESS.toLowerCase()?1:r===o.WPLS_ADDRESS.toLowerCase()?t.pls:r===o.ADDRESSES.actrx.toLowerCase()?t.hbr:(0,o.isConfigured)(o.ADDRESSES.hbrp)&&r===o.ADDRESSES.hbrp.toLowerCase()?t.hbrp:r===o.ADDRESSES.hbmc.toLowerCase()||r===o.ADDRESSES.hbmcHbr.toLowerCase()||r===o.ADDRESSES.hbmcHbrp.toLowerCase()||r===o.ADDRESSES.hbmcWpls.toLowerCase()?1:void 0}function c(e){let{lp:t,lpSupply:r,reserves:o,token0:n,token1:i,prices:c}=e;if(void 0===t||void 0===r||0n===r||!o)return;if(0n===t)return 0;let u=a(o[0],n?.decimals??18),p=a(o[1],i?.decimals??18);if(void 0===u||void 0===p)return;let h=s({amount:u,priceHex:l(n,c)},{amount:p,priceHex:l(i,c)});if(void 0!==h)return h*(Number(t)/Number(r))}e.s(["farmApr",0,i,"fmtApr",0,function(e){return void 0===e?"—":e>=1e6?`${(e/1e6).toFixed(1)}M%`:e>=1e4?`${Math.round(e/1e3)}K%`:e>=100?`${Math.round(e)}%`:`${e.toFixed(1)}%`},"pairValueHex",0,s,"toNum",0,a],549250),e.s(["farmAprOf",0,function(e){let{emissionsPerYear:t,allocPoint:r,totalAllocPoint:o,totalStaked:n,lpSupply:s,reserves:l,token0:u,token1:p,prices:h}=e,d="rewardPriceHex"in e?e.rewardPriceHex:h.hbr;if(void 0===t||void 0===r||void 0===o||0n===o||void 0===n||void 0===s||0n===s||!l||void 0===d)return;let f=a(t*r/o,18);if(void 0!==f)return i(f*d,c({lp:n,lpSupply:s,reserves:l,token0:u,token1:p,prices:h}))},"lpValueHexOf",0,c,"useHexPrices",0,function(){let e=(0,o.isConfigured)(o.ADDRESSES.hbrp),n=e=>({address:o.PULSEX_V2_ROUTER,abi:o.ROUTER_ABI,functionName:"getAmountsOut",args:[(0,t.parseUnits)("1",18),e]}),{data:s}=(0,r.useReadContracts)({contracts:[n([o.ADDRESSES.actrx,o.HEX_ADDRESS]),n([o.ADDRESSES.actrx,o.WPLS_ADDRESS,o.HEX_ADDRESS]),n([o.WPLS_ADDRESS,o.HEX_ADDRESS]),...e?[n([o.ADDRESSES.hbrp,o.ADDRESSES.actrx,o.HEX_ADDRESS]),n([o.ADDRESSES.hbrp,o.WPLS_ADDRESS,o.HEX_ADDRESS])]:[]],query:{refetchInterval:3e4}}),i=e=>{let t=s?.[e]?.result;if(!t||0===t.length)return;let r=a(t[t.length-1],o.HEX_DECIMALS);return void 0!==r&&r>0?r:void 0},l=(e,t)=>void 0!==e&&void 0!==t?Math.max(e,t):e??t;return{hbr:l(i(0),i(1)),pls:i(2),hbrp:e?l(i(3),i(4)):void 0}},"useHexUsd",0,function(){let{data:e}=(0,r.useReadContracts)({contracts:[{address:o.PULSEX_V2_ROUTER,abi:o.ROUTER_ABI,functionName:"getAmountsOut",args:[(0,t.parseUnits)("1",o.HEX_DECIMALS),[o.HEX_ADDRESS,o.WPLS_ADDRESS,o.DAI_ADDRESS]]}],query:{refetchInterval:6e4}}),n=e?.[0]?.result;if(!n||0===n.length)return;let s=a(n[n.length-1],18);return void 0!==s&&s>0?s:void 0}],285672)},991963,e=>{"use strict";var t=e.i(285672),r=e.i(549250);e.s(["useUsd",0,function(){let e=(0,t.useHexPrices)(),o=(0,t.useHexUsd)(),n=void 0!==e.hbr&&void 0!==o?e.hbr*o:void 0,a=void 0!==e.hbrp&&void 0!==o?e.hbrp*o:void 0,s=void 0!==e.pls&&void 0!==o?e.pls*o:void 0,i=t=>void 0===t||void 0===e.pls||0===e.pls?void 0:t/e.pls,l=i(e.hbr),c=i(e.hbrp),u=(e,t,o)=>{if(void 0===e||void 0===o)return;let n=(0,r.toNum)(e,t);return void 0===n?void 0:n*o};return{hexUsd:o,hbrUsd:n,hbrpUsd:a,plsUsd:s,pls:e=>u(e,18,s),hbr:e=>u(e,18,n),hbrp:e=>u(e,18,a),hbrInPls:e=>u(e,18,l),hbrpInPls:e=>u(e,18,c),hex:e=>u(e,8,o),fromHex:e=>void 0===e||void 0===o?void 0:e*o}}])},767952,(e,t,r)=>{t.exports=e.r(462727)},211908,e=>{"use strict";var t=e.i(254097),r=e.i(664229),o=e.i(786127),n=e.i(894033);function a(e){return!!("code"in e&&"number"==typeof e.code&&(e.code===r.TransactionRejectedRpcError.code||e.code===r.UserRejectedRequestError.code||e.code===r.WalletConnectSessionSettlementError.code||t.ExecutionRevertedError.nodeMessage.test(e.message)||5e3===e.code))}e.s(["fallback",0,function(e,t={}){let{key:r="fallback",name:s="Fallback",rank:i=!1,shouldThrow:l=a,retryCount:c,retryDelay:u}=t;return({chain:t,pollingInterval:a=4e3,timeout:p,...h})=>{let d=e,f=()=>{},m=(0,n.createTransport)({key:r,name:s,async request({method:e,params:r}){let o,n=async(a=0)=>{let s=d[a]({...h,chain:t,retryCount:0,timeout:p});try{let t=await s.request({method:e,params:r});return f({method:e,params:r,response:t,transport:s,status:"success"}),t}catch(i){if(f({error:i,method:e,params:r,transport:s,status:"error"}),l(i)||a===d.length-1||!(o??=d.slice(a+1).some(r=>{let{include:o,exclude:n}=r({chain:t}).config.methods||{};return o?o.includes(e):!n||!n.includes(e)})))throw i;return n(a+1)}};return n()},retryCount:c,retryDelay:u,type:"fallback"},{onResponse:e=>f=e,transports:d.map(e=>e({chain:t,retryCount:0}))});if(i){let e="object"==typeof i?i:{};!function({chain:e,interval:t=4e3,onTransports:r,ping:n,sampleCount:a=10,timeout:s=1e3,transports:i,weights:l={}}){let{stability:c=.7,latency:u=.3}=l,p=[],h=async()=>{let l=await Promise.all(i.map(async t=>{let r,o,a=t({chain:e,retryCount:0,timeout:s}),i=Date.now();try{await (n?n({transport:a}):a.request({method:"net_listening"})),o=1}catch{o=0}finally{r=Date.now()}return{latency:r-i,success:o}}));p.push(l),p.length>a&&p.shift();let d=Math.max(...p.map(e=>Math.max(...e.map(({latency:e})=>e))));r(i.map((e,t)=>{let r=p.map(e=>e[t].latency),o=r.reduce((e,t)=>e+t,0)/r.length,n=p.map(e=>e[t].success),a=n.reduce((e,t)=>e+t,0)/n.length;return 0===a?[0,t]:[u*(1-o/d)+c*a,t]}).sort((e,t)=>t[0]-e[0]).map(([,e])=>i[e])),await (0,o.wait)(t),h()};h()}({chain:t,interval:e.interval??a,onTransports:e=>d=e,ping:e.ping,sampleCount:e.sampleCount,timeout:e.timeout,transports:d,weights:e.weights})}return m}}])},50932,e=>{"use strict";var t=function(e,r){return(t=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])})(e,r)};function r(e,r){if("function"!=typeof r&&null!==r)throw TypeError("Class extends value "+String(r)+" is not a constructor or null");function o(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(o.prototype=r.prototype,new o)}var o=function(){return(o=Object.assign||function(e){for(var t,r=1,o=arguments.length;r<o;r++)for(var n in t=arguments[r])Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);return e}).apply(this,arguments)};function n(e,t){var r={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&0>t.indexOf(o)&&(r[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols)for(var n=0,o=Object.getOwnPropertySymbols(e);n<o.length;n++)0>t.indexOf(o[n])&&Object.prototype.propertyIsEnumerable.call(e,o[n])&&(r[o[n]]=e[o[n]]);return r}function a(e,t,r,o){var n,a=arguments.length,s=a<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,r,o);else for(var i=e.length-1;i>=0;i--)(n=e[i])&&(s=(a<3?n(s):a>3?n(t,r,s):n(t,r))||s);return a>3&&s&&Object.defineProperty(t,r,s),s}function s(e,t){return function(r,o){t(r,o,e)}}function i(e,t,r,o,n,a){function s(e){if(void 0!==e&&"function"!=typeof e)throw TypeError("Function expected");return e}for(var i,l=o.kind,c="getter"===l?"get":"setter"===l?"set":"value",u=!t&&e?o.static?e:e.prototype:null,p=t||(u?Object.getOwnPropertyDescriptor(u,o.name):{}),h=!1,d=r.length-1;d>=0;d--){var f={};for(var m in o)f[m]="access"===m?{}:o[m];for(var m in o.access)f.access[m]=o.access[m];f.addInitializer=function(e){if(h)throw TypeError("Cannot add initializers after decoration has completed");a.push(s(e||null))};var y=(0,r[d])("accessor"===l?{get:p.get,set:p.set}:p[c],f);if("accessor"===l){if(void 0===y)continue;if(null===y||"object"!=typeof y)throw TypeError("Object expected");(i=s(y.get))&&(p.get=i),(i=s(y.set))&&(p.set=i),(i=s(y.init))&&n.unshift(i)}else(i=s(y))&&("field"===l?n.unshift(i):p[c]=i)}u&&Object.defineProperty(u,o.name,p),h=!0}function l(e,t,r){for(var o=arguments.length>2,n=0;n<t.length;n++)r=o?t[n].call(e,r):t[n].call(e);return o?r:void 0}function c(e){return"symbol"==typeof e?e:"".concat(e)}function u(e,t,r){return"symbol"==typeof t&&(t=t.description?"[".concat(t.description,"]"):""),Object.defineProperty(e,"name",{configurable:!0,value:r?"".concat(r," ",t):t})}function p(e,t){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(e,t)}function h(e,t,r,o){return new(r||(r=Promise))(function(n,a){function s(e){try{l(o.next(e))}catch(e){a(e)}}function i(e){try{l(o.throw(e))}catch(e){a(e)}}function l(e){var t;e.done?n(e.value):((t=e.value)instanceof r?t:new r(function(e){e(t)})).then(s,i)}l((o=o.apply(e,t||[])).next())})}function d(e,t){var r,o,n,a={label:0,sent:function(){if(1&n[0])throw n[1];return n[1]},trys:[],ops:[]},s=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return s.next=i(0),s.throw=i(1),s.return=i(2),"function"==typeof Symbol&&(s[Symbol.iterator]=function(){return this}),s;function i(i){return function(l){var c=[i,l];if(r)throw TypeError("Generator is already executing.");for(;s&&(s=0,c[0]&&(a=0)),a;)try{if(r=1,o&&(n=2&c[0]?o.return:c[0]?o.throw||((n=o.return)&&n.call(o),0):o.next)&&!(n=n.call(o,c[1])).done)return n;switch(o=0,n&&(c=[2&c[0],n.value]),c[0]){case 0:case 1:n=c;break;case 4:return a.label++,{value:c[1],done:!1};case 5:a.label++,o=c[1],c=[0];continue;case 7:c=a.ops.pop(),a.trys.pop();continue;default:if(!(n=(n=a.trys).length>0&&n[n.length-1])&&(6===c[0]||2===c[0])){a=0;continue}if(3===c[0]&&(!n||c[1]>n[0]&&c[1]<n[3])){a.label=c[1];break}if(6===c[0]&&a.label<n[1]){a.label=n[1],n=c;break}if(n&&a.label<n[2]){a.label=n[2],a.ops.push(c);break}n[2]&&a.ops.pop(),a.trys.pop();continue}c=t.call(e,a)}catch(e){c=[6,e],o=0}finally{r=n=0}if(5&c[0])throw c[1];return{value:c[0]?c[1]:void 0,done:!0}}}}var f=Object.create?function(e,t,r,o){void 0===o&&(o=r);var n=Object.getOwnPropertyDescriptor(t,r);(!n||("get"in n?!t.__esModule:n.writable||n.configurable))&&(n={enumerable:!0,get:function(){return t[r]}}),Object.defineProperty(e,o,n)}:function(e,t,r,o){void 0===o&&(o=r),e[o]=t[r]};function m(e,t){for(var r in e)"default"===r||Object.prototype.hasOwnProperty.call(t,r)||f(t,e,r)}function y(e){var t="function"==typeof Symbol&&Symbol.iterator,r=t&&e[t],o=0;if(r)return r.call(e);if(e&&"number"==typeof e.length)return{next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}function w(e,t){var r="function"==typeof Symbol&&e[Symbol.iterator];if(!r)return e;var o,n,a=r.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=a.next()).done;)s.push(o.value)}catch(e){n={error:e}}finally{try{o&&!o.done&&(r=a.return)&&r.call(a)}finally{if(n)throw n.error}}return s}function b(){for(var e=[],t=0;t<arguments.length;t++)e=e.concat(w(arguments[t]));return e}function g(){for(var e=0,t=0,r=arguments.length;t<r;t++)e+=arguments[t].length;for(var o=Array(e),n=0,t=0;t<r;t++)for(var a=arguments[t],s=0,i=a.length;s<i;s++,n++)o[n]=a[s];return o}function v(e,t,r){if(r||2==arguments.length)for(var o,n=0,a=t.length;n<a;n++)!o&&n in t||(o||(o=Array.prototype.slice.call(t,0,n)),o[n]=t[n]);return e.concat(o||Array.prototype.slice.call(t))}function k(e){return this instanceof k?(this.v=e,this):new k(e)}function x(e,t,r){if(!Symbol.asyncIterator)throw TypeError("Symbol.asyncIterator is not defined.");var o,n=r.apply(e,t||[]),a=[];return o=Object.create(("function"==typeof AsyncIterator?AsyncIterator:Object).prototype),s("next"),s("throw"),s("return",function(e){return function(t){return Promise.resolve(t).then(e,c)}}),o[Symbol.asyncIterator]=function(){return this},o;function s(e,t){n[e]&&(o[e]=function(t){return new Promise(function(r,o){a.push([e,t,r,o])>1||i(e,t)})},t&&(o[e]=t(o[e])))}function i(e,t){try{var r;(r=n[e](t)).value instanceof k?Promise.resolve(r.value.v).then(l,c):u(a[0][2],r)}catch(e){u(a[0][3],e)}}function l(e){i("next",e)}function c(e){i("throw",e)}function u(e,t){e(t),a.shift(),a.length&&i(a[0][0],a[0][1])}}function _(e){var t,r;return t={},o("next"),o("throw",function(e){throw e}),o("return"),t[Symbol.iterator]=function(){return this},t;function o(o,n){t[o]=e[o]?function(t){return(r=!r)?{value:k(e[o](t)),done:!1}:n?n(t):t}:n}}function C(e){if(!Symbol.asyncIterator)throw TypeError("Symbol.asyncIterator is not defined.");var t,r=e[Symbol.asyncIterator];return r?r.call(e):(e=y(e),t={},o("next"),o("throw"),o("return"),t[Symbol.asyncIterator]=function(){return this},t);function o(r){t[r]=e[r]&&function(t){return new Promise(function(o,n){var a,s,i;a=o,s=n,i=(t=e[r](t)).done,Promise.resolve(t.value).then(function(e){a({value:e,done:i})},s)})}}}function j(e,t){return Object.defineProperty?Object.defineProperty(e,"raw",{value:t}):e.raw=t,e}var P=Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:!0,value:t})}:function(e,t){e.default=t},W=function(e){return(W=Object.getOwnPropertyNames||function(e){var t=[];for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[t.length]=r);return t})(e)};function S(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r=W(e),o=0;o<r.length;o++)"default"!==r[o]&&f(t,e,r[o]);return P(t,e),t}function E(e){return e&&e.__esModule?e:{default:e}}function O(e,t,r,o){if("a"===r&&!o)throw TypeError("Private accessor was defined without a getter");if("function"==typeof t?e!==t||!o:!t.has(e))throw TypeError("Cannot read private member from an object whose class did not declare it");return"m"===r?o:"a"===r?o.call(e):o?o.value:t.get(e)}function R(e,t,r,o,n){if("m"===o)throw TypeError("Private method is not writable");if("a"===o&&!n)throw TypeError("Private accessor was defined without a setter");if("function"==typeof t?e!==t||!n:!t.has(e))throw TypeError("Cannot write private member to an object whose class did not declare it");return"a"===o?n.call(e,r):n?n.value=r:t.set(e,r),r}function I(e,t){if(null===t||"object"!=typeof t&&"function"!=typeof t)throw TypeError("Cannot use 'in' operator on non-object");return"function"==typeof e?t===e:e.has(t)}function A(e,t,r){if(null!=t){var o,n;if("object"!=typeof t&&"function"!=typeof t)throw TypeError("Object expected.");if(r){if(!Symbol.asyncDispose)throw TypeError("Symbol.asyncDispose is not defined.");o=t[Symbol.asyncDispose]}if(void 0===o){if(!Symbol.dispose)throw TypeError("Symbol.dispose is not defined.");o=t[Symbol.dispose],r&&(n=o)}if("function"!=typeof o)throw TypeError("Object not disposable.");n&&(o=function(){try{n.call(this)}catch(e){return Promise.reject(e)}}),e.stack.push({value:t,dispose:o,async:r})}else r&&e.stack.push({async:!0});return t}var T="function"==typeof SuppressedError?SuppressedError:function(e,t,r){var o=Error(r);return o.name="SuppressedError",o.error=e,o.suppressed=t,o};function q(e){function t(t){e.error=e.hasError?new T(t,e.error,"An error was suppressed during disposal."):t,e.hasError=!0}var r,o=0;return function n(){for(;r=e.stack.pop();)try{if(!r.async&&1===o)return o=0,e.stack.push(r),Promise.resolve().then(n);if(r.dispose){var a=r.dispose.call(r.value);if(r.async)return o|=2,Promise.resolve(a).then(n,function(e){return t(e),n()})}else o|=1}catch(e){t(e)}if(1===o)return e.hasError?Promise.reject(e.error):Promise.resolve();if(e.hasError)throw e.error}()}function N(e,t){return"string"==typeof e&&/^\.\.?\//.test(e)?e.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i,function(e,r,o,n,a){return r?t?".jsx":".js":!o||n&&a?o+n+"."+a.toLowerCase()+"js":e}):e}let B={__extends:r,__assign:o,__rest:n,__decorate:a,__param:s,__esDecorate:i,__runInitializers:l,__propKey:c,__setFunctionName:u,__metadata:p,__awaiter:h,__generator:d,__createBinding:f,__exportStar:m,__values:y,__read:w,__spread:b,__spreadArrays:g,__spreadArray:v,__await:k,__asyncGenerator:x,__asyncDelegator:_,__asyncValues:C,__makeTemplateObject:j,__importStar:S,__importDefault:E,__classPrivateFieldGet:O,__classPrivateFieldSet:R,__classPrivateFieldIn:I,__addDisposableResource:A,__disposeResources:q,__rewriteRelativeImportExtension:N};e.s(["__addDisposableResource",0,A,"__assign",()=>o,"__asyncDelegator",0,_,"__asyncGenerator",0,x,"__asyncValues",0,C,"__await",0,k,"__awaiter",0,h,"__classPrivateFieldGet",0,O,"__classPrivateFieldIn",0,I,"__classPrivateFieldSet",0,R,"__createBinding",0,f,"__decorate",0,a,"__disposeResources",0,q,"__esDecorate",0,i,"__exportStar",0,m,"__extends",0,r,"__generator",0,d,"__importDefault",0,E,"__importStar",0,S,"__makeTemplateObject",0,j,"__metadata",0,p,"__param",0,s,"__propKey",0,c,"__read",0,w,"__rest",0,n,"__rewriteRelativeImportExtension",0,N,"__runInitializers",0,l,"__setFunctionName",0,u,"__spread",0,b,"__spreadArray",0,v,"__spreadArrays",0,g,"__values",0,y,"default",0,B])},697349,(e,t,r)=>{"use strict";var o=Object.prototype.hasOwnProperty,n="~";function a(){}function s(e,t,r){this.fn=e,this.context=t,this.once=r||!1}function i(e,t,r,o,a){if("function"!=typeof r)throw TypeError("The listener must be a function");var i=new s(r,o||e,a),l=n?n+t:t;return e._events[l]?e._events[l].fn?e._events[l]=[e._events[l],i]:e._events[l].push(i):(e._events[l]=i,e._eventsCount++),e}function l(e,t){0==--e._eventsCount?e._events=new a:delete e._events[t]}function c(){this._events=new a,this._eventsCount=0}Object.create&&(a.prototype=Object.create(null),new a().__proto__||(n=!1)),c.prototype.eventNames=function(){var e,t,r=[];if(0===this._eventsCount)return r;for(t in e=this._events)o.call(e,t)&&r.push(n?t.slice(1):t);return Object.getOwnPropertySymbols?r.concat(Object.getOwnPropertySymbols(e)):r},c.prototype.listeners=function(e){var t=n?n+e:e,r=this._events[t];if(!r)return[];if(r.fn)return[r.fn];for(var o=0,a=r.length,s=Array(a);o<a;o++)s[o]=r[o].fn;return s},c.prototype.listenerCount=function(e){var t=n?n+e:e,r=this._events[t];return r?r.fn?1:r.length:0},c.prototype.emit=function(e,t,r,o,a,s){var i=n?n+e:e;if(!this._events[i])return!1;var l,c,u=this._events[i],p=arguments.length;if(u.fn){switch(u.once&&this.removeListener(e,u.fn,void 0,!0),p){case 1:return u.fn.call(u.context),!0;case 2:return u.fn.call(u.context,t),!0;case 3:return u.fn.call(u.context,t,r),!0;case 4:return u.fn.call(u.context,t,r,o),!0;case 5:return u.fn.call(u.context,t,r,o,a),!0;case 6:return u.fn.call(u.context,t,r,o,a,s),!0}for(c=1,l=Array(p-1);c<p;c++)l[c-1]=arguments[c];u.fn.apply(u.context,l)}else{var h,d=u.length;for(c=0;c<d;c++)switch(u[c].once&&this.removeListener(e,u[c].fn,void 0,!0),p){case 1:u[c].fn.call(u[c].context);break;case 2:u[c].fn.call(u[c].context,t);break;case 3:u[c].fn.call(u[c].context,t,r);break;case 4:u[c].fn.call(u[c].context,t,r,o);break;default:if(!l)for(h=1,l=Array(p-1);h<p;h++)l[h-1]=arguments[h];u[c].fn.apply(u[c].context,l)}}return!0},c.prototype.on=function(e,t,r){return i(this,e,t,r,!1)},c.prototype.once=function(e,t,r){return i(this,e,t,r,!0)},c.prototype.removeListener=function(e,t,r,o){var a=n?n+e:e;if(!this._events[a])return this;if(!t)return l(this,a),this;var s=this._events[a];if(s.fn)s.fn!==t||o&&!s.once||r&&s.context!==r||l(this,a);else{for(var i=0,c=[],u=s.length;i<u;i++)(s[i].fn!==t||o&&!s[i].once||r&&s[i].context!==r)&&c.push(s[i]);c.length?this._events[a]=1===c.length?c[0]:c:l(this,a)}return this},c.prototype.removeAllListeners=function(e){var t;return e?(t=n?n+e:e,this._events[t]&&l(this,t)):(this._events=new a,this._eventsCount=0),this},c.prototype.off=c.prototype.removeListener,c.prototype.addListener=c.prototype.on,c.prefixed=n,c.EventEmitter=c,t.exports=c},488947,e=>{"use strict";var t=e.i(565220);e.s(["withTimeout",0,function(e,{errorInstance:r=Error("timed out"),timeout:o,signal:n}){return new Promise((a,s)=>{(async()=>{let i,l=new AbortController;try{o>0&&(i=setTimeout(()=>{n?l.abort():s(r)},o)),a(await e({signal:l?.signal||null}))}catch(e){if(l?.signal.aborted&&(0,t.isAbortError)(e))return void s(r);s(e)}finally{clearTimeout(i)}})()})}])},327326,e=>{"use strict";var t=e.i(137261);class r extends t.BaseError{constructor(){super("No URL was provided to the Transport. Please provide a valid RPC URL to the Transport.",{docsPath:"/docs/clients/intro",name:"UrlRequiredError"})}}e.s(["UrlRequiredError",0,r])},18346,60354,e=>{"use strict";var t=e.i(740763),r=e.i(327326),o=e.i(176293),n=e.i(565220),a=e.i(488947),s=e.i(157445);let i={current:0,take(){return this.current++},reset(){this.current=0}};function l(e,r={}){let{url:o,headers:u}=function(e){try{let t=new URL(e),r=(()=>{if(t.username){let e=`${decodeURIComponent(t.username)}:${decodeURIComponent(t.password)}`;return t.username="",t.password="",{url:t.toString(),headers:{Authorization:`Basic ${btoa(e)}`}}}})();return{url:t.toString(),...r}}catch{return{url:e}}}(e);return{async request(e){let{body:l,fetchFn:p=r.fetchFn??fetch,maxResponseBodySize:h=r.maxResponseBodySize??0xa00000,onRequest:d=r.onRequest,onResponse:f=r.onResponse,timeout:m=r.timeout??1e4}=e,y={...r.fetchOptions??{},...e.fetchOptions??{}},{headers:w,method:b,signal:g}=y;try{let e,r=await (0,a.withTimeout)(async({signal:e})=>{let t={...y,body:Array.isArray(l)?(0,s.stringify)(l.map(e=>({jsonrpc:"2.0",id:e.id??i.take(),...e}))):(0,s.stringify)({jsonrpc:"2.0",id:l.id??i.take(),...l}),headers:{...u,"Content-Type":"application/json",...w},method:b||"POST",signal:g||(m>0?e:null)},r=new Request(o,t),n=await d?.(r,t)??{...t,url:o};return await p(n.url??o,n)},{errorInstance:new t.TimeoutError({body:l,url:o}),timeout:m,signal:!0});f&&await f(r);let n=await c(r,{maxResponseBodySize:h});if(r.headers.get("Content-Type")?.startsWith("application/json"))e=JSON.parse(n);else{e=n;try{e=JSON.parse(e||"{}")}catch(t){if(r.ok)throw t;e={error:e}}}if(!r.ok){if("number"==typeof e.error?.code&&"string"==typeof e.error?.message)return e;throw new t.HttpRequestError({body:l,details:(0,s.stringify)(e.error)||r.statusText,headers:r.headers,status:r.status,url:o})}return e}catch(e){if(g?.aborted)throw(0,n.getAbortError)(g);if((0,n.isAbortError)(e)||e instanceof t.HttpRequestError||e instanceof t.ResponseBodyTooLargeError||e instanceof t.TimeoutError)throw e;throw new t.HttpRequestError({body:l,cause:e,url:o})}}}}async function c(e,{maxResponseBodySize:r}){if(!1===r)return e.text();let o=e.headers.get("Content-Length");if(o){let e=Number(o);if(e>r)throw new t.ResponseBodyTooLargeError({maxSize:r,size:e})}if(!e.body){let o=await e.text(),n=new TextEncoder().encode(o).length;if(n>r)throw new t.ResponseBodyTooLargeError({maxSize:r,size:n});return o}let n=e.body.getReader(),a=new TextDecoder,s="",i=0;try{for(;;){let{done:e,value:o}=await n.read();if(e)break;if((i+=o.byteLength)>r)throw await n.cancel(),new t.ResponseBodyTooLargeError({maxSize:r,size:i});s+=a.decode(o,{stream:!0})}return s+=a.decode()}finally{n.releaseLock()}}e.s(["getHttpRpcClient",0,l],60354);var u=e.i(894033);let p=0,h=new WeakMap;e.s(["http",0,function(e,n={}){let{batch:a,fetchFn:s,fetchOptions:i,key:c="http",maxResponseBodySize:d,methods:f,name:m="HTTP JSON-RPC",onFetchRequest:y,onFetchResponse:w,retryDelay:b,raw:g}=n;return({chain:v,retryCount:k,timeout:x})=>{let{batchSize:_=1e3,wait:C=0}="object"==typeof a?a:{},j=n.retryCount??k,P=x??n.timeout??1e4,W=e||v?.rpcUrls.default.http[0];if(!W)throw new r.UrlRequiredError;let S=l(W,{fetchFn:s,fetchOptions:i,maxResponseBodySize:d,onRequest:y,onResponse:w,timeout:P});return(0,u.createTransport)({key:c,methods:f,name:m,async request({method:e,params:r},n){let s={method:e,params:r},i=n?.signal?{signal:n.signal}:void 0,{schedule:l}=(0,o.createBatchScheduler)({id:`${W}.${function(e){if(!e)return"default";let t=h.get(e);if(void 0!==t)return t;let r=p++;return h.set(e,r),r}(n?.signal)}`,wait:C,shouldSplitBatch:e=>e.length>_,fn:e=>S.request({body:e,fetchOptions:i}),sort:(e,t)=>e.id-t.id}),c=async e=>a?l(e):[await S.request({body:e,fetchOptions:i})],[{error:u,result:d}]=await c(s);if(g)return{error:u,result:d};if(u)throw new t.RpcRequestError({body:s,error:u,url:W});return d},retryCount:j,retryDelay:b,timeout:P,type:"http"},{fetchOptions:i,url:W})}}],18346)},575248,338147,e=>{"use strict";var t=e.i(697349);t.default,e.s([],575248),e.s(["EventEmitter",()=>t.default],338147)},662585,e=>{"use strict";let t=(0,e.i(350156).defineChain)({id:1,name:"Ethereum",nativeCurrency:{name:"Ether",symbol:"ETH",decimals:18},blockTime:12e3,rpcUrls:{default:{http:["https://ethereum.reth.rs/rpc"]}},blockExplorers:{default:{name:"Etherscan",url:"https://etherscan.io",apiUrl:"https://api.etherscan.io/api"}},contracts:{ensUniversalResolver:{address:"0xeeeeeeee14d718c2b47d9923deab1335e144eeee",blockCreated:0x16041f6},multicall3:{address:"0xca11bde05977b3631167028862be2a173976ca11",blockCreated:0xdb04c1}}});e.s(["mainnet",0,t])},276895,e=>{"use strict";var t=`{
  "connect_wallet": {
    "label": "Connect Wallet",
    "wrong_network": {
      "label": "Wrong network"
    }
  },

  "intro": {
    "title": "What is a Wallet?",
    "description": "A wallet is used to send, receive, store, and display digital assets. It's also a new way to log in, without needing to create new accounts and passwords on every website.",
    "digital_asset": {
      "title": "A Home for your Digital Assets",
      "description": "Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs."
    },
    "login": {
      "title": "A New Way to Log In",
      "description": "Instead of creating new accounts and passwords on every website, just connect your wallet."
    },
    "get": {
      "label": "Get a Wallet"
    },
    "learn_more": {
      "label": "Learn More"
    }
  },

  "sign_in": {
    "label": "Verify your account",
    "description": "To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.",
    "message": {
      "send": "Sign message",
      "preparing": "Preparing message...",
      "cancel": "Cancel",
      "preparing_error": "Error preparing message, please retry!"
    },
    "signature": {
      "waiting": "Waiting for signature...",
      "verifying": "Verifying signature...",
      "signing_error": "Error signing message, please retry!",
      "verifying_error": "Error verifying signature, please retry!",
      "oops_error": "Oops, something went wrong!"
    }
  },

  "connect": {
    "label": "Connect",
    "title": "Connect a Wallet",
    "new_to_ethereum": {
      "description": "New to Ethereum wallets?",
      "learn_more": {
        "label": "Learn More"
      }
    },
    "learn_more": {
      "label": "Learn more"
    },
    "recent": "Recent",
    "status": {
      "opening": "Opening %{wallet}...",
      "connecting": "Connecting",
      "connect_mobile": "Continue in %{wallet}",
      "not_installed": "%{wallet} is not installed",
      "not_available": "%{wallet} is not available",
      "confirm": "Confirm connection in the extension",
      "confirm_mobile": "Accept connection request in the wallet"
    },
    "secondary_action": {
      "get": {
        "description": "Don't have %{wallet}?",
        "label": "GET"
      },
      "install": {
        "label": "INSTALL"
      },
      "retry": {
        "label": "RETRY"
      }
    },
    "walletconnect": {
      "description": {
        "full": "Need the official WalletConnect modal?",
        "compact": "Need the WalletConnect modal?"
      },
      "open": {
        "label": "OPEN"
      }
    }
  },

  "connect_scan": {
    "title": "Scan with %{wallet}",
    "fallback_title": "Scan with your phone"
  },

  "connector_group": {
    "installed": "Installed",
    "recommended": "Recommended",
    "other": "Other",
    "popular": "Popular",
    "more": "More",
    "others": "Others"
  },

  "get": {
    "title": "Get a Wallet",
    "action": {
      "label": "GET"
    },
    "mobile": {
      "description": "Mobile Wallet"
    },
    "extension": {
      "description": "Browser Extension"
    },
    "mobile_and_extension": {
      "description": "Mobile Wallet and Extension"
    },
    "mobile_and_desktop": {
      "description": "Mobile and Desktop Wallet"
    },
    "looking_for": {
      "title": "Not what you're looking for?",
      "mobile": {
        "description": "Select a wallet on the main screen to get started with a different wallet provider."
      },
      "desktop": {
        "compact_description": "Select a wallet on the main screen to get started with a different wallet provider.",
        "wide_description": "Select a wallet on the left to get started with a different wallet provider."
      }
    }
  },

  "get_options": {
    "title": "Get started with %{wallet}",
    "short_title": "Get %{wallet}",
    "mobile": {
      "title": "%{wallet} for Mobile",
      "description": "Use the mobile wallet to explore the world of Ethereum.",
      "download": {
        "label": "Get the app"
      }
    },
    "extension": {
      "title": "%{wallet} for %{browser}",
      "description": "Access your wallet right from your favorite web browser.",
      "download": {
        "label": "Add to %{browser}"
      }
    },
    "desktop": {
      "title": "%{wallet} for %{platform}",
      "description": "Access your wallet natively from your powerful desktop.",
      "download": {
        "label": "Add to %{platform}"
      }
    }
  },

  "get_mobile": {
    "title": "Install %{wallet}",
    "description": "Scan with your phone to download on iOS or Android",
    "continue": {
      "label": "Continue"
    }
  },

  "get_instructions": {
    "mobile": {
      "connect": {
        "label": "Connect"
      },
      "learn_more": {
        "label": "Learn More"
      }
    },
    "extension": {
      "refresh": {
        "label": "Refresh"
      },
      "learn_more": {
        "label": "Learn More"
      }
    },
    "desktop": {
      "connect": {
        "label": "Connect"
      },
      "learn_more": {
        "label": "Learn More"
      }
    }
  },

  "chains": {
    "title": "Switch Networks",
    "wrong_network": "Wrong network detected, switch or disconnect to continue.",
    "confirm": "Confirm in Wallet",
    "switching_not_supported": "Your wallet does not support switching networks from %{appName}. Try switching networks from within your wallet instead.",
    "switching_not_supported_fallback": "Your wallet does not support switching networks from this app. Try switching networks from within your wallet instead.",
    "disconnect": "Disconnect",
    "connected": "Connected"
  },

  "profile": {
    "disconnect": {
      "label": "Disconnect"
    },
    "copy_address": {
      "label": "Copy Address",
      "copied": "Copied!"
    },
    "explorer": {
      "label": "View more on explorer"
    },
    "transactions": {
      "description": "%{appName} transactions will appear here...",
      "description_fallback": "Your transactions will appear here...",
      "recent": {
        "title": "Recent Transactions"
      },
      "clear": {
        "label": "Clear All"
      }
    }
  },

  "wallet_connectors": {
    "ready": {
      "qr_code": {
        "step1": {
          "description": "Add Ready to your home screen for faster access to your wallet.",
          "title": "Open the Ready app"
        },
        "step2": {
          "description": "Create a wallet and username, or import an existing wallet.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "berasig": {
      "extension": {
        "step1": {
          "title": "Install the BeraSig extension",
          "description": "We recommend pinning BeraSig to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "best": {
      "qr_code": {
        "step1": {
          "title": "Open the Best Wallet app",
          "description": "Add Best Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "bifrost": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bifrost Wallet on your home screen for quicker access.",
          "title": "Open the Bifrost Wallet app"
        },
        "step2": {
          "description": "Create or import a wallet using your recovery phrase.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "bitget": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bitget Wallet on your home screen for quicker access.",
          "title": "Open the Bitget Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Bitget Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Bitget Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "bitski": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Bitski to your taskbar for quicker access to your wallet.",
          "title": "Install the Bitski extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "bitverse": {
      "qr_code": {
        "step1": {
          "title": "Open the Bitverse Wallet app",
          "description": "Add Bitverse Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "bloom": {
      "desktop": {
        "step1": {
          "title": "Open the Bloom Wallet app",
          "description": "We recommend putting Bloom Wallet on your home screen for quicker access."
        },
        "step2": {
          "description": "Create or import a wallet using your recovery phrase.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you have a wallet, click on Connect to connect via Bloom. A connection prompt in the app will appear for you to confirm the connection.",
          "title": "Click on Connect"
        }
      }
    },

    "bybit": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bybit on your home screen for faster access to your wallet.",
          "title": "Open the Bybit app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "Click at the top right of your browser and pin Bybit Wallet for easy access.",
          "title": "Install the Bybit Wallet extension"
        },
        "step2": {
          "description": "Create a new wallet or import an existing one.",
          "title": "Create or Import a wallet"
        },
        "step3": {
          "description": "Once you set up Bybit Wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "binance": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Binance on your home screen for faster access to your wallet.",
          "title": "Open the Binance app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Binance Wallet extension",
          "description": "We recommend pinning Binance Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "coin98": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Coin98 Wallet on your home screen for faster access to your wallet.",
          "title": "Open the Coin98 Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },

      "extension": {
        "step1": {
          "description": "Click at the top right of your browser and pin Coin98 Wallet for easy access.",
          "title": "Install the Coin98 Wallet extension"
        },
        "step2": {
          "description": "Create a new wallet or import an existing one.",
          "title": "Create or Import a wallet"
        },
        "step3": {
          "description": "Once you set up Coin98 Wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "coinbase": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Coinbase Wallet on your home screen for quicker access.",
          "title": "Open the Coinbase Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using the cloud backup feature.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Coinbase Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Coinbase Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "compass": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Compass Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Compass Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "core": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Core on your home screen for faster access to your wallet.",
          "title": "Open the Core app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Core to your taskbar for quicker access to your wallet.",
          "title": "Install the Core extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "fox": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting FoxWallet on your home screen for quicker access.",
          "title": "Open the FoxWallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "frontier": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Frontier Wallet on your home screen for quicker access.",
          "title": "Open the Frontier Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Frontier Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Frontier Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "im_token": {
      "qr_code": {
        "step1": {
          "title": "Open the imToken app",
          "description": "Put imToken app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "iopay": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting ioPay on your home screen for faster access to your wallet.",
          "title": "Open the ioPay app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      }
    },

    "kaikas": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Kaikas to your taskbar for quicker access to your wallet.",
          "title": "Install the Kaikas extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Kaikas app",
          "description": "Put Kaikas app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "kaia": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Kaia to your taskbar for quicker access to your wallet.",
          "title": "Install the Kaia extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Kaia app",
          "description": "Put Kaia app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "kraken": {
      "qr_code": {
        "step1": {
          "title": "Open the Kraken Wallet app",
          "description": "Add Kraken Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "kresus": {
      "qr_code": {
        "step1": {
          "title": "Open the Kresus Wallet app",
          "description": "Add Kresus Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "magicEden": {
      "extension": {
        "step1": {
          "title": "Install the Magic Eden extension",
          "description": "We recommend pinning Magic Eden to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "metamask": {
      "qr_code": {
        "step1": {
          "title": "Open the MetaMask app",
          "description": "We recommend putting MetaMask on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the MetaMask extension",
          "description": "We recommend pinning MetaMask to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "nestwallet": {
      "extension": {
        "step1": {
          "title": "Install the NestWallet extension",
          "description": "We recommend pinning NestWallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "okx": {
      "qr_code": {
        "step1": {
          "title": "Open the OKX Wallet app",
          "description": "We recommend putting OKX Wallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the OKX Wallet extension",
          "description": "We recommend pinning OKX Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "omni": {
      "qr_code": {
        "step1": {
          "title": "Open the Omni app",
          "description": "Add Omni to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your home screen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "1inch": {
      "qr_code": {
        "step1": {
          "description": "Put 1inch Wallet on your home screen for faster access to your wallet.",
          "title": "Open the 1inch Wallet app"
        },
        "step2": {
          "description": "Create a wallet and username, or import an existing wallet.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "token_pocket": {
      "qr_code": {
        "step1": {
          "title": "Open the TokenPocket app",
          "description": "We recommend putting TokenPocket on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the TokenPocket extension",
          "description": "We recommend pinning TokenPocket to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "trust": {
      "qr_code": {
        "step1": {
          "title": "Open the Trust Wallet app",
          "description": "Put Trust Wallet on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the Trust Wallet extension",
          "description": "Click at the top right of your browser and pin Trust Wallet for easy access."
        },
        "step2": {
          "title": "Create or Import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up Trust Wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "uniswap": {
      "qr_code": {
        "step1": {
          "title": "Open the Uniswap app",
          "description": "Add Uniswap Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "zerion": {
      "qr_code": {
        "step1": {
          "title": "Open the Zerion app",
          "description": "We recommend putting Zerion on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the Zerion extension",
          "description": "We recommend pinning Zerion to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "rainbow": {
      "qr_code": {
        "step1": {
          "title": "Open the Rainbow app",
          "description": "We recommend putting Rainbow on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "You can easily backup your wallet using our backup feature on your phone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "enkrypt": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Enkrypt Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Enkrypt Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "frame": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Frame to your taskbar for quicker access to your wallet.",
          "title": "Install Frame & the companion extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "one_key": {
      "extension": {
        "step1": {
          "title": "Install the OneKey Wallet extension",
          "description": "We recommend pinning OneKey Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "paraswap": {
      "qr_code": {
        "step1": {
          "title": "Open the ParaSwap app",
          "description": "Add ParaSwap Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "phantom": {
      "extension": {
        "step1": {
          "title": "Install the Phantom extension",
          "description": "We recommend pinning Phantom to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "rabby": {
      "extension": {
        "step1": {
          "title": "Install the Rabby extension",
          "description": "We recommend pinning Rabby to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "ronin": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Ronin Wallet on your home screen for quicker access.",
          "title": "Open the Ronin Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Ronin Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Ronin Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "ramper": {
      "extension": {
        "step1": {
          "title": "Install the Ramper extension",
          "description": "We recommend pinning Ramper to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "safeheron": {
      "extension": {
        "step1": {
          "title": "Install the Core extension",
          "description": "We recommend pinning Safeheron to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "taho": {
      "extension": {
        "step1": {
          "title": "Install the Taho extension",
          "description": "We recommend pinning Taho to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "wigwam": {
      "extension": {
        "step1": {
          "title": "Install the Wigwam extension",
          "description": "We recommend pinning Wigwam to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "talisman": {
      "extension": {
        "step1": {
          "title": "Install the Talisman extension",
          "description": "We recommend pinning Talisman to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import an Ethereum Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "ctrl": {
      "extension": {
        "step1": {
          "title": "Install the CTRL Wallet extension",
          "description": "We recommend pinning CTRL Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "zeal": {
      "qr_code": {
        "step1": {
          "title": "Open the Zeal app",
          "description": "Add Zeal Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Zeal extension",
          "description": "We recommend pinning Zeal to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "safepal": {
      "extension": {
        "step1": {
          "title": "Install the SafePal Wallet extension",
          "description": "Click at the top right of your browser and pin SafePal Wallet for easy access."
        },
        "step2": {
          "title": "Create or Import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up SafePal Wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the SafePal Wallet app",
          "description": "Put SafePal Wallet on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "desig": {
      "extension": {
        "step1": {
          "title": "Install the Desig extension",
          "description": "We recommend pinning Desig to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "subwallet": {
      "extension": {
        "step1": {
          "title": "Install the SubWallet extension",
          "description": "We recommend pinning SubWallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the SubWallet app",
          "description": "We recommend putting SubWallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "clv": {
      "extension": {
        "step1": {
          "title": "Install the CLV Wallet extension",
          "description": "We recommend pinning CLV Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the CLV Wallet app",
          "description": "We recommend putting CLV Wallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "okto": {
      "qr_code": {
        "step1": {
          "title": "Open the Okto app",
          "description": "Add Okto to your home screen for quick access"
        },
        "step2": {
          "title": "Create an MPC Wallet",
          "description": "Create an account and generate a wallet"
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Tap the Scan QR icon at the top right and confirm the prompt to connect."
        }
      }
    },

    "ledger": {
      "desktop": {
        "step1": {
          "title": "Open the Ledger Live app",
          "description": "We recommend putting Ledger Live on your home screen for quicker access."
        },
        "step2": {
          "title": "Set up your Ledger",
          "description": "Set up a new Ledger or connect to an existing one."
        },
        "step3": {
          "title": "Connect",
          "description": "A connection prompt will appear for you to connect your wallet."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Ledger Live app",
          "description": "We recommend putting Ledger Live on your home screen for quicker access."
        },
        "step2": {
          "title": "Set up your Ledger",
          "description": "You can either sync with the desktop app or connect your Ledger."
        },
        "step3": {
          "title": "Scan the code",
          "description": "Tap WalletConnect then Switch to Scanner. After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "valora": {
      "qr_code": {
        "step1": {
          "title": "Open the Valora app",
          "description": "We recommend putting Valora on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "gate": {
      "qr_code": {
        "step1": {
          "title": "Open the Gate app",
          "description": "We recommend putting Gate on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Gate extension",
          "description": "We recommend pinning Gate to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "gemini": {
      "qr_code": {
        "step1": {
          "title": "Open keys.gemini.com",
          "description": "Visit keys.gemini.com on your mobile browser - no app download required."
        },
        "step2": {
          "title": "Create Your Wallet Instantly",
          "description": "Set up your smart wallet in seconds using your device's built-in authentication."
        },
        "step3": {
          "title": "Scan to Connect",
          "description": "Scan the QR code to instantly connect your wallet - it just works."
        }
      },
      "extension": {
        "step1": {
          "title": "Go to keys.gemini.com",
          "description": "No extensions or downloads needed - your wallet lives securely in the browser."
        },
        "step2": {
          "title": "One-Click Setup",
          "description": "Create your smart wallet instantly with passkey authentication - easier than any wallet out there."
        },
        "step3": {
          "title": "Connect and Go",
          "description": "Approve the connection and you're ready - the unopinionated wallet that just works."
        }
      }
    },

    "xportal": {
      "qr_code": {
        "step1": {
          "description": "Put xPortal on your home screen for faster access to your wallet.",
          "title": "Open the xPortal app"
        },
        "step2": {
          "description": "Create a wallet or import an existing one.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "mew": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting MEW Wallet on your home screen for quicker access.",
          "title": "Open the MEW Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using the cloud backup feature.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "zilpay": {
      "qr_code": {
        "step1": {
          "title": "Open the ZilPay app",
          "description": "Add ZilPay to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "nova": {
      "qr_code": {
        "step1": {
          "title": "Open the Nova Wallet app",
          "description": "Add Nova Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "meco": {
      "qr_code": {
        "step1": {
          "title": "Open the MeCo Wallet app",
          "description": "Put MeCo Wallet on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "anchorage_digital": {
      "extension": {
        "step1": {
          "title": "Install the Anchorage Digital extension",
          "description": "We recommend pinning Anchorage Digital to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Scan the QR code to login",
          "description": "Securely connect your organization's wallets to dApps with institutional-grade security."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you log in, click below to refresh the browser and load up the extension."
        }
      }
    }
  }
}
`;e.s(["en_US_default",0,t])},443138,e=>{e.v(t=>Promise.all(["static/chunks/1-dmnk-_ozydj.js"].map(t=>e.l(t))).then(()=>t(770043)))},753589,e=>{e.v(e=>Promise.resolve().then(()=>e(827373)))},654026,e=>{e.v(t=>Promise.all(["static/chunks/11an8mb8qo9hn.js","static/chunks/3bo_5wrd2ajy5.js","static/chunks/3r42elwmu_vgn.js","static/chunks/2e977127730uk.js"].map(t=>e.l(t))).then(()=>t(61717)))},319123,e=>{e.v(t=>Promise.all(["static/chunks/40e-jeotjy-bx.js","static/chunks/24wi6rpqqvd49.js","static/chunks/17slm7o9qbdfx.js"].map(t=>e.l(t))).then(()=>t(726707)))},221338,e=>{e.v(t=>Promise.all(["static/chunks/1tuws7dhtvk-z.js"].map(t=>e.l(t))).then(()=>t(347649)))},475397,e=>{e.v(t=>Promise.all(["static/chunks/17273rf3szn3u.js"].map(t=>e.l(t))).then(()=>t(823577)))},404468,e=>{e.v(t=>Promise.all(["static/chunks/0wfvv8325txvp.js","static/chunks/2j_q2yw7irrfv.js"].map(t=>e.l(t))).then(()=>t(723637)))},227034,e=>{e.v(t=>Promise.all(["static/chunks/3cew428svq9i-.js"].map(t=>e.l(t))).then(()=>t(526524)))},712577,e=>{e.v(t=>Promise.all(["static/chunks/1-8en0hcv0hxv.js"].map(t=>e.l(t))).then(()=>t(306572)))},999316,e=>{e.v(t=>Promise.all(["static/chunks/1qh69p2cvw3jw.js"].map(t=>e.l(t))).then(()=>t(666323)))},367229,e=>{e.v(t=>Promise.all(["static/chunks/18j93jidc4e3p.js"].map(t=>e.l(t))).then(()=>t(969277)))},770608,e=>{e.v(t=>Promise.all(["static/chunks/05scol-ox4dam.js"].map(t=>e.l(t))).then(()=>t(960894)))},316756,e=>{e.v(t=>Promise.all(["static/chunks/31zxp259w041k.js"].map(t=>e.l(t))).then(()=>t(19563)))},582436,e=>{e.v(t=>Promise.all(["static/chunks/2sn0dlbxkl1ji.js"].map(t=>e.l(t))).then(()=>t(826874)))},434432,e=>{e.v(t=>Promise.all(["static/chunks/0pg8xl9ma9q0t.js"].map(t=>e.l(t))).then(()=>t(975294)))},596310,e=>{e.v(t=>Promise.all(["static/chunks/2hsfiv0a6uctq.js"].map(t=>e.l(t))).then(()=>t(474899)))},753196,e=>{e.v(t=>Promise.all(["static/chunks/21-r--fnqgk3j.js"].map(t=>e.l(t))).then(()=>t(848732)))},427740,e=>{e.v(t=>Promise.all(["static/chunks/3bysfxaw_occ_.js"].map(t=>e.l(t))).then(()=>t(571104)))},786872,e=>{e.v(t=>Promise.all(["static/chunks/3n9pqen3a0dsi.js"].map(t=>e.l(t))).then(()=>t(815229)))},329271,e=>{e.v(t=>Promise.all(["static/chunks/21zrhgje6m0su.js"].map(t=>e.l(t))).then(()=>t(681843)))},923551,e=>{e.v(t=>Promise.all(["static/chunks/0lj0_9qggwych.js"].map(t=>e.l(t))).then(()=>t(58345)))},912386,e=>{e.v(t=>Promise.all(["static/chunks/0samry6jhgl04.js"].map(t=>e.l(t))).then(()=>t(317700)))},733086,e=>{e.v(t=>Promise.all(["static/chunks/0x9mp1r98eduq.js"].map(t=>e.l(t))).then(()=>t(271318)))},816883,e=>{e.v(t=>Promise.all(["static/chunks/36d0idf_nfh7x.js"].map(t=>e.l(t))).then(()=>t(443960)))},110374,e=>{e.v(t=>Promise.all(["static/chunks/2g9icgh-vsp_p.js"].map(t=>e.l(t))).then(()=>t(361946)))},127399,e=>{e.v(t=>Promise.all(["static/chunks/2-tl4us-p0j2a.js"].map(t=>e.l(t))).then(()=>t(800315)))},508827,e=>{e.v(t=>Promise.all(["static/chunks/2vv6yhoxil6kj.js"].map(t=>e.l(t))).then(()=>t(594092)))},954721,e=>{e.v(t=>Promise.all(["static/chunks/1786swiqmcngp.js"].map(t=>e.l(t))).then(()=>t(733182)))},609146,e=>{e.v(t=>Promise.all(["static/chunks/24wgl5rl42zmu.js"].map(t=>e.l(t))).then(()=>t(889008)))},959776,e=>{e.v(t=>Promise.all(["static/chunks/1767s2eesmk4l.js"].map(t=>e.l(t))).then(()=>t(517344)))},928070,e=>{e.v(t=>Promise.all(["static/chunks/1_wsft0k74at1.js"].map(t=>e.l(t))).then(()=>t(468078)))},747191,e=>{e.v(t=>Promise.all(["static/chunks/27m4_qyt-sik1.js"].map(t=>e.l(t))).then(()=>t(21191)))},915289,e=>{e.v(t=>Promise.all(["static/chunks/0x73qgtqsp2in.js"].map(t=>e.l(t))).then(()=>t(590786)))},179437,e=>{e.v(t=>Promise.all(["static/chunks/42mm5n4mgv05v.js"].map(t=>e.l(t))).then(()=>t(472608)))},910971,e=>{e.v(t=>Promise.all(["static/chunks/3botaogsi7d8j.js"].map(t=>e.l(t))).then(()=>t(861706)))},185055,e=>{e.v(t=>Promise.all(["static/chunks/2kv8e1f2zhlfr.js"].map(t=>e.l(t))).then(()=>t(300054)))},797371,e=>{e.v(t=>Promise.all(["static/chunks/3xw9fsrktda8c.js"].map(t=>e.l(t))).then(()=>t(539161)))},460966,e=>{e.v(t=>Promise.all(["static/chunks/3--ungqf3ey78.js"].map(t=>e.l(t))).then(()=>t(537376)))},808632,e=>{e.v(t=>Promise.all(["static/chunks/0ka_0siv8r3wu.js"].map(t=>e.l(t))).then(()=>t(699653)))},395458,e=>{e.v(t=>Promise.all(["static/chunks/3s41erba_8cxm.js"].map(t=>e.l(t))).then(()=>t(782881)))},82412,e=>{e.v(t=>Promise.all(["static/chunks/2837nu6tp6b82.js"].map(t=>e.l(t))).then(()=>t(100473)))},715234,e=>{e.v(t=>Promise.all(["static/chunks/3cmpi_qatj9dc.js"].map(t=>e.l(t))).then(()=>t(969798)))},229795,e=>{e.v(t=>Promise.all(["static/chunks/25o2ztsmvnq3s.js"].map(t=>e.l(t))).then(()=>t(324091)))},475387,e=>{e.v(t=>Promise.all(["static/chunks/0twv3cfo_hlkh.js"].map(t=>e.l(t))).then(()=>t(318711)))},153915,e=>{e.v(t=>Promise.all(["static/chunks/33ecu90x-sr9z.js"].map(t=>e.l(t))).then(()=>t(933887)))},462583,e=>{e.v(t=>Promise.all(["static/chunks/2lnl5jp5stogd.js"].map(t=>e.l(t))).then(()=>t(830663)))},344512,e=>{e.v(t=>Promise.all(["static/chunks/3_av5oyshlv_p.js"].map(t=>e.l(t))).then(()=>t(316813)))},527994,e=>{e.v(t=>Promise.all(["static/chunks/3-n7s9s7amz67.js"].map(t=>e.l(t))).then(()=>t(943459)))},599830,e=>{e.v(t=>Promise.all(["static/chunks/36y99j1obdgx4.js"].map(t=>e.l(t))).then(()=>t(79434)))},316229,e=>{e.v(t=>Promise.all(["static/chunks/3e6-cm4x7cqcb.js"].map(t=>e.l(t))).then(()=>t(803896)))},189667,e=>{e.v(t=>Promise.all(["static/chunks/2ic6f9194z7tx.js"].map(t=>e.l(t))).then(()=>t(974796)))},776247,e=>{e.v(t=>Promise.all(["static/chunks/2d50tnglc-y9z.js"].map(t=>e.l(t))).then(()=>t(385881)))},605681,e=>{e.v(t=>Promise.all(["static/chunks/3y49rhsky8yy_.js"].map(t=>e.l(t))).then(()=>t(29804)))},773860,e=>{e.v(t=>Promise.all(["static/chunks/3b83gry-wmmt5.js"].map(t=>e.l(t))).then(()=>t(132955)))},151811,e=>{e.v(t=>Promise.all(["static/chunks/292cf4twmo6oi.js"].map(t=>e.l(t))).then(()=>t(617958)))},569520,e=>{e.v(t=>Promise.all(["static/chunks/4429x-qnr36dl.js"].map(t=>e.l(t))).then(()=>t(126903)))},351724,e=>{e.v(t=>Promise.all(["static/chunks/3onrbna0-8jg6.js"].map(t=>e.l(t))).then(()=>t(518663)))},300052,e=>{e.v(t=>Promise.all(["static/chunks/3uqgwkq_w7yv9.js"].map(t=>e.l(t))).then(()=>t(670925)))},795154,e=>{e.v(t=>Promise.all(["static/chunks/32gf6ng2jm3gu.js"].map(t=>e.l(t))).then(()=>t(762564)))},311496,e=>{e.v(t=>Promise.all(["static/chunks/24hwlib9uj1jh.js"].map(t=>e.l(t))).then(()=>t(691294)))},228922,e=>{e.v(t=>Promise.all(["static/chunks/3xnjao-hjr_dk.js"].map(t=>e.l(t))).then(()=>t(362186)))},511350,e=>{e.v(t=>Promise.all(["static/chunks/3g2dn1tpfa4mz.js"].map(t=>e.l(t))).then(()=>t(930148)))},475330,e=>{e.v(t=>Promise.all(["static/chunks/23l-_vbb0b_qo.js"].map(t=>e.l(t))).then(()=>t(165475)))},852977,e=>{e.v(t=>Promise.all(["static/chunks/3-zkwtyd74_ct.js"].map(t=>e.l(t))).then(()=>t(196252)))},183634,e=>{e.v(t=>Promise.all(["static/chunks/0z7-6dhx6n8nl.js"].map(t=>e.l(t))).then(()=>t(446889)))},392192,e=>{e.v(t=>Promise.all(["static/chunks/42v6ci8sd1s8p.js"].map(t=>e.l(t))).then(()=>t(423441)))},558585,e=>{e.v(t=>Promise.all(["static/chunks/22h7ff7cdg-35.js"].map(t=>e.l(t))).then(()=>t(395109)))},35906,e=>{e.v(t=>Promise.all(["static/chunks/2ltau1md5pbty.js"].map(t=>e.l(t))).then(()=>t(443553)))},397657,e=>{e.v(t=>Promise.all(["static/chunks/2i0158jf4mdw8.js"].map(t=>e.l(t))).then(()=>t(833162)))},486190,e=>{e.v(t=>Promise.all(["static/chunks/1qlppb_ijermx.js"].map(t=>e.l(t))).then(()=>t(498987)))},439281,e=>{e.v(t=>Promise.all(["static/chunks/1mn8xedt0yw7h.js"].map(t=>e.l(t))).then(()=>t(977642)))},465439,e=>{e.v(t=>Promise.all(["static/chunks/29rey-gvmo_1c.js"].map(t=>e.l(t))).then(()=>t(567921)))},878211,e=>{e.v(t=>Promise.all(["static/chunks/34nm2utpa2b8e.js"].map(t=>e.l(t))).then(()=>t(316922)))},304e3,e=>{e.v(t=>Promise.all(["static/chunks/0-3wenajfj6iq.js"].map(t=>e.l(t))).then(()=>t(276132)))},97060,e=>{e.v(t=>Promise.all(["static/chunks/23krvf38h6u2e.js"].map(t=>e.l(t))).then(()=>t(842338)))},174888,e=>{e.v(t=>Promise.all(["static/chunks/0-rf3qwk9v65q.js"].map(t=>e.l(t))).then(()=>t(982230)))},388993,e=>{e.v(t=>Promise.all(["static/chunks/2q71sulf_p4j8.js"].map(t=>e.l(t))).then(()=>t(72832)))},978358,e=>{e.v(t=>Promise.all(["static/chunks/3am4kwgyvopf4.js"].map(t=>e.l(t))).then(()=>t(640164)))},703256,e=>{e.v(t=>Promise.all(["static/chunks/0459ddo8g113g.js"].map(t=>e.l(t))).then(()=>t(426167)))},558465,e=>{e.v(t=>Promise.all(["static/chunks/3fw0_zeo8v3jw.js"].map(t=>e.l(t))).then(()=>t(910917)))},829378,e=>{e.v(t=>Promise.all(["static/chunks/2y1qfvp54ljw0.js"].map(t=>e.l(t))).then(()=>t(561021)))},255965,e=>{e.v(t=>Promise.all(["static/chunks/346r_ytv18oco.js"].map(t=>e.l(t))).then(()=>t(242738)))},250686,e=>{e.v(t=>Promise.all(["static/chunks/3uqsrpubll4pq.js"].map(t=>e.l(t))).then(()=>t(861273)))},928660,e=>{e.v(t=>Promise.all(["static/chunks/2as0r1shhkodh.js"].map(t=>e.l(t))).then(()=>t(400118)))},742231,e=>{e.v(t=>Promise.all(["static/chunks/1gmheg0f72-0y.js"].map(t=>e.l(t))).then(()=>t(636573)))},971295,e=>{e.v(t=>Promise.all(["static/chunks/2z9ecfpjb2r83.js"].map(t=>e.l(t))).then(()=>t(221190)))},660341,e=>{e.v(t=>Promise.all(["static/chunks/307y7ydbytboi.js","static/chunks/0ii2jobl7a1zp.js","static/chunks/17slm7o9qbdfx.js"].map(t=>e.l(t))).then(()=>t(306129)))},633873,e=>{e.v(t=>Promise.all(["static/chunks/1-wseqfkjiytt.js","static/chunks/3_gx2lfflubw8.js"].map(t=>e.l(t))).then(()=>t(315609)))},333450,e=>{e.v(t=>Promise.all(["static/chunks/3gc3u2w8j7nsh.js"].map(t=>e.l(t))).then(()=>t(317583)))},128996,e=>{e.v(t=>Promise.all(["static/chunks/3kak6oyrxgl92.js"].map(t=>e.l(t))).then(()=>t(475379)))},855815,e=>{e.v(t=>Promise.all(["static/chunks/09zf8x5p8vfgh.js"].map(t=>e.l(t))).then(()=>t(854237)))},985406,e=>{e.v(t=>Promise.all(["static/chunks/0prbaajtcrcmf.js"].map(t=>e.l(t))).then(()=>t(656072)))},616423,e=>{e.v(t=>Promise.all(["static/chunks/1x_2uol3lksw_.js"].map(t=>e.l(t))).then(()=>t(888185)))},713306,e=>{e.v(t=>Promise.all(["static/chunks/1h14py-yqc7kn.js"].map(t=>e.l(t))).then(()=>t(194373)))},114717,e=>{e.v(t=>Promise.all(["static/chunks/3wt0bzt8jtrz1.js"].map(t=>e.l(t))).then(()=>t(755060)))},174608,e=>{e.v(t=>Promise.all(["static/chunks/2_en4y4o6zcgg.js"].map(t=>e.l(t))).then(()=>t(413776)))},790031,e=>{e.v(t=>Promise.all(["static/chunks/20xy2l4l3u5wv.js"].map(t=>e.l(t))).then(()=>t(584261)))},12209,e=>{e.v(t=>Promise.all(["static/chunks/010o-w_qvokd8.js"].map(t=>e.l(t))).then(()=>t(265390)))},266906,e=>{e.v(t=>Promise.all(["static/chunks/3r-tv5kp1mviy.js"].map(t=>e.l(t))).then(()=>t(494993)))},393518,e=>{e.v(t=>Promise.all(["static/chunks/39jgqrjbtw4ge.js"].map(t=>e.l(t))).then(()=>t(566434)))},164572,e=>{e.v(t=>Promise.all(["static/chunks/2_a854-s2rd59.js"].map(t=>e.l(t))).then(()=>t(508149)))},994834,e=>{e.v(t=>Promise.all(["static/chunks/0zja18qrjog59.js"].map(t=>e.l(t))).then(()=>t(188828)))},642992,e=>{e.v(t=>Promise.all(["static/chunks/338gyvldi6p9c.js"].map(t=>e.l(t))).then(()=>t(172157)))},455382,e=>{e.v(t=>Promise.all(["static/chunks/42e3rnjnq4a1p.js"].map(t=>e.l(t))).then(()=>t(897978)))},537163,e=>{e.v(t=>Promise.all(["static/chunks/30c1cs0bq55cw.js"].map(t=>e.l(t))).then(()=>t(450927)))},862941,e=>{e.v(t=>Promise.all(["static/chunks/44cx4z33px646.js"].map(t=>e.l(t))).then(()=>t(561559)))},75458,e=>{e.v(t=>Promise.all(["static/chunks/3xczmeuhstr_n.js"].map(t=>e.l(t))).then(()=>t(727781)))},745502,e=>{e.v(t=>Promise.all(["static/chunks/39um2fxfuc6bi.js"].map(t=>e.l(t))).then(()=>t(879400)))},79756,e=>{e.v(t=>Promise.all(["static/chunks/3s56rop7iptuc.js"].map(t=>e.l(t))).then(()=>t(93878)))},28324,e=>{e.v(t=>Promise.all(["static/chunks/376_5p2r25mz-.js"].map(t=>e.l(t))).then(()=>t(261283)))},118534,e=>{e.v(t=>Promise.all(["static/chunks/128l9j6_ea5wx.js"].map(t=>e.l(t))).then(()=>t(987349)))}]);