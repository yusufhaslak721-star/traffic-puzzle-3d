const C={red:0xe74c3c,blue:0x3185e6,yellow:0xf4c542,green:0x35b879,white:0xf1f3f5,orange:0xf28c28,black:0x252b32,pink:0xe46f9c};
const V=(id,type,color,route,start=0,speed=4.7)=>({id,type,color,route,start,speed});
const R={
 westEast:[[-15,0,1],[15,0,1]], eastWest:[[15,0,-1],[-15,0,-1]], northSouth:[[0,-15,0],[0,15,0]], southNorth:[[0,15,0],[0,-15,0]],
 westNorth:[[-15,0,1],[-4,0,1],[0,-4,0],[0,-15,0]], southEast:[[0,15,0],[0,4,0],[4,0,1],[15,0,1]],
 eastSouth:[[15,0,-1],[4,0,-1],[0,4,0],[0,15,0]], northWest:[[0,-15,0],[0,-4,0],[-4,0,-1],[-15,0,-1]]
};
export const levels=[
 {name:'İlk Kavşak',theme:'park',vehicles:[V('a','sedan',C.red,R.westEast,.18),V('b','hatch',C.blue,R.northSouth,.2)]},
 {name:'Çapraz Akış',theme:'shops',vehicles:[V('a','sedan',C.yellow,R.westEast,.12),V('b','suv',C.blue,R.southNorth,.17),V('c','hatch',C.red,R.eastWest,.22)]},
 {name:'Şehir Merkezi',theme:'city',vehicles:[V('a','taxi',C.yellow,R.westNorth,.1),V('b','suv',C.black,R.southEast,.13),V('c','van',C.white,R.eastWest,.22),V('d','sedan',C.red,R.northSouth,.25)]},
 {name:'Acil Geçiş',theme:'hospital',vehicles:[V('a','ambulance',C.white,R.eastWest,.1,5.4),V('b','sedan',C.blue,R.southNorth,.15),V('c','taxi',C.yellow,R.westEast,.2),V('d','suv',C.red,R.northWest,.2)]},
 {name:'Yoğun Saat',theme:'city',vehicles:[V('a','police',C.white,R.westEast,.08,5.6),V('b','van',C.orange,R.northSouth,.1,4.1),V('c','suv',C.blue,R.eastSouth,.16),V('d','sedan',C.red,R.southNorth,.2),V('e','taxi',C.yellow,R.westNorth,.24)]},
 {name:'İtfaiye Yolu',theme:'shops',vehicles:[V('a','fire',C.red,R.southNorth,.08,5.2),V('b','hatch',C.green,R.eastWest,.12),V('c','suv',C.black,R.westEast,.18),V('d','van',C.white,R.northWest,.2),V('e','sedan',C.blue,R.eastSouth,.23)]}
];
