/**
 * Struck, decaying waves. Sculpture, sound trace and masthead all read this one field,
 * so every visible ripple belongs to an actual strike of the instrument.
 * Distances are normalised (0…1 along the spine or across the stage).
 */
const speed=1.05,width=.045,wavelength=.075;
export function ripple(distance,age,decay){
 if(age<0)return 0;
 const fade=Math.exp(-age/decay),front=distance-age*speed;
 const packet=Math.exp(-front*front/(width*width))*Math.cos(front*Math.PI*2/wavelength)*Math.exp(-distance*1.3);
 // The struck place keeps ringing a little longer than the travelling front.
 const ring=Math.exp(-distance/.03)*Math.sin(age*Math.PI*9)*Math.exp(-age/(decay*.45));
 return fade*(packet+ring*.75);
}
export function glint(distance,age,decay){
 if(age<0)return 0;
 const front=distance-age*speed;
 return Math.exp(-age/decay)*(Math.exp(-front*front/(width*width*1.1))*Math.exp(-distance*1.4)+Math.exp(-distance/.018)*Math.exp(-age/(decay*.5)));
}
export function createField(){
 const strikes=[];
 return {strikes,
  add(strike){strikes.push(strike);if(strikes.length>32)strikes.shift();return strike;},
  prune(time){for(let i=strikes.length-1;i>=0;i--)if(time-strikes[i].time>strikes[i].decay*6+1)strikes.splice(i,1);},
  /** Sum of all waves at u (spine) or x (stage), weighted by each strike's velocity. */
  wave(position,time,key='u'){let y=0;for(const s of strikes)y+=s.velocity*ripple(Math.abs(position-s[key]),time-s.time,s.decay);return y;},
  light(position,time,key='u'){let y=0;for(const s of strikes)y+=s.velocity*glint(Math.abs(position-s[key]),time-s.time,s.decay);return y;},
  energy(time){let e=0;for(const s of strikes){const age=time-s.time;if(age>=0)e+=s.velocity*Math.exp(-age/s.decay);}return e;},
  clear(){strikes.length=0;}
 };
}
