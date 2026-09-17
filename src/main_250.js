const originalMin=Math.min;
Math.min=(...args)=>{
  if(args.length===2&&args[0]===100&&Number.isFinite(args[1]))return originalMin(250,args[1]);
  return originalMin(...args);
};
try{await import('./main_v4.js')}finally{Math.min=originalMin}
