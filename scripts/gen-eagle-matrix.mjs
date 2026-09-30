import sharp from 'sharp';
import fs from 'fs';
(async()=>{
const COLS=140, SS=4, W=1087,H=885;
const ROWS=Math.round(COLS*H/W);
const {data,info}=await sharp('public/images/eagle.svg',{density:300}).resize(COLS*SS,ROWS*SS,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const rows=[];let lit=0;
for(let r=0;r<ROWS;r++){let s='';for(let c=0;c<COLS;c++){let a=0;for(let y=0;y<SS;y++)for(let x=0;x<SS;x++){a+=data[((r*SS+y)*info.width+c*SS+x)*4+3]}a/=SS*SS*255;const on=a>=0.5;if(on)lit++;s+=on?'#':'.'}rows.push(s)}
console.log(COLS,ROWS,lit);
const out=`/**
 * The GCB eagle as a dot matrix: one character per cell ("#" = a dot).
 * Sampled from public/images/eagle.svg by scripts/gen-eagle-matrix.mjs
 * (each cell is lit when at least half of it is covered by the eagle).
 * Edit it visually in the Eagle studio on /login rather than by hand.
 */
export const EAGLE_PITCH = 10;
export const EAGLE_ROWS: readonly string[] = [
${rows.map(r=>`  "${r}",`).join('\n')}
];
export const EAGLE_COLS = EAGLE_ROWS[0].length;
export const EAGLE_HEIGHT_CELLS = EAGLE_ROWS.length;
`;
fs.writeFileSync('src/lib/eagle-matrix.ts',out);
console.log(rows.filter((_,i)=>i%3==0).map(r=>r.replace(/\./g,' ')).join('\n'));
})();
