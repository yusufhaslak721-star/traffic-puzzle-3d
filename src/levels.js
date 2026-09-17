const C={
  red:0xff3b30,blue:0x2f80ff,yellow:0xffcc00,green:0x25d366,white:0xffffff,orange:0xff8a00,
  black:0x242b33,pink:0xff4fa3,silver:0xc5ced6,purple:0x9b51e0,cyan:0x21c7e8,lime:0x8ee000
};
const route=(name,points)=>({name,points});
const V=(id,type,color,route,start=0,speed=5.2)=>({id,type,color,route,start,speed});

const R={
  westEast:route('westEast',[[-18,2],[-7,2],[7,2],[18,2]]),
  eastWest:route('eastWest',[[18,-2],[7,-2],[-7,-2],[-18,-2]]),
  northSouth:route('northSouth',[[-2,-18],[-2,-7],[-2,7],[-2,18]]),
  southNorth:route('southNorth',[[2,18],[2,7],[2,-7],[2,-18]]),

  westNorth:route('westNorth',[[-18,2],[-7,2],[-4.8,1.8],[-2.4,.6],[.3,-2.3],[1.8,-4.8],[2,-7],[2,-18]]),
  westSouth:route('westSouth',[[-18,2],[-7,2],[-4.5,2],[-3,2.2],[-2.2,3],[-2,4.5],[-2,18]]),
  eastNorth:route('eastNorth',[[18,-2],[7,-2],[4.5,-2],[3,-2.2],[2.2,-3],[2,-4.5],[2,-18]]),
  eastSouth:route('eastSouth',[[18,-2],[7,-2],[4.8,-1.8],[2.4,-.6],[-.3,2.3],[-1.8,4.8],[-2,7],[-2,18]]),

  northEast:route('northEast',[[-2,-18],[-2,-7],[-1.8,-4.8],[-.6,-2.4],[2.3,.3],[4.8,1.8],[7,2],[18,2]]),
  northWest:route('northWest',[[-2,-18],[-2,-7],[-2,-4.5],[-2.2,-3],[-3,-2.2],[-4.5,-2],[-18,-2]]),
  southEast:route('southEast',[[2,18],[2,7],[2,4.5],[2.2,3],[3,2.2],[4.5,2],[18,2]]),
  southWest:route('southWest',[[2,18],[2,7],[1.8,4.8],[.6,2.4],[-2.3,-.3],[-4.8,-1.8],[-7,-2],[-18,-2]])
};

export const levels=[
  {name:'Park Bulvarı',theme:'park',layout:'straightEW',vehicles:[
    V('a','sedan',C.red,R.westEast,.04,5.4),
    V('b','hatch',C.blue,R.eastWest,.04,5.3),
    V('c','taxi',C.yellow,R.westEast,.20,5.0)
  ]},
  {name:'Çarşı T Kavşağı',theme:'shops',layout:'tNorth',vehicles:[
    V('a','sports',C.green,R.westNorth,.04,6.0),
    V('b','suv',C.blue,R.eastNorth,.04,5.0),
    V('c','taxi',C.yellow,R.northWest,.04,5.0),
    V('d','sedan',C.red,R.westEast,.20,5.3)
  ]},
  {name:'Mahalle Girişi',theme:'suburb',layout:'tSouth',vehicles:[
    V('a','luxury',C.purple,R.westSouth,.04,5.1),
    V('b','race',C.pink,R.eastSouth,.04,6.2),
    V('c','taxi',C.yellow,R.southWest,.04,5.0),
    V('d','sedan',C.cyan,R.eastWest,.20,5.3)
  ]},
  {name:'Hastane Köşesi',theme:'hospital',layout:'bendNE',vehicles:[
    V('a','ambulance',C.white,R.northEast,.04,5.9),
    V('b','sports',C.red,R.eastNorth,.04,6.0),
    V('c','delivery',C.orange,R.northEast,.20,4.4),
    V('d','taxi',C.yellow,R.eastNorth,.20,5.0)
  ]},
  {name:'Şehir Merkezi',theme:'city',layout:'cross',vehicles:[
    V('a','police',C.white,R.westEast,.04,6.1),
    V('b','truck',C.orange,R.northSouth,.04,4.1),
    V('c','suv',C.blue,R.eastNorth,.04,5.0),
    V('d','race',C.lime,R.southWest,.04,6.2),
    V('e','van',C.white,R.westNorth,.20,4.5),
    V('f','taxi',C.yellow,R.eastWest,.20,5.0)
  ]},
  {name:'Sanayi T Kavşağı',theme:'industrial',layout:'tWest',vehicles:[
    V('a','fire',C.red,R.westNorth,.04,5.6),
    V('b','flatbed',C.orange,R.northWest,.04,4.0),
    V('c','tractor',C.green,R.southWest,.04,3.6),
    V('d','ambulance',C.white,R.westSouth,.20,5.9),
    V('e','luxury',C.purple,R.northSouth,.20,5.0),
    V('f','hatch',C.cyan,R.southNorth,.20,5.3)
  ]},
  {name:'Sahil Şeridi',theme:'seaside',layout:'straightNS',vehicles:[
    V('a','future',C.cyan,R.northSouth,.04,6.25),
    V('b','taxi',C.yellow,R.southNorth,.04,5.0),
    V('c','delivery',C.orange,R.northSouth,.20,4.35),
    V('d','sports',C.pink,R.southNorth,.20,6.0)
  ]},
  {name:'Terminal Bağlantısı',theme:'terminal',layout:'tEast',vehicles:[
    V('a','truck',C.blue,R.eastSouth,.04,4.0),
    V('b','police',C.white,R.eastNorth,.20,6.1),
    V('c','race',C.lime,R.northEast,.04,6.2),
    V('d','van',C.white,R.southEast,.04,4.45),
    V('e','taxi',C.yellow,R.northSouth,.20,5.0)
  ]},
  {name:'Acil Koridor',theme:'hospital',layout:'crossWide',vehicles:[
    V('a','ambulance',C.white,R.northSouth,.03,6.0),
    V('b','police',C.white,R.eastWest,.03,6.2),
    V('c','fire',C.red,R.westEast,.03,5.6),
    V('d','delivery',C.orange,R.northSouth,.19,4.35),
    V('e','suv',C.blue,R.eastNorth,.18,5.0),
    V('f','race',C.pink,R.southWest,.03,6.25),
    V('g','flatbed',C.silver,R.westNorth,.18,4.0),
    V('h','taxi',C.yellow,R.eastSouth,.33,5.0),
    V('i','luxury',C.purple,R.southNorth,.19,5.0)
  ]},
  {name:'Usta Trafik',theme:'plaza',layout:'cross',vehicles:[
    V('a','police',C.white,R.westEast,.03,6.2),
    V('b','sedan',C.red,R.westEast,.19,5.3),
    V('c','ambulance',C.white,R.northSouth,.03,6.0),
    V('d','delivery',C.orange,R.northSouth,.19,4.35),
    V('e','fire',C.red,R.eastWest,.03,5.6),
    V('f','future',C.cyan,R.southWest,.03,6.3),
    V('g','race',C.lime,R.westNorth,.35,6.25),
    V('h','luxury',C.purple,R.eastSouth,.19,5.0),
    V('i','truck',C.orange,R.southNorth,.19,4.0),
    V('j','taxi',C.yellow,R.northEast,.35,5.0),
    V('k','suv',C.blue,R.eastNorth,.35,5.0)
  ]}
];
