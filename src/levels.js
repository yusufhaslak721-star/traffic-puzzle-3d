const C={red:0xe74c3c,blue:0x3185e6,yellow:0xf4c542,green:0x35b879,white:0xf1f3f5,orange:0xf28c28,black:0x252b32,pink:0xe46f9c,silver:0xaeb6bf};
const V=(id,type,color,route,start=0,speed=4.7)=>({id,type,color,route,start,speed});

const R={
  westEast:[[-16,2],[16,2]],
  eastWest:[[16,-2],[-16,-2]],
  northSouth:[[-2,-16],[-2,16]],
  southNorth:[[2,16],[2,-16]],

  westNorth:[[-16,2],[-6,2],[-4,1.8],[-2.7,.8],[-2,-1],[-2,-16]],
  westSouth:[[-16,2],[-6,2],[-3.8,2.3],[-1.2,3.4],[1.2,4.5],[2,6],[2,16]],
  eastSouth:[[16,-2],[6,-2],[4,-1.8],[2.7,-.8],[2,1],[2,16]],
  eastNorth:[[16,-2],[6,-2],[3.8,-2.3],[1.2,-3.4],[-1.2,-4.5],[-2,-6],[-2,-16]],

  northEast:[[-2,-16],[-2,-6],[-1.8,-4],[-.8,-2.7],[1,-2],[16,-2]],
  northWest:[[-2,-16],[-2,-6],[-2.3,-3.8],[-3.4,-1.2],[-4.5,1.2],[-6,2],[-16,2]],
  southWest:[[2,16],[2,6],[1.8,4],[.8,2.7],[-1,2],[-16,2]],
  southEast:[[2,16],[2,6],[2.3,3.8],[3.4,1.2],[4.5,-1.2],[6,-2],[16,-2]]
};

export const levels=[
  {name:'Isınma Turu',theme:'park',vehicles:[
    V('a','sedan',C.red,R.westEast,.10,4.7),
    V('b','hatch',C.blue,R.northEast,.12,4.8),
    V('c','taxi',C.yellow,R.southNorth,.18,4.5)
  ]},
  {name:'Dönüşler Başlıyor',theme:'shops',vehicles:[
    V('a','sports',C.green,R.westNorth,.08,5.5),
    V('b','suv',C.blue,R.eastSouth,.13,4.5),
    V('c','sedan',C.red,R.northSouth,.18,4.7),
    V('d','taxi',C.yellow,R.southWest,.20,4.5)
  ]},
  {name:'Şehir Merkezi',theme:'city',vehicles:[
    V('a','van',C.white,R.eastWest,.08,4.0),
    V('b','sports',C.pink,R.southEast,.10,5.6),
    V('c','suv',C.black,R.westSouth,.14,4.4),
    V('d','taxi',C.yellow,R.northEast,.18,4.5),
    V('e','sedan',C.blue,R.eastNorth,.22,4.7)
  ]},
  {name:'Acil Geçiş',theme:'hospital',vehicles:[
    V('a','ambulance',C.white,R.eastWest,.06,5.7),
    V('b','sports',C.red,R.westNorth,.11,5.5),
    V('c','suv',C.blue,R.southNorth,.15,4.4),
    V('d','van',C.silver,R.northEast,.18,4.0),
    V('e','taxi',C.yellow,R.westSouth,.22,4.5)
  ]},
  {name:'Yoğun Saat',theme:'city',vehicles:[
    V('a','police',C.white,R.westEast,.05,5.8),
    V('b','truck',C.orange,R.northSouth,.08,3.7),
    V('c','suv',C.blue,R.eastNorth,.12,4.4),
    V('d','sports',C.green,R.southWest,.15,5.6),
    V('e','van',C.white,R.westNorth,.19,4.0),
    V('f','taxi',C.yellow,R.eastWest,.23,4.5)
  ]},
  {name:'İtfaiye Yolu',theme:'shops',vehicles:[
    V('a','fire',C.red,R.southNorth,.05,5.2),
    V('b','truck',C.orange,R.eastWest,.08,3.6),
    V('c','sports',C.blue,R.northWest,.11,5.6),
    V('d','ambulance',C.white,R.westSouth,.14,5.6),
    V('e','police',C.white,R.eastNorth,.18,5.8),
    V('f','suv',C.black,R.southEast,.22,4.4),
    V('g','hatch',C.green,R.westEast,.25,4.8)
  ]}
];
