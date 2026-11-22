(function(){
"use strict";
var NAV=[["index.html","Map"],["lineage.html","Threads"],["venues.html","Venues"],["sources.html","Sources"],["method.html","Method"]];
var cur=location.pathname.split("/").pop()||"index.html";
var base=document.currentScript.src.replace(/assets\/common\.js.*$/,"");
window.LOTH={base:base,title:"Ledger of the House"};
var nav=document.createElement("nav");nav.className="site";
var logo=document.createElement("a");logo.className="logo";logo.href=base+"index.html";logo.textContent="Ledger of the House";nav.appendChild(logo);
NAV.forEach(function(n){var a=document.createElement("a");a.href=base+n[0];a.textContent=n[1];if(cur===n[0]||(cur.indexOf("venue")===0&&n[0]==="venues.html"&&cur!=="venues.html"))a.className="cur";nav.appendChild(a)});
var w=document.querySelector(".wrap");w.insertBefore(nav,w.firstChild);
window.LOTH.load=function(){
  return Promise.all([fetch(base+"data/casinos.json").then(function(r){return r.json()}),fetch(base+"data/ledger.json").then(function(r){return r.ok?r.json():null}).catch(function(){return null})]).then(function(r){
    var d=r[0],L=r[1]||{sources:[],venues:{}};var S={};L.sources.forEach(function(s,i){s.n=i+1;S[s.id]=s});
    d.casinos.forEach(function(c){var v=L.venues[c.id]||{};c.ledger=v;c.names=(v.names&&v.names.length)?v.names:[{name:c.name,from:c.opened,to:c.closed,operator:"",note:"",sources:[]}];
      c.level=(v.label&&v.label.level&&v.label.level!=="unsupported")?v.label.level:c.mob.level;c.sourced=!!(v.label&&v.label.sources&&v.label.sources.length);
      if(v.opened!=null)c.opened=v.opened;if(v.closed!==undefined&&v.opened!=null)c.closed=v.closed});
    return{data:d,ledger:L,S:S}});
};
window.LOTH.cites=function(ids,S,parent){(ids||[]).forEach(function(id){var s=S[id];if(!s)return;var sp=document.createElement("sup");sp.className="cite";var a=document.createElement("a");a.href=base+"sources.html#"+id;a.textContent="["+s.n+"]";a.title=s.title;sp.appendChild(a);parent.appendChild(sp)})};
})();
